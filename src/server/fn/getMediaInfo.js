const got = require('got')
const uniq = require('lodash/uniq')

const MediaInfo = require('../models/MediaInfo')
const tmdb = require('./tmdb')
const logErr = require('./logErr')

const OMDB = 'http://www.omdbapi.com'

const omdb = params =>
  got(`${OMDB}/?${new URLSearchParams({ ...params, apiKey: process.env.OMDB })}`, {
    responseType: 'json',
  })

// Build the payload we want to persist from an OMDB record. Returns only
// the fields that came back with real values, so callers can safely $set
// without nuking previously-good data when OMDB downgrades to "N/A".
const payloadFromOmdb = body => {
  const { Title, Genre, Type, Plot, Poster, Year, imdbRating } = body
  const out = { type: Type }

  if (Title && Title !== 'N/A') out.title = Title
  if (Plot && Plot !== 'N/A') out.plot = Plot
  if (Genre && Genre !== 'N/A') out.tags = Genre.split(', ').map(g => g.toLowerCase())
  if (Poster && Poster !== 'N/A') out.image = Poster
  if (Year && Year !== 'N/A') out.year = Year
  if (imdbRating && !isNaN(imdbRating)) out.rating = Number(imdbRating)

  return out
}

const tokenize = s =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

// Fraction of `input` tokens that line up with `target`. A token counts as a
// match on exact equality or a shared prefix of length >= 2 (handles
// US/USA, journeys/journey, etc).
const directionalScore = (input, target) => {
  if (!input.length) return 0
  let hits = 0
  for (const it of input) {
    const matched = target.some(tt => {
      if (it === tt) return true
      if (it.length >= 2 && tt.length >= 2 && (tt.startsWith(it) || it.startsWith(tt))) {
        return true
      }
      return false
    })
    if (matched) hits++
  }
  return hits / input.length
}

// F1-style symmetric score: precision (input tokens that hit target) and
// recall (target tokens that hit input), combined. Penalises candidates
// with extra unmatched tokens so a short title beats a longer one when the
// query is short, instead of tying on precision alone.
const fuzzyScore = (input, target) => {
  const precision = directionalScore(input, target)
  const recall = directionalScore(target, input)
  if (precision + recall === 0) return 0
  return (2 * precision * recall) / (precision + recall)
}

// Last-resort match: when OMDB returns nothing for a cleaned title, see if
// an existing MediaInfo's title is a close-enough fuzzy match (e.g. a new
// season torrent stripped of punctuation OMDB needs). Requires a clear
// single winner above the confidence threshold; ties bail out.
const resolveByLocalTitle = async title => {
  if (!title) return null
  const tokens = tokenize(title)
  if (tokens.length < 2) return null

  const candidates = await MediaInfo.find({}, { imdbID: 1, title: 1 }).lean()
  let best = null
  let bestScore = 0
  let tieAtBest = false

  for (const c of candidates) {
    if (!c.title || !c.imdbID) continue
    const score = fuzzyScore(tokens, tokenize(c.title))
    if (score > bestScore) {
      best = c
      bestScore = score
      tieAtBest = false
    } else if (score === bestScore && best && c.imdbID !== best.imdbID) {
      tieAtBest = true
    }
  }

  return bestScore >= 0.75 && !tieAtBest ? best : null
}

// Resolve a title (+ optional year) to a single OMDB record.
// When year is known, hit the title endpoint directly. Otherwise use the
// search endpoint, pick the newest plausible match by year, and fetch
// its full record by imdbID. Avoids the "namesake from 1958" problem.
const resolveByTitle = async (title, year) => {
  if (year) {
    const res = await omdb({ t: title, y: year })
    return res.body.Response === 'True' ? res.body : null
  }

  const search = await omdb({ s: title })
  if (search.body.Response !== 'True' || !search.body.Search) {
    // Fallback to the title endpoint with no year filter as a last resort.
    const res = await omdb({ t: title })
    return res.body.Response === 'True' ? res.body : null
  }

  const candidates = search.body.Search.filter(r => r.Type === 'movie' || r.Type === 'series')
  const pick = (candidates.length ? candidates : search.body.Search)
    .map(r => ({ ...r, _y: parseInt(String(r.Year).match(/\d{4}/), 10) || 0 }))
    .sort((a, b) => b._y - a._y)[0]

  if (!pick) {
    return null
  }

  const full = await omdb({ i: pick.imdbID })
  return full.body.Response === 'True' ? full.body : null
}

// Returns { ok: true } when a MediaInfo record was created/updated.
// Returns { ok: false, transient: true } when an OMDB/TMDB/db call threw
// (rate limit, network blip, mongo error), so the caller can retry without
// counting it against MAX_ATTEMPTS. Returns { ok: false, transient: false }
// for a clean "no match" outcome that should count.
// quotaExhausted is set when OMDB returns 401/429, signalling the daily
// quota is gone and the caller should back off across ticks, not just retry.
module.exports = async (id, { torrentIds, oldId, newId, title, year }) => {
  try {
    let imdbID
    let payload

    if (newId) {
      const res = await omdb({ i: newId })
      if (res.body.Response === 'True') {
        imdbID = res.body.imdbID
        payload = payloadFromOmdb(res.body)
      } else if (tmdb.hasKey()) {
        const t = await tmdb.findByImdb(newId)
        if (t) {
          imdbID = t.imdbID
          payload = t.payload
        }
      }
      // Manual override: when neither source has indexed this ID yet,
      // still persist the user's choice with no payload so the torrent
      // gets regrouped. healPosters/refreshMediaInfo will fill metadata
      // in once OMDB/TMDB catch up.
      if (!imdbID) {
        imdbID = newId
        payload = {}
      }
    } else {
      const omdbBody = await resolveByTitle(title, year)
      if (omdbBody) {
        imdbID = omdbBody.imdbID
        payload = payloadFromOmdb(omdbBody)
      } else if (tmdb.hasKey()) {
        const t = await tmdb.searchByTitle(title, year)
        if (t) {
          imdbID = t.imdbID
          payload = t.payload
        }
      }
    }

    if (!imdbID || !payload) {
      if (!newId) {
        const local = await resolveByLocalTitle(title)
        if (local) {
          const dupe = await MediaInfo.findOne({ torrents: id, imdbID: { $ne: local.imdbID } })
          if (!dupe) {
            await MediaInfo.updateOne(
              { imdbID: local.imdbID },
              { $addToSet: { torrents: id } },
            )
          }
          return { ok: true }
        }
      }
      return { ok: false, transient: false }
    }

    if (newId) {
      const others = await MediaInfo.findOne({ imdbID: newId })
      const torrents = uniq([...(others ? others.torrents : []), ...torrentIds])

      await MediaInfo.deleteMany({ imdbID: newId })

      let matched = false
      if (oldId) {
        const updated = await MediaInfo.updateOne(
          { imdbID: oldId },
          {
            ...payload,
            torrents,
            imdbID: newId,
          },
        )
        matched = updated.matchedCount > 0
      }
      // Fall through to create when there was no oldId, or when the client
      // sent a stale oldId that no longer exists. Either way the override
      // should land instead of silently no-op'ing.
      if (!matched) {
        await MediaInfo.create({
          ...payload,
          imdbID: newId,
          torrents,
        })
      }

      return { ok: true }
    }

    // Refuse to silently move a torrent already linked to a different imdbID.
    // OMDB's search ranks newest first, so re-resolving an older series can
    // pull it under a newer same-prefix title. Manual moves should go through
    // the setImdb mutation.
    const existing = await MediaInfo.findOne({ torrents: id, imdbID: { $ne: imdbID } })
    if (existing) {
      return { ok: true }
    }

    await MediaInfo.updateOne(
      { imdbID },
      {
        $set: { ...payload, imdbID },
        $addToSet: { torrents: id },
      },
      { upsert: true },
    )

    return { ok: true }
  } catch (err) {
    logErr('getMediaInfo', err)
    const host = err.options && err.options.url && err.options.url.host
    const status = err.response && err.response.statusCode
    const fromOmdb = host && host.includes('omdbapi.com')
    const quotaExhausted = fromOmdb && (status === 401 || status === 429)
    return { ok: false, transient: true, quotaExhausted }
  }
}
