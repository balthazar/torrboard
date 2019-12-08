const got = require('got')
const uniq = require('lodash/uniq')
const { makeExecutableSchema } = require('graphql-tools')
const gql = require('graphql-tag')

const Config = require('./models/Config')
const User = require('./models/User')

const { download, torrentAction, getDeluge } = require('./fn/deluge')
const rss = require('./fn/getRSS')
const auth = require('./api/auth')
const schemaDirectives = require('./directives')

const typeDefs = gql`
  directive @auth on FIELD | FIELD_DEFINITION
  directive @hasRole(role: String) on FIELD | FIELD_DEFINITION

  type MediaInfo {
    id: ID
    title: String
    tags: [String]
    plot: String
    image: String
    type: String
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
  }

  type Mutation {
    login(name: String, password: String!): String!
    setPassword(inviteCode: String!, password: String!): String!

    setWatched(path: String, value: Boolean): [String] @auth

    createUser(name: String!, email: String!, expires: String!): Boolean @hasRole(role: "master")
    setAutoGrabs(autoGrabs: [String]): [String] @hasRole(role: "master")
    download(link: String!): Boolean @hasRole(role: "master")
    torrentAction(name: String!, torrentId: String!, removeFiles: Boolean): Boolean
      @hasRole(role: "master")
  }

  type Query {
    deluge: Deluge @auth
    watched: [String] @auth

    users: [User] @hasRole(role: "master")
    getYtID(query: String!): String @hasRole(role: "master")
    config: Config @hasRole(role: "master")
    rss: [RssItem] @hasRole(role: "master")
  }
`

const resolvers = {
  Query: {
    deluge: getDeluge,
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
    getYtID: async ({ query }) => {
      const res = await got(
        `https://www.googleapis.com/youtube/v3/search?q=${query}%20trailer&part=id&key=${process.env.YOUTUBE}`,
        { json: true },
      )

      return res.body.items[0].id.videoId
    },
    config: async () => {
      const config = await Config.findOne({})
      return config || { autoGrabs: [], fetchedMedias: {} }
    },
  },

  Mutation: {
    torrentAction,
    download,

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
    setWatched: async (parent, { path, value }, { user }) => {
      const { name } = user
      const u = await User.findOne({ name })
      if (!u) {
        return null
      }

      const watched = uniq(value ? [...u.watched, path] : u.watched.filter(w => w !== path))

      u.watched = watched
      await u.save()

      return watched
    },

    // Auth
    createUser: auth.createUser,
    login: auth.login,
    setPassword: auth.setPassword,
  },
}

module.exports = {
  schema: makeExecutableSchema({
    typeDefs,
    resolvers,
    schemaDirectives,
  }),
  context: auth.context,
}
