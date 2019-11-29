const got = require('got')
const ptn = require('parse-torrent-name')

const getDeluge = require('./getDeluge')
const Config = require('../models/Config')
const MediaInfo = require('../models/MediaInfo')

const getMediaInfo = async (title, { torrents, year }) => {
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

    const old = await MediaInfo.findOne({ imdbID })
    const associatedTorrents = old ? old.torrents : []

    await MediaInfo.updateOne(
      { imdbID },
      {
        title: Title,
        plot: Plot === 'N/A' ? null : Plot,
        tags: Genre === 'N/A' ? null : Genre.split(', ').map(g => g.toLowerCase()),
        type: Type,
        image: Poster === 'N/A' ? null : Poster,
        rating: !isNaN(imdbRating) ? imdbRating : null,
        torrents: associatedTorrents
          .concat(torrents)
          .filter((value, index, self) => value && self.indexOf(value) === index),
        imdbID,
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

    if (!title || fetchedMedias[title]) {
      return acc
    }

    if (!acc[title]) {
      acc[title] = { torrents: [torrent.id], year: meta.year }
    } else {
      acc[title].torrents.push(torrent.id)
    }
    return acc
  }, {})

  await Promise.all(
    Object.keys(mediasToFetch).map(title => getMediaInfo(title, mediasToFetch[title])),
  )

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
