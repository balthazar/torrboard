const ptn = require('parse-torrent-name')
const Parser = require('rss-parser')

const parser = new Parser()

module.exports = async () => {
  const feed = await parser.parseURL(process.env.RSS_URL)

  return feed.items.map(item => {
    const [seeders, leechers] = item.content
      .match(/^.* - Seeders: ([0-9]+) - Leechers: ([0-9]+)$/)
      .slice(1)

    const [cat] = item.categories
    const isSerie = cat.includes('Episodes')

    const meta = ptn(item.title)

    return {
      title: item.title,
      link: item.link,
      date: item.isoDate,
      category: cat,
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
