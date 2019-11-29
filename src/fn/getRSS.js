const ptn = require('parse-torrent-name')
const Parser = require('rss-parser')

const parser = new Parser()

const main = async () => {
  const feed = await parser.parseURL(process.env.RSS_URL)
  const relevant = []

  const search = [
    'Mr Robot',
    'His Dark Materials',
    'The Walking Dead',
    'Rick and Morty',
    'Dr Stone',
    'Boku no Hero Academia',
    'High School Prodigies Have It Easy Even In Another World',
  ]

  feed.items.forEach(item => {
    const [_, seeders, leechers] = item.content.match(
      /^.* - Seeders: ([0-9]+) - Leechers: ([0-9]+)$/,
    )

    const [cat] = item.categories
    const isSerie = cat.includes('Episodes')

    const meta = ptn(item.title)

    const data = {
      ...item,
      seeders,
      leechers,
      meta,
    }

    if (search.includes(meta.title) && meta.resolution === '1080p') {
      relevant.push(data)
    }
  })

  console.log(relevant, relevant.length)
}
