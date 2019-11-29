const ptn = require('parse-torrent-name')
const Parser = require('rss-parser')

const parser = new Parser()

module.exports = async () => {
  const feed = await parser.parseURL(process.env.RSS_URL)

  return feed.items.map(item => {
    const [seeders, leechers] = item.content
      .match(/^.* - Seeders: ([0-9]+) - Leechers: ([0-9]+)$/)
      .slice(1)

    const [category] = item.categories
    const isSerie = category.includes('Episodes')

    const meta = ptn(item.title)

    const { title, link, isoDate: date } = item

    return {
      title,
      link,
      date,
      category,
      seeders,
      leechers,
      meta,
      isSerie,
    }
  })

  // if (search.includes(meta.title) && meta.resolution === '1080p') {
  //   relevant.push(data)
  // }
}
