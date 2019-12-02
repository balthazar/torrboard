const Config = require('../models/Config')
const getRSS = require('./getRSS')
const { getDeluge } = require('./deluge')

module.exports = async () => {
  const { autoGrabs } = await Config.findOne()
  const rss = await getRSS()
  const torrents = await getDeluge()

  console.log('autograbs')

  const relevants = []

  rss.forEach(torrent => {
    const { meta } = torrent
    if (autoGrabs.includes(meta.title) && meta.resolution === '1080p') {
      relevants.push(torrent)
    }
  })

  console.log(relevants)
}
