const { buildSchema } = require('graphql')

const MediaInfo = require('../models/MediaInfo')
const Config = require('../models/Config')

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

  type Query {
    mediaInfos(title: String): [MediaInfo]
    config: Config
  }
`)

const MEDIA_INFOS = [
  {
    title: 'Dr Stone',
    tags: ['Animation', 'Action', 'Adventure', 'Drama', 'Fantasy', 'Sci-Fi'],
    plot:
      "One fateful day, all of humanity was petrified by a blinding flash of light. After several millennia, high schooler Taiju awakens and finds himself lost in a world of statues. However, he's...",
    image:
      'https://m.media-amazon.com/images/M/MV5BZTU1ODAyN2UtZjdlOC00ODUwLWE3NjEtYjE3NmViNTAwMzMyXkEyXkFqcGdeQXVyMzgxODM4NjM@._V1_SX300.jpg',
    type: 'series',
    imdbId: 'tt9679542',
    rating: 8.3,
  },
  {
    title: 'Guardians of the Galaxy Vol. 2',
    tags: ['Action'],
    plot:
      "The Guardians struggle to keep together as a team while dealing with their personal family issues, notably Star-Lord's encounter with his father the ambitious celestial being Ego.",
    image:
      'https://m.media-amazon.com/images/M/MV5BNjM0NTc0NzItM2FlYS00YzEwLWE0YmUtNTA2ZWIzODc2OTgxXkEyXkFqcGdeQXVyNTgwNzIyNzg@._V1_SX300.jpg',
    type: 'movie',
    imdbId: 'tt3896198',
    rating: 7.6,
  },
]

const rootValue = {
  mediaInfos: params => {
    console.log(params)
    return MEDIA_INFOS
  },
  config: async () => {
    return { autoGrabs: [] }
    const config = await Config.findOne({})
    return config ? config : { autoGrabs: [] }
  },
}

module.exports = { schema, rootValue }
