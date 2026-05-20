// TMDB (themoviedb.org) helpers. Used as a fallback when OMDB has no entry
// for a title (anime, foreign films, recent releases) or when OMDB's poster
// URL has been rotated off Amazon's CDN.
//
// Returns a payload shaped like payloadFromOmdb so callers can swap sources
// without caring which API answered. No-op (returns null) if process.env.TMDB
// is unset, so the rest of the app keeps working without a key configured.

const got = require('got')

const logErr = require('./logErr')

const TMDB = 'https://api.themoviedb.org/3'
const IMG = 'https://image.tmdb.org/t/p/w500'

const tmdbKey = () => process.env.TMDB || null

// TMDB returns genre_ids; map to the lowercase strings the UI filters on.
// Both movie and TV genre lists are flattened here; collisions are
// intentional (10759 "Action & Adventure" -> "action").
const GENRES = {
  28: 'action',
  12: 'adventure',
  16: 'animation',
  35: 'comedy',
  80: 'crime',
  99: 'documentary',
  18: 'drama',
  10751: 'family',
  14: 'fantasy',
  36: 'history',
  27: 'horror',
  10402: 'music',
  9648: 'mystery',
  10749: 'romance',
  878: 'sci-fi',
  10770: 'tv-movie',
  53: 'thriller',
  10752: 'war',
  37: 'western',
  10759: 'action',
  10762: 'kids',
  10763: 'news',
  10764: 'reality-tv',
  10765: 'sci-fi',
  10766: 'soap',
  10767: 'talk',
  10768: 'war',
}

const call = async (path, params = {}) => {
  const key = tmdbKey()
  if (!key) return null
  try {
    const qs = new URLSearchParams({ ...params, api_key: key })
    const res = await got(`${TMDB}${path}?${qs}`, { json: true, timeout: 10000 })
    return res.body
  } catch (err) {
    logErr('tmdb', err)
    return null
  }
}

const tagsFromIds = (ids = []) => {
  const out = new Set()
  for (const id of ids) if (GENRES[id]) out.add(GENRES[id])
  return [...out]
}

const buildPayload = ({ type, title, plot, image, year, rating, genreIds }) => {
  const p = { type }
  if (title) p.title = title
  if (plot) p.plot = plot
  if (image) p.image = image
  if (year) p.year = year
  if (rating != null && !isNaN(rating)) p.rating = Number(rating)
  const tags = tagsFromIds(genreIds)
  if (tags.length) p.tags = tags
  return p
}

const fromMovie = m => ({
  type: 'movie',
  title: m.title || m.original_title,
  plot: m.overview,
  image: m.poster_path ? `${IMG}${m.poster_path}` : null,
  year: (m.release_date || '').slice(0, 4),
  rating: m.vote_average,
  genreIds: m.genre_ids || (m.genres || []).map(g => g.id),
})

const fromTv = t => ({
  type: 'series',
  title: t.name || t.original_name,
  plot: t.overview,
  image: t.poster_path ? `${IMG}${t.poster_path}` : null,
  year: (t.first_air_date || '').slice(0, 4),
  rating: t.vote_average,
  genreIds: t.genre_ids || (t.genres || []).map(g => g.id),
})

// Search TMDB by title; on a hit, follow the result to its external imdb_id
// so the rest of the pipeline can use imdbID as the canonical key. Prefers
// matches whose year is closest to the parsed torrent year.
const searchByTitle = async (title, year) => {
  if (!title) return null
  const body = await call('/search/multi', { query: title, include_adult: 'false' })
  if (!body || !Array.isArray(body.results)) return null

  const candidates = body.results.filter(r => r.media_type === 'movie' || r.media_type === 'tv')
  if (!candidates.length) return null

  // Score: lower is better. Distance from target year, then prefer higher popularity.
  const target = year ? parseInt(year, 10) : null
  candidates.sort((a, b) => {
    const ay = parseInt(((a.release_date || a.first_air_date || '')).slice(0, 4), 10) || 0
    const by = parseInt(((b.release_date || b.first_air_date || '')).slice(0, 4), 10) || 0
    if (target) {
      const ad = Math.abs(ay - target)
      const bd = Math.abs(by - target)
      if (ad !== bd) return ad - bd
    } else if (ay !== by) {
      return by - ay
    }
    return (b.popularity || 0) - (a.popularity || 0)
  })

  const pick = candidates[0]
  const ext = await call(`/${pick.media_type}/${pick.id}/external_ids`)
  if (!ext || !ext.imdb_id) return null

  const base = pick.media_type === 'movie' ? fromMovie(pick) : fromTv(pick)
  return { imdbID: ext.imdb_id, payload: buildPayload(base) }
}

// Find by imdbID. Used by healPosters when OMDB has gone stale: we know the
// imdbID is right, we just need a fresh poster URL from a different CDN.
const findByImdb = async imdbID => {
  if (!imdbID) return null
  const body = await call(`/find/${imdbID}`, { external_source: 'imdb_id' })
  if (!body) return null

  const movie = (body.movie_results || [])[0]
  const tv = (body.tv_results || [])[0]
  const pick = movie ? { ...fromMovie(movie) } : tv ? { ...fromTv(tv) } : null
  if (!pick) return null
  return { imdbID, payload: buildPayload(pick) }
}

module.exports = { searchByTitle, findByImdb, hasKey: () => !!tmdbKey() }
