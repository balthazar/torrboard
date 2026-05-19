const ptn = require('parse-torrent-name')

const { getDeluge } = require('./deluge')
const Config = require('../models/Config')
const getMediaInfo = require('./getMediaInfo')

const cleanTitle = raw =>
  raw
    // Drop SxxExx / Sxx / "Season N" / "Part N" and anything after.
    .replace(/\b(S\d{1,2}(E\d+)?|Season\s*\d+|Part\s*\d+)\b.*$/i, '')
    // Drop a release-year tail (1900-2099) and anything after.
    .replace(/\b(19|20)\d{2}\b.*$/, '')
    // Drop boilerplate tokens.
    .replace(/\b(COMPLETE|REPACK|PROPER|EXTENDED|REMUX|UNCUT)\b/gi, '')
    .replace(/\bseason\b/gi, '')
    // Normalize separators.
    .replace(/[._]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/ \[$/, '')
    .trim()

module.exports = async () => {
  const { torrents } = await getDeluge()
  const { fetchedMedias } = await Config.findOne()

  const mediasToFetch = torrents.reduce((acc, torrent) => {
    const meta = ptn(torrent.name)
    if (!meta.title) {
      return acc
    }

    const title = cleanTitle(meta.title)
    if (!title || fetchedMedias[torrent.id]) {
      return acc
    }

    if (!acc[torrent.id]) {
      acc[torrent.id] = { title, year: meta.year }
    }

    return acc
  }, {})

  const ids = Object.keys(mediasToFetch)
  const results = await Promise.all(ids.map(id => getMediaInfo(id, mediasToFetch[id])))

  // Only mark torrents as fetched when OMDB actually resolved them. Failures
  // (no match, rate limit, network) stay pending so the next tick retries.
  const succeeded = ids.filter((_, i) => results[i])
  if (succeeded.length) {
    await Config.updateOne(
      {},
      {
        $set: succeeded.reduce((acc, key) => {
          acc[`fetchedMedias.${key}`] = true
          return acc
        }, {}),
      },
    )
  }
}
