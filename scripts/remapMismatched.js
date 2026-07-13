// Un-stick torrents that were linked to the WRONG MediaInfo by the old
// "newest namesake wins" resolution (e.g. real Rick and Morty episodes routed
// to "Rick and Morty: The Anime", or a "Black Box" film routed to "Black Box
// Diaries"). For each bad imdbID we delete its MediaInfo doc and clear the
// `fetchedMedias` flag on every torrent it held, so the refreshMediaInfos cron
// re-resolves them with the fixed pickSearchMatch ranking (exact title wins).
//
// Deleting the doc is what unblocks re-resolution: getMediaInfo refuses to move
// a torrent already linked to a different imdbID, so the stale link has to go
// first. If some torrents genuinely belonged to the deleted title, they simply
// re-resolve back to it — the ranking is now correct either way.
//
// Usage:
//   node scripts/remapMismatched.js                         # dry run, default targets
//   node scripts/remapMismatched.js --apply                 # commit default targets
//   node scripts/remapMismatched.js tt28466465 tt30227076   # explicit targets (dry run)
//   node scripts/remapMismatched.js --apply tt30227076      # commit explicit targets
require('dotenv').config()
const mongoose = require('mongoose')

const MediaInfo = require('../src/server/models/MediaInfo')
const Config = require('../src/server/models/Config')

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27018/torrboard'
const apply = process.argv.includes('--apply')

// Known bad links from the newest-namesake bug. Override by passing imdbIDs.
const DEFAULT_TARGETS = [
  'tt28466465', // "Rick and Morty: The Anime" — stole real Rick and Morty episodes
  'tt30227076', // "Black Box Diaries" — stole a "Black Box" film
]

const targets = process.argv
  .slice(2)
  .filter(a => /^tt\d+$/.test(a))

const badIds = targets.length ? targets : DEFAULT_TARGETS

;(async () => {
  await mongoose.connect(MONGO_URL, { directConnection: true })

  const docs = await MediaInfo.find({ imdbID: { $in: badIds } }).lean()

  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN (pass --apply to commit)'}`)
  console.log(`Targets: ${badIds.join(', ')}`)
  console.log(`Matched docs: ${docs.length}\n`)

  const torrentIds = []
  for (const d of docs) {
    const ts = d.torrents || []
    torrentIds.push(...ts)
    console.log(`  ${d.imdbID}  "${d.title}" (${d.year || '?'})  -> unlink ${ts.length} torrent(s)`)
  }

  if (!docs.length) {
    console.log(`\nNothing to do.`)
    await mongoose.disconnect()
    process.exit(0)
  }

  console.log(
    `\nWill delete ${docs.length} MediaInfo doc(s) and clear ${torrentIds.length} fetchedMedias flag(s).`,
  )

  if (!apply) {
    console.log(`\nDry run: nothing changed. Re-run with --apply to commit.`)
    await mongoose.disconnect()
    process.exit(0)
  }

  await MediaInfo.deleteMany({ imdbID: { $in: badIds } })

  if (torrentIds.length) {
    const unset = torrentIds.reduce((acc, id) => {
      acc[`fetchedMedias.${id}`] = ''
      return acc
    }, {})
    await Config.updateOne({}, { $unset: unset })
  }

  console.log(
    `\nDone. Deleted ${docs.length} doc(s), cleared ${torrentIds.length} flag(s). ` +
      `refreshMediaInfos will re-resolve them on its next tick.`,
  )

  await mongoose.disconnect()
  process.exit(0)
})().catch(err => {
  console.error(err)
  process.exit(1)
})
