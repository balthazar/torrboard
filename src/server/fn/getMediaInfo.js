const got = require('got')
const uniq = require('lodash/uniq')

const MediaInfo = require('../models/MediaInfo')
const tmdb = require('./tmdb')
const logErr = require('./logErr')
const { tokenize, fuzzyScore, titleScore, parseYear, isConfident } = require('./titleMatch')

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

// Pick the best OMDB search result for `title`. Ranking, in order:
//   1. Title relevance (titleScore). An exact normalized match scores 1 and
//      beats everything. OMDB's search is a substring match, so "Black Box"
//      also returns "Black Box Diaries" and a short title returns every
//      "The <title> of <something>" — a mere namesake must never win over
//      the title we actually asked for, and a closer near-miss beats a
//      looser one.
//   2. Among ties, if we know the release year prefer the closest to it,
//      otherwise the newest (avoids the "namesake from 1958" problem when
//      several exact-title works share a name).
// Drops "episode"/"game" types the way the old code did.
const pickSearchMatch = (results, title, year) => {
  const typed = results.filter(r => r.Type === 'movie' || r.Type === 'series')
  const pool = typed.length ? typed : results
  if (!pool.length) return null

  return pool
    .map(r => ({ r, score: titleScore(title, r.Title), _y: parseYear(r.Year) }))
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score
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
// OMDB's t= is itself fuzzy and will happily return a different work that
// shares a word and the year, so each answer is checked with isConfident. The
// first confident one wins; otherwise the first answer is handed back flagged
// as unconfident so the caller can weigh it against TMDB's best guess.
// Returns { body, confident } or null.
const resolveByTitle = async (title, year) => {
  let fallback = null
  const consider = body => {
    if (!body) return false
    if (isConfident(title, year, body.Title, body.Year)) return true
    if (!fallback) fallback = body
    return false
  }
  const fetchExact = async params => {
    const res = await omdb(params)
    return res.body.Response === 'True' ? res.body : null
  }

  const steps = [
    ...(year
      ? [
          () => fetchExact({ t: title, y: year }),
          () => searchAndFetch({ s: title, y: year }, title, year),
        ]
      : []),
    () => searchAndFetch({ s: title }, title, year),
    () => fetchExact({ t: title }),
  ]

  for (const step of steps) {
    const body = await step()
    if (consider(body)) return { body, confident: true }
  }

  return fallback ? { body: fallback, confident: false } : null
}

// Layer the OMDB record for a TMDB match on top of TMDB's payload, so the
// stored rating and genres stay IMDb's like every other MediaInfo. TMDB's
// year is kept when OMDB's disagrees by more than one: OMDB lags on recent
// releases, and TMDB's year is the one that just matched the torrent.
// Without an OMDB record, TMDB's payload stands on its own.
const withOmdbDetails = async t => {
  const res = await omdb({ i: t.imdbID })
  if (res.body.Response !== 'True') return t.payload
  const merged = { ...t.payload, ...payloadFromOmdb(res.body) }
  const tmdbYear = parseYear(t.payload.year)
  if (tmdbYear && Math.abs(parseYear(merged.year) - tmdbYear) > 1) merged.year = t.payload.year
  return merged
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
      // TMDB searches first: it ranks by popularity and its data is fresher,
      // where OMDB's fuzzy t= and popularity-blind s= are prone to namesakes.
      // A confident TMDB hit is then enriched from OMDB by imdbID.
      let tmdbFallback = null
      if (tmdb.hasKey()) {
        for (const candidate of candidateTitles) {
          const t = await tmdb.searchByTitle(candidate, year)
          if (!t) continue
          if (isConfident(candidate, year, t.payload.title, t.payload.year)) {
            imdbID = t.imdbID
            payload = await withOmdbDetails(t)
            break
          }
          if (!tmdbFallback) tmdbFallback = t
        }
      }
      // No key, or TMDB had nothing confident: resolve through OMDB's own
      // search, holding back an unconfident hit the same way.
      let omdbFallback = null
      if (!imdbID) {
        for (const candidate of candidateTitles) {
          const found = await resolveByTitle(candidate, year)
          if (!found) continue
          if (found.confident) {
            imdbID = found.body.imdbID
            payload = payloadFromOmdb(found.body)
            break
          }
          if (!omdbFallback) omdbFallback = found.body
        }
      }
      // Neither source was confident: settle for whichever title is closer,
      // OMDB on a tie since that is what this path always used to return.
      const fallbackScore = t => Math.max(...candidateTitles.map(c => titleScore(c, t)))
      const preferTmdb =
        tmdbFallback &&
        (!omdbFallback ||
          fallbackScore(tmdbFallback.payload.title) > fallbackScore(omdbFallback.Title))
      if (!imdbID && omdbFallback && !preferTmdb) {
        imdbID = omdbFallback.imdbID
        payload = payloadFromOmdb(omdbFallback)
      } else if (!imdbID && tmdbFallback) {
        imdbID = tmdbFallback.imdbID
        payload = await withOmdbDetails(tmdbFallback)
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
