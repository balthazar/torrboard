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

// Normalize a title for equality: lowercase, punctuation/spacing collapsed.
// So "Rick and Morty" == "rick.and.morty" but != "Rick and Morty: The Anime".
const normTitle = s =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

// Pick the best OMDB search result for `title`. Ranking, in order:
//   1. An exact (normalized) title match beats everything. OMDB's search is a
//      prefix/substring match, so "Black Box" also returns "Black Box Diaries"
//      and "Rick and Morty" also returns "Rick and Morty: The Anime" — a mere
//      namesake must never win over the title we actually asked for.
//   2. Among ties, if we know the release year prefer the closest to it,
//      otherwise the newest (avoids the "namesake from 1958" problem when
//      several exact-title works share a name).
// Drops "episode"/"game" types the way the old code did.
const pickSearchMatch = (results, title, year) => {
  const typed = results.filter(r => r.Type === 'movie' || r.Type === 'series')
  const pool = typed.length ? typed : results
  if (!pool.length) return null

  const q = normTitle(title)
  return pool
    .map(r => ({
      r,
      exact: normTitle(r.Title) === q ? 1 : 0,
      _y: parseInt(String(r.Year).match(/\d{4}/), 10) || 0,
    }))
    .sort((a, b) => {
      if (a.exact !== b.exact) return b.exact - a.exact
      if (year) return Math.abs(a._y - year) - Math.abs(b._y - year)
      return b._y - a._y
    })[0].r
}

// Run an OMDB `s=` search with the given params, pick the best hit for
// `title`/`year` via pickSearchMatch, and fetch its full record by imdbID.
// Returns null when the search is empty or nothing survives ranking.
const searchAndFetch = async (params, title, year) => {
  const search = await omdb(params)
  if (search.body.Response !== 'True' || !search.body.Search) return null
  const pick = pickSearchMatch(search.body.Search, title, year)
  if (!pick) return null
  const full = await omdb({ i: pick.imdbID })
  return full.body.Response === 'True' ? full.body : null
}

// Resolve a title (+ optional year) to a single OMDB record.
// Strategy: exhaust the year-qualified lookups first (most precise), then fall
// back to title-only. When a year is known:
//   1. exact title + year        (t=title&y=year)
//   2. year-scoped search        (s=title&y=year) — catches title variants
//      (subtitles, punctuation) that t= misses but the year makes unambiguous,
//      and reaches records buried past page 1 of the unscoped search.
// Then title-only, so a release with a wrong/unindexed year still resolves:
//   3. title-only search         (s=title, ranked by pickSearchMatch)
//   4. exact title, no year      (t=title)
const resolveByTitle = async (title, year) => {
  if (year) {
    const exact = await omdb({ t: title, y: year })
    if (exact.body.Response === 'True') return exact.body

    const scoped = await searchAndFetch({ s: title, y: year }, title, year)
    if (scoped) return scoped
  }

  const searched = await searchAndFetch({ s: title }, title, year)
  if (searched) return searched

  const res = await omdb({ t: title })
  return res.body.Response === 'True' ? res.body : null
}

// Returns { ok: true } when a MediaInfo record was created/updated.
// Returns { ok: false, transient: true } when an OMDB/TMDB/db call threw
// (rate limit, network blip, mongo error), so the caller can retry without
// counting it against MAX_ATTEMPTS. Returns { ok: false, transient: false }
// for a clean "no match" outcome that should count.
// quotaExhausted is set when OMDB returns 401/429, signalling the daily
// quota is gone and the caller should back off across ticks, not just retry.
module.exports = async (id, { torrentIds, oldId, newId, title, titles, year }) => {
  try {
    let imdbID
    let payload

    // A torrent name can yield more than one title to try (foreign releases
    // tagged "<original> a.k.a. <english>"). Accept an explicit candidate
    // list, or fall back to the single `title` for older callers.
    const candidateTitles = (titles && titles.length ? titles : [title]).filter(Boolean)

    if (newId) {
      // Manual override path: OMDB/TMDB failures here must not abort the
      // write. got throws on 401/5xx (bad key, quota, transient outage),
      // which previously sent us into the outer catch and silently dropped
      // the user's choice. Localize the OMDB error so we can still try
      // TMDB and fall back to a bare write.
      try {
        const res = await omdb({ i: newId })
        if (res.body.Response === 'True') {
          imdbID = res.body.imdbID
          payload = payloadFromOmdb(res.body)
        }
      } catch (err) {
        logErr('getMediaInfo:omdb-newId', err)
      }
      if (!imdbID && tmdb.hasKey()) {
        const t = await tmdb.findByImdb(newId)
        if (t) {
          imdbID = t.imdbID
          payload = t.payload
        }
      }
      if (!imdbID) {
        imdbID = newId
        payload = {}
      }
    } else {
      // Try each candidate title in turn; first OMDB hit wins.
      for (const candidate of candidateTitles) {
        const omdbBody = await resolveByTitle(candidate, year)
        if (omdbBody) {
          imdbID = omdbBody.imdbID
          payload = payloadFromOmdb(omdbBody)
          break
        }
      }
      if (!imdbID && tmdb.hasKey()) {
        for (const candidate of candidateTitles) {
          const t = await tmdb.searchByTitle(candidate, year)
          if (t) {
            imdbID = t.imdbID
            payload = t.payload
            break
          }
        }
      }
    }

    if (!imdbID || !payload) {
      if (!newId) {
        let local = null
        for (const candidate of candidateTitles) {
          local = await resolveByLocalTitle(candidate)
          if (local) break
        }
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

// Exported for unit testing the search-result ranking in isolation.
module.exports.pickSearchMatch = pickSearchMatch
