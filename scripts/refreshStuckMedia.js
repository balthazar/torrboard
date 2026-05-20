// Reset `fetchedMedias[id]` flags for torrents that are marked fetched but
// never actually got linked to a MediaInfo. The every-2-min refreshMediaInfos
// cron will then retry OMDB resolution with the current cleanTitle logic.
//
// Usage:
//   node scripts/refreshStuckMedia.js            # dry run (default)
//   node scripts/refreshStuckMedia.js --apply    # actually clear the flags
require('dotenv').config()
const mongoose = require('mongoose')

const MediaInfo = require('../src/server/models/MediaInfo')
const Config = require('../src/server/models/Config')
const { getDeluge } = require('../src/server/fn/deluge')

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27018/torrboard'
const apply = process.argv.includes('--apply')

;(async () => {
  await mongoose.connect(MONGO_URL, {
    directConnection: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })

  const { torrents } = await getDeluge()
  const config = await Config.findOne({})
  const fetched = (config && config.fetchedMedias) || {}

  const medias = await MediaInfo.find({}, { torrents: 1 }).lean()
  const linked = new Set()
  medias.forEach(m => (m.torrents || []).forEach(id => linked.add(id)))

  const stuck = torrents
    .filter(t => fetched[t.id] && !linked.has(t.id))
    .map(t => ({ id: t.id, name: t.name }))

  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN (pass --apply to commit)'}`)
  console.log(`Deluge torrents: ${torrents.length}`)
  console.log(`Linked to a MediaInfo: ${linked.size}`)
  console.log(`Stuck (fetched=true but unlinked): ${stuck.length}\n`)

  stuck.forEach(t => console.log(`  - ${t.name}`))

  if (stuck.length && apply) {
    const unset = stuck.reduce((acc, t) => {
      acc[`fetchedMedias.${t.id}`] = ''
      return acc
    }, {})
    await Config.updateOne({}, { $unset: unset })
    console.log(`\nCleared ${stuck.length} flags. refreshMediaInfos will retry on next tick.`)
  } else if (stuck.length) {
    console.log(`\nDry run: nothing changed. Re-run with --apply to clear.`)
  } else {
    console.log(`\nNothing to do.`)
  }

  await mongoose.disconnect()
  process.exit(0)
})().catch(err => {
  console.error(err)
  process.exit(1)
})
