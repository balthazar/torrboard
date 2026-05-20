const util = require('util')
const exec = util.promisify(require('child_process').exec)
const got = require('got')
const uniq = require('lodash/uniq')
const gql = require('graphql-tag')
const cache = require('memory-cache')

const Config = require('./models/Config')
const User = require('./models/User')

const logErr = require('./fn/logErr')
const { download, uploadTorrent, torrentAction, getDeluge } = require('./fn/deluge')
const rss = require('./fn/getRSS')
const getMPVprops = require('./fn/getMPVprops')
const timeFromSeconds = require('./fn/timeFromSeconds')
const getMediaInfo = require('./fn/getMediaInfo')
const auth = require('./api/auth')

const typeDefs = gql`
  directive @auth on FIELD | FIELD_DEFINITION
  directive @hasRole(role: String) on FIELD | FIELD_DEFINITION

  type MediaInfo {
    imdbID: ID
    title: String
    tags: [String]
    plot: String
    image: String
    type: String
    year: String
    rating: Float
  }

  type Config {
    autoGrabs: [String]
  }

  type DelugeStats {
    upSpeed: Float
    dlSpeed: Float
    freeSpace: Float
  }

  type MetaInfo {
    title: String
    resolution: String
    episode: Int
    season: Int
    year: String
  }

  type DelugeTorrent {
    id: String
    name: String
    total_done: Float
    ratio: Float
    total_size: Float
    state: String
    eta: Float
    progress: Float
    upload_payload_rate: Float
    download_payload_rate: Float
    time_added: Float
    total_uploaded: Float

    total_seeds: Int
    total_peers: Int
    num_seeds: Int
    num_peers: Int

    videos: [String]
    rar: String
    mediaInfo: MediaInfo
    meta: MetaInfo
  }

  type Deluge {
    stats: DelugeStats
    torrents: [DelugeTorrent]
  }

  type TorrentMeta {
    title: String
    year: String
    episode: Int
    season: Int
    resolution: String
  }

  type RssItem {
    title: String
    category: String
    link: String
    date: String

    leechers: Int
    seeders: Int
    isSerie: Boolean
    meta: TorrentMeta
  }

  type IPItem {
    value: String
    lastSeen: String
  }

  type User {
    name: String
    email: String
    expires: String
    inviteCode: String
    ips: [IPItem]
    watched: [String]
    lastWatchedAt: String
    lastSeenAt: String
  }

  type Playback {
    title: String
    image: String
    playing: Boolean
    pos: String
    duration: String
  }

  type Mutation {
    login(name: String, password: String!): String!
    setPassword(inviteCode: String!, password: String!): String!

    setWatched(path: String, value: Boolean): [String] @auth

    createUser(name: String!, email: String!, expires: String!): Boolean @hasRole(role: "master")
    deleteUser(name: String!): Boolean @hasRole(role: "master")
    setAutoGrabs(autoGrabs: [String]): [String] @hasRole(role: "master")
    setImdb(oldId: String, torrentIds: [String], newId: String!): Boolean @hasRole(role: "master")
    download(link: String!): Boolean @hasRole(role: "master")
    uploadTorrent(filename: String!, filedump: String!): Boolean @hasRole(role: "master")
    torrentAction(name: String!, torrentId: String!, removeFiles: Boolean): Boolean
      @hasRole(role: "master")

    cast(title: String!, url: String!, image: String): Boolean @hasRole(role: "master")
    castAction(name: String!): Boolean @hasRole(role: "master")
  }

  type Query {
    deluge: Deluge @auth
    watched: [String] @auth
    getYtID(query: String!): String @auth
    playback: Playback @auth

    users: [User] @hasRole(role: "master")
    config: Config @hasRole(role: "master")
    rss: [RssItem] @hasRole(role: "master")
  }
`

const castActions = {
  play: 'keypress space',
  pause: 'keypress space',
  seekbackward: 'seek -15',
  seekforward: 'seek 15',
  nexttrack: 'keypress Q',
}

const currentPlayback = {}

const resolvers = {
  Query: {
    deluge: getDeluge,
    playback: async (parent, params, { user }) => {
      if (user.name !== 'master' || !currentPlayback.title) {
        return null
      }

      const res = await getMPVprops(['duration', 'playback-time', 'core-idle'])

      if (!res) {
        const fails = cache.get('mpv-fails') || 0
        if (fails >= 5) {
          currentPlayback.title = null
          cache.put('mpv-fails', 0)
          return null
        }

        cache.put('mpv-fails', fails + 1)
        return null
      }

      cache.put('mpv-fails', 0)

      const [duration, pos, idle] = res

      return {
        ...currentPlayback,
        playing: !idle,
        pos: timeFromSeconds(pos),
        duration: timeFromSeconds(duration),
      }
    },
    watched: async (parent, params, { user }) => {
      const { name } = user
      const u = await User.findOne({ name })
      if (!u) {
        return []
      }

      return u.watched
    },

    rss,
    users: () => User.find(),
    getYtID: async (parent, { query }) => {
      // YouTube Data API search costs 100 quota units per call and the
      // default project quota is 10k/day. Same title resolves to the same
      // trailer indefinitely, so cache aggressively. Negative results are
      // cached too (1h) so a quota-exhausted day doesn't keep hammering.
      const cacheKey = `yt:${query.toLowerCase().trim()}`
      const hit = cache.get(cacheKey)
      if (hit !== null) return hit

      try {
        const params = new URLSearchParams({
          q: `${query} trailer`,
          part: 'id',
          type: 'video',
          videoEmbeddable: 'true',
          videoSyndicated: 'true',
          maxResults: '5',
          key: process.env.YOUTUBE,
        })
        const res = await got(`https://www.googleapis.com/youtube/v3/search?${params}`, {
          responseType: 'json',
        })

        const first = (res.body.items || []).find(i => i.id && i.id.videoId)
        const id = first ? first.id.videoId : ''
        cache.put(cacheKey, id, id ? 30 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000)
        return id
      } catch (err) {
        logErr('getYtID', err)
        cache.put(cacheKey, '', 60 * 60 * 1000)
        return ''
      }
    },
    config: async () => {
      const config = await Config.findOne({})
      return config || { autoGrabs: [], fetchedMedias: {} }
    },
  },

  Mutation: {
    cast: async (parent, { title, image, url }) => {
      currentPlayback.title = title
      currentPlayback.image = image

      await exec(`ssh me@${process.env.SSH_IP} "omxplayer --no-keys ${url} &"`)
    },
    castAction: async (parent, { name }) => {
      if (name === 'nexttrack') {
        currentPlayback.title = null
      }

      // await exec(`echo '${castActions[name]}' | socat - /tmp/mpvsocket`)
    },
    torrentAction,
    download,
    uploadTorrent,

    setAutoGrabs: async (parent, { autoGrabs = [] }) => {
      await Config.updateOne(
        {},
        {
          $set: { autoGrabs },
        },
        { upsert: true },
      )

      return autoGrabs
    },

    setImdb: async (parent, { oldId, torrentIds, newId }) => {
      const res = await getMediaInfo(null, { oldId, torrentIds, newId })
      return !!(res && res.ok)
    },

    setWatched: async (parent, { path, value }, { user }) => {
      const { name } = user
      const u = await User.findOne({ name })
      if (!u) {
        return null
      }

      const watched = uniq(value ? [...u.watched, path] : u.watched.filter(w => w !== path))

      u.watched = watched
      if (value) {
        u.lastWatchedAt = new Date()
      }
      await u.save()

      return watched
    },

    deleteUser: async (parent, { name }) => {
      if (name === 'master') return false
      await User.deleteOne({ name })
      cache.del('users')
      return true
    },

    // Auth
    createUser: auth.createUser,
    login: auth.login,
    setPassword: auth.setPassword,
  },
}

module.exports = {
  typeDefs,
  resolvers,
  context: auth.context,
}
