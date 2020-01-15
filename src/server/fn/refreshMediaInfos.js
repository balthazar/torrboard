const ptn = require('parse-torrent-name')

const { getDeluge } = require('./deluge')
const Config = require('../models/Config')
const getMediaInfo = require('./getMediaInfo')

module.exports = async () => {
  const { torrents } = await getDeluge()
  const { fetchedMedias } = await Config.findOne()

  const mediasToFetch = torrents.reduce((acc, torrent) => {
    const meta = ptn(torrent.name)
    const title = meta.title
      .replace(/S?[0-9]+.*$/, '')
      .replace(/ \[$/, '')
      .replace(/COMPLETE/i, '')
      .replace(/season/i, '')
      .replace(/ {2}rs$/, '')
      .replace(/\./g, '-')
      .trim()

    if (!title || fetchedMedias[torrent.id]) {
      return acc
    }

    if (!acc[torrent.id]) {
      acc[torrent.id] = { title, year: meta.year }
    }

    return acc
  }, {})

  await Promise.all(Object.keys(mediasToFetch).map(id => getMediaInfo(id, mediasToFetch[id])))

  await Config.updateOne(
    {},
    {
      $set: Object.keys(mediasToFetch).reduce((acc, key) => {
        acc[`fetchedMedias.${key}`] = true
        return acc
      }, {}),
    },
  )
}
