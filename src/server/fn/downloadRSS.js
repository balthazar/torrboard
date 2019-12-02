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

  const torrentNames = torrents.reduce((acc, tor) => ((acc[tor.name] = true), acc), {})

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
    if (torrentNames[torrent.title.replace(/ /g, '.')]) {
      return
    }

    download({ link: torrent.link })
  })
}
