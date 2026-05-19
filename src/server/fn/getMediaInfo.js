const got = require('got')
const uniq = require('lodash/uniq')

const MediaInfo = require('../models/MediaInfo')
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
    let body
    if (newId) {
      const res = await omdb({ i: newId })
      body = res.body.Response === 'True' ? res.body : null
    } else {
      body = await resolveByTitle(title, year)
    }

    if (!body) {
      return false
    }

    const payload = payloadFromOmdb(body)
    const imdbID = body.imdbID

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
