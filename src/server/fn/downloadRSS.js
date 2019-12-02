const ptn = require('parse-torrent-name')

const Config = require('../models/Config')
const getRSS = require('./getRSS')
const { getDeluge, download } = require('./deluge')

module.exports = async () => {
  const config = await Config.findOne({})
  const rss = await getRSS()
  const { torrents } = await getDeluge()

  const autoGrabs = config.autoGrabs.reduce(
    (acc, cur) => ((acc[cur.toLowerCase()] = true), acc),
    {},
  )

  const torrentKeys = torrents.reduce((acc, tor) => {
    const meta = ptn(tor.name.replace(/\.\.+/g, '.'))
    acc[`${meta.title}-${meta.season}-${meta.episode}`] = true
    return acc
  }, {})

  const relevants = {}

  rss.forEach(torrent => {
    const { meta } = torrent
    const key = meta.title.toLowerCase()
    if (autoGrabs[key] && meta.resolution === '1080p') {
      // Only add if there is none or older
      if (!relevants[key] || new Date(torrent.date) < new Date(relevants[key].date)) {
        relevants[key] = torrent
      }
    }
  })

  Object.keys(relevants).forEach(key => {
    const torrent = relevants[key]
    const meta = ptn(torrent.title.replace(/\s\s+/g, ' ').replace(/ /g, '.'))
    if (torrentKeys[`${meta.title}-${meta.season}-${meta.episode}`]) {
      return
    }

    download({ link: torrent.link })
  })
}
