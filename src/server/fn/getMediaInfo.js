const got = require('got')
const uniq = require('lodash/uniq')

const MediaInfo = require('../models/MediaInfo')
const tmdb = require('./tmdb')
const logErr = require('./logErr')

const OMDB = 'http://www.omdbapi.com'

const omdb = params =>
  got(`${OMDB}/?${new URLSearchParams({ ...params, apiKey: process.env.OMDB })}`, { json: true })

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
// match on exact equality or a shared prefix of length >= 3 (handles
// US/USA, journeys/journey, etc).
const fuzzyScore = (input, target) => {
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

// Returns true if a MediaInfo record was created/updated, false otherwise.
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
          return true
        }
      }
      return false
    }

    if (newId) {
      const others = await MediaInfo.findOne({ imdbID: newId })
      const torrents = uniq([...(others ? others.torrents : []), ...torrentIds])

      await MediaInfo.remove({ imdbID: newId })

      if (oldId) {
        await MediaInfo.updateOne(
          { imdbID: oldId },
          {
            ...payload,
            torrents,
            imdbID: newId,
          },
        )
      } else {
        await MediaInfo.create({
          ...payload,
          imdbID: newId,
          torrents,
        })
      }

      return true
    }

    // Refuse to silently move a torrent already linked to a different imdbID.
    // OMDB's search ranks newest first, so re-resolving an old series can
    // pull it under a newer same-prefix movie (e.g. REDACTED -> REDACTED
    // in the Boat). Manual moves should go through the setImdb mutation.
    const existing = await MediaInfo.findOne({ torrents: id, imdbID: { $ne: imdbID } })
    if (existing) {
      return true
    }

    await MediaInfo.updateOne(
      { imdbID },
      {
        $set: { ...payload, imdbID },
        $addToSet: { torrents: id },
      },
      { upsert: true },
    )

    return true
  } catch (err) {
    logErr('getMediaInfo', err)
    return false
  }
}
