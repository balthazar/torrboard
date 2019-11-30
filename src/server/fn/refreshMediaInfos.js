const got = require('got')
const ptn = require('parse-torrent-name')

const { getDeluge } = require('./deluge')
const Config = require('../models/Config')
const MediaInfo = require('../models/MediaInfo')

const getMediaInfo = async (id, { title, year }) => {
  try {
    const res = await got(
      `http://www.omdbapi.com/?t=${title}${year ? `&y=${year}` : ''}&apiKey=${process.env.OMDB}`,
      {
        json: true,
      },
    )

    if (res.body.Response !== 'True') {
      return
    }

    const { Title, Genre, Type, Plot, Poster, imdbRating, imdbID } = res.body

    await MediaInfo.updateOne(
      { imdbID },
      {
        title: Title,
        plot: Plot === 'N/A' ? null : Plot,
        tags: Genre === 'N/A' ? null : Genre.split(', ').map(g => g.toLowerCase()),
        type: Type,
        image: Poster === 'N/A' ? null : Poster,
        rating: !isNaN(imdbRating) ? imdbRating : null,
        imdbID,
        $addToSet: { torrents: id },
      },
      { upsert: true },
    )
  } catch (err) {
    console.log(err)
  }
}

module.exports = async () => {
  const { torrents } = await getDeluge()
  const { fetchedMedias } = await Config.findOne()

  const mediasToFetch = torrents.reduce((acc, torrent) => {
    const meta = ptn(torrent.name)
    const title = meta.title
      .replace(/S?[0-9]+.*$/, '')
      .replace(/ \[$/, '')
      .replace(/COMPLETE/i, '')
      .replace(/season/i, '')
      .replace(/ {2}rs$/, '')
      .replace(/\./g, '-')
      .trim()

    if (!title || fetchedMedias[torrent.id]) {
      return acc
    }

    if (!acc[torrent.id]) {
      acc[torrent.id] = { title, year: meta.year }
    }

    return acc
  }, {})

  await Promise.all(Object.keys(mediasToFetch).map(id => getMediaInfo(id, mediasToFetch[id])))

  await Config.updateOne(
    {},
    {
      $set: Object.keys(mediasToFetch).reduce((acc, key) => {
        acc[`fetchedMedias.${key}`] = true
        return acc
      }, {}),
    },
  )
}
