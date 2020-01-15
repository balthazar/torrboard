const got = require('got')

const MediaInfo = require('../models/MediaInfo')

module.exports = async (id, { oldId, newId, title, year }) => {
  try {
    const query = newId ? `i=${newId}` : `t=${title}${year ? `&y=${year}` : ''}`
    const res = await got(`http://www.omdbapi.com/?${query}&apiKey=${process.env.OMDB}`, {
      json: true,
    })

    if (res.body.Response !== 'True') {
      return
    }

    const { Title, Genre, Type, Plot, Poster, Year, imdbRating, imdbID } = res.body

    const payload = {
      title: Title,
      plot: Plot === 'N/A' ? null : Plot,
      tags: Genre === 'N/A' ? null : Genre.split(', ').map(g => g.toLowerCase()),
      type: Type,
      image: Poster === 'N/A' ? null : Poster,
      rating: !isNaN(imdbRating) ? imdbRating : null,
      year: Year,
    }

    if (oldId) {
      await MediaInfo.updateOne(
        { imdbID: oldId },
        {
          ...payload,
          imdbID: newId,
        },
      )

      return
    }

    await MediaInfo.updateOne(
      { imdbID },
      {
        ...payload,
        imdbID,
        $addToSet: { torrents: id },
      },
      { upsert: true },
    )
  } catch (err) {
    console.log(err) // eslint-disable-line no-console
  }
}
