const { buildSchema } = require('graphql')

const MediaInfo = require('./models/MediaInfo')
const Config = require('./models/Config')

const deluge = require('./fn/getDeluge')
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

  type DelugeTorrent {
    id: String
    total_done: Float
    ratio: Float
    name: String,
    upload_payload_rate: Float,
    total_size: Float,
    state: String,
    eta: Float,
    progress: Float,
    download_payload_rate: Float,
    time_added: Float,
    total_uploaded: Float
    videos: [String]
    rar: String
    mediaInfo: MediaInfo
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
    setWatched(torrentId: String, value: Boolean): Boolean
  }

  type Query {
    mediaInfos(title: String): [MediaInfo]
    config: Config
    deluge: Deluge
    rss: [RssItem]
  }
`)

const rootValue = {
  deluge,
  rss,

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
  setWatched: async ({ torrentId, value }) => {
    const config = await Config.findOne({})

    const watched = value
      ? config.watched.filter(w => w !== torrentId)
      : [...config.watched, torrentId]

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
