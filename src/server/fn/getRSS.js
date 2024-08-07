const cache = require('memory-cache')
const ptn = require('parse-torrent-name')
const Parser = require('rss-parser')

const parser = new Parser()

module.exports = async () => {
  const cached = cache.get('rss')
  if (cached) return cached

  try {
    const feed = await parser.parseURL(process.env.RSS_URL)

    const res = feed.items.map(item => {
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
        seeders: Number(seeders),
        leechers: Number(leechers),
        meta,
        isSerie,
      }
    })

    cache.put('rss', res, 1e3 * 60)
    return res
  } catch (err) {
    return []
  }
}
