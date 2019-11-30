const got = require('got')
const ptn = require('parse-torrent-name')

const MediaInfo = require('../models/MediaInfo')
const getFiles = require('./getFiles')

const fields = [
  [
    'name',
    'total_size',
    'state',
    'progress',
    'download_payload_rate',
    'upload_payload_rate',
    'eta',
    'ratio',
    'time_added',
    'total_done',
    'total_uploaded',
    'num_seeds',
    'num_peers',
  ],
  [],
]

const [DELUGE_PASS, DELUGE_HOST] = process.env.DELUGE.split('@')

const r = (body, headers = {}) => got.post(`${DELUGE_HOST}/json`, { body, json: true, headers })
const payload = (method, params) => ({ method, params, id: Date.now() })

const query = async (method, args) => {
  const pass = await r(payload('auth.login', [DELUGE_PASS]))
  if (!pass.body.result) {
    throw new Error('Unauthorized.')
  }

  const cookie = pass.headers['set-cookie']
  const res = await r(payload(method, args), { cookie })

  return res.body.result
}

module.exports = {
  download: async torrentUrl => {
    const path = await query('web.download_torrent_from_url', [torrentUrl])
    return query('web.add_torrents', [[{ options: { download_location: '/home/media/dl' }, path }]])
  },
  getDeluge: () =>
    query('web.update_ui', fields).then(async data => {
      const files = await getFiles()
      const medias = await MediaInfo.find({})

      const byTorrentId = medias.reduce((acc, media) => {
        media.torrents.forEach(torrentId => {
          acc[torrentId] = media
        })
        return acc
      }, {})

      const torrents = Object.keys(data.torrents).map(id => {
        const related = files.filter(f =>
          f.toLowerCase().includes(data.torrents[id].name.toLowerCase()),
        )
        const videos = related.filter(f => ['.mkv', '.avi', '.mp4'].some(ext => f.endsWith(ext)))
        const rar = related.find(f => f.endsWith('.rar'))

        return {
          id,
          ...data.torrents[id],
          rar,
          videos,
          meta: ptn(data.torrents[id].name),
          mediaInfo: byTorrentId[id],
        }
      })

      return {
        stats: {
          upSpeed: data.stats.upload_protocol_rate,
          dlSpeed: data.stats.download_protocol_rate,
          freeSpace: data.stats.free_space,
        },
        torrents,
      }
    }),
}
