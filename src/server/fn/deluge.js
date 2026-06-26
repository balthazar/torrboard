const got = require('got')
const ptn = require('parse-torrent-name')

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

const [DELUGE_PASS, DELUGE_HOST_RAW] = process.env.DELUGE.split('@')
const DELUGE_HOST =
  process.env.NODE_ENV === 'production' ? DELUGE_HOST_RAW : 'http://127.0.0.1:8112'

const r = (body, headers = {}) =>
  got.post(`${DELUGE_HOST}/json`, { json: body, responseType: 'json', headers })
const payload = (method, params) => ({ method, params, id: Date.now() })

const query = async (method, args) => {
  const pass = await r(payload('auth.login', [DELUGE_PASS]))
  if (!pass.body.result) {
    throw new Error('Unauthorized.')
  }

  // Deluge's auth response sets a session cookie via Set-Cookie. Extract the
  // name=value pairs (drop Path/HttpOnly/etc attributes) so we can send them
  // back as a single Cookie header on the follow-up request.
  const setCookies = pass.headers['set-cookie'] || []
  const cookie = setCookies.map(c => c.split(';')[0]).join('; ')

  // The web server can be authenticated yet not connected to the deluged
  // daemon (after a daemon/pod restart, the web UI doesn't auto-reconnect).
  // In that state every method returns result:null and web.update_ui yields
  // torrents:null, which blows up Object.keys() downstream. Reconnect to the
  // first known host the way the real web UI does on load, so the route and
  // the scheduled jobs self-heal instead of throwing.
  const connected = await r(payload('web.connected', []), { cookie })
  if (!connected.body.result) {
    const hosts = await r(payload('web.get_hosts', []), { cookie })
    const [firstHost] = hosts.body.result || []
    if (firstHost) {
      await r(payload('web.connect', [firstHost[0]]), { cookie })
    }
  }

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
  uploadTorrent: async (parent, { filename, filedump }) => {
    const safeName = (filename || 'upload.torrent').replace(/[^A-Za-z0-9._-]/g, '_')
    return query('core.add_torrent_file', [
      safeName,
      filedump,
      { download_location: `${DOWNLOAD_DIR}/dl` },
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
      // If the web UI still couldn't reach the daemon, update_ui returns
      // torrents:null. Degrade to an empty list rather than crashing the whole
      // query (and the refreshMediaInfos/downloadRSS jobs that share this fn).
      if (!data || !data.torrents) {
        return { stats: {}, torrents: [] }
      }

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
        const videos = related.filter(f => !f.endsWith('.rar'))

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
