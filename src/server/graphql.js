const got = require('got')
const { buildSchema } = require('graphql')

const MediaInfo = require('./models/MediaInfo')
const Config = require('./models/Config')

const { download, torrentAction, getDeluge } = require('./fn/deluge')
const rss = require('./fn/getRSS')

const schema = buildSchema(`
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
    watched: [String]
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
    name: String,
    total_done: Float
    ratio: Float
    total_size: Float,
    state: String,
    eta: Float,
    progress: Float,
    upload_payload_rate: Float,
    download_payload_rate: Float,
    time_added: Float,
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

  type Mutation {
    setAutoGrabs(autoGrabs: [String]): [String]
    setWatched(path: String, value: Boolean): Boolean
    download(link: String!): Boolean
    torrentAction(name: String!, torrentId: String!, removeFiles: Boolean): Boolean
  }

  type Query {
    getYtID(query: String!): String
    mediaInfos(title: String): [MediaInfo]

    config: Config
    deluge: Deluge
    rss: [RssItem]
  }
`)

const rootValue = {
  deluge: getDeluge,
  torrentAction,
  download,
  rss,

  getYtID: async ({ query }) => {
    const res = await got(
      `https://www.googleapis.com/youtube/v3/search?q=${query}%20trailer&part=id&key=${process.env.YOUTUBE}`,
      { json: true },
    )

    return res.body.items[0].id.videoId
  },
  mediaInfos: () => MediaInfo.find(),
  config: async () => {
    const config = await Config.findOne({})
    return config || { autoGrabs: [], watched: [], fetchedMedias: {} }
  },

  setAutoGrabs: async ({ autoGrabs = [] }) => {
    await Config.updateOne(
      {},
      {
        $set: { autoGrabs },
      },
      { upsert: true },
    )

    return autoGrabs
  },
  setWatched: async ({ path, value }) => {
    const config = await Config.findOne({})

    const watched = value ? config.watched.filter(w => w !== path) : [...config.watched, path]

    await Config.updateOne(
      {},
      {
        watched,
      },
      { upsert: true },
    )
  },
}

module.exports = { schema, rootValue }
