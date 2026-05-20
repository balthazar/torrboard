// Manually trigger one pass of OMDB resolution for unmatched torrents,
// the same work refreshMediaInfos does on its 2-min cron, but on demand
// and with per-item logging.
//
// Usage:
//   node scripts/omdbPass.js          # dry run, list candidates
//   node scripts/omdbPass.js --apply  # query OMDB and persist matches
//
// Intentionally no --force flag: re-resolving already-linked torrents was
// destructive (OMDB picks newest year, so "REDACTED" got reassigned to
// "REDACTED"). If you need to fix a wrong link, use the UI's
// IMDB-set popover (setImdb mutation) which moves the torrent atomically.
require('dotenv').config()
const mongoose = require('mongoose')
const ptn = require('parse-torrent-name')

const MediaInfo = require('../src/server/models/MediaInfo')
const Config = require('../src/server/models/Config')
const { getDeluge } = require('../src/server/fn/deluge')
const getMediaInfo = require('../src/server/fn/getMediaInfo')

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27018/torrboard'
const apply = process.argv.includes('--apply')

// Same regex as refreshMediaInfos.cleanTitle. Kept inline so the script
// doesn't depend on exporting an internal helper.
const cleanTitle = raw =>
  raw
    .replace(/\b(S\d{1,2}(E\d+)?|Season\s*\d+|Part\s*\d+)\b.*$/i, '')
    .replace(/\b(19|20)\d{2}\b.*$/, '')
    .replace(/\b(COMPLETE|REPACK|PROPER|EXTENDED|REMUX|UNCUT)\b/gi, '')
    .replace(/\bseason\b/gi, '')
    .replace(/[._]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/ \[$/, '')
    .trim()

;(async () => {
  await mongoose.connect(MONGO_URL, {
    directConnection: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })

  const { torrents } = await getDeluge()
  const config = await Config.findOne({})
  const fetched = (config && config.fetchedMedias) || {}

  const candidates = []
  for (const t of torrents) {
    const meta = ptn(t.name)
    if (!meta.title) continue
    const title = cleanTitle(meta.title)
    if (!title) continue
    if (fetched[t.id]) continue
    candidates.push({ id: t.id, name: t.name, title, year: meta.year })
  }

  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN (pass --apply to commit)'}`)
  console.log(`Deluge torrents: ${torrents.length}`)
  console.log(`Candidates this pass: ${candidates.length}\n`)

  candidates.forEach(c =>
    console.log(`  - ${c.name}\n      query: title="${c.title}" year=${c.year || ''}`),
  )

  if (!apply) {
    console.log(`\nDry run: no OMDB calls made. Re-run with --apply to query.`)
    await mongoose.disconnect()
    process.exit(0)
  }

  console.log(`\nQuerying OMDB...`)
  const results = await Promise.all(
    candidates.map(async c => {
      const ok = await getMediaInfo(c.id, { title: c.title, year: c.year })
      return { ...c, ok }
    }),
  )

  const succeeded = results.filter(r => r.ok)
  const failed = results.filter(r => !r.ok)

  if (succeeded.length) {
    const $set = succeeded.reduce((acc, r) => {
      acc[`fetchedMedias.${r.id}`] = true
      return acc
    }, {})
    await Config.updateOne({}, { $set })
  }

  console.log(`\nResolved: ${succeeded.length}`)
  succeeded.forEach(r => console.log(`  ok  ${r.name}`))
  console.log(`\nUnresolved: ${failed.length}`)
  failed.forEach(r => console.log(`  --  ${r.name}`))

  await mongoose.disconnect()
  process.exit(0)
})().catch(err => {
  console.error(err)
  process.exit(1)
})
