const got = require('got')
const ptn = require('parse-torrent-name')
const uniq = require('lodash/uniq')

const MediaInfo = require('../models/MediaInfo')
const getFiles = require('./getFiles')

const { DOWNLOAD_DIR } = require('../../config')

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
    'total_seeds',
    'total_peers',
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
  download: async (parent, { link }) => {
    const path = await query('web.download_torrent_from_url', [link])
    return query('web.add_torrents', [
      [{ options: { download_location: `${DOWNLOAD_DIR}/dl` }, path }],
    ])
  },
  torrentAction: (parent, { name, torrentId, removeFiles }) => {
    if (name === 'remove') {
      return query(`core.remove_torrent`, [torrentId, removeFiles])
    }

    return query(`core.${name}_torrent`, [[torrentId]])
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
        const meta = ptn(data.torrents[id].name)
        const key = meta.title
          .toLowerCase()
          .replace(/\s\s+/g, ' ')
          .replace(/ /g, '.')
          .replace('trilogy', '')
          .replace(/.s[0-9]+.*/, '')

        const related = files.filter(f => {
          const fl = f.toLowerCase()
          return fl.includes(data.torrents[id].name.toLowerCase()) || fl.includes(key)
        })

        const rar = related.find(f => f.endsWith('.rar') && !f.match(/\.part[0-9]+\.rar/))

        const rawVideos = related.filter(f => !f.endsWith('.rar'))
        const videos =
          rawVideos.length > 1
            ? rawVideos.filter(path => {
                const pathMeta = ptn(path.split('/').pop())
                const pathTitle = pathMeta.title.toLowerCase().replace(/part.*$/, '')

                if (pathTitle.length > key.length + 3) {
                  return false
                }

                return true
              })
            : rawVideos

        return {
          id,
          ...data.torrents[id],
          rar,
          videos,
          meta,
          mediaInfo: byTorrentId[id],
        }
      })

      return {
        stats: {
          upSpeed: data.stats.upload_rate,
          dlSpeed: data.stats.download_rate,
          freeSpace: data.stats.free_space,
        },
        torrents,
      }
    }),
}
