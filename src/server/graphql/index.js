const { buildSchema } = require('graphql')

const MediaInfo = require('../models/MediaInfo')
const Config = require('../models/Config')

const deluge = require('../fn/getDeluge')

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

  type Mutation {
    setAutoGrabs(autoGrabs: [String]): [String]
  }

  type Query {
    mediaInfos(title: String): [MediaInfo]
    config: Config
    deluge: Deluge
  }
`)

const rootValue = {
  deluge,
  mediaInfos: () => MediaInfo.find(),
  config: async () => {
    const config = await Config.findOne({})
    return config || { autoGrabs: [] }
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
}

module.exports = { schema, rootValue }
