// Re-fetch one or more MediaInfo records from OMDB by imdbID. Used when a
// cached poster URL goes 404 or you want to update plot/rating/year.
// Preserves the existing torrents array.
//
// Usage:
//   node scripts/refreshMediaInfo.js tt1694423            # one
//   node scripts/refreshMediaInfo.js tt1694423 tt1190634  # several
require('dotenv').config()
const mongoose = require('mongoose')

const getMediaInfo = require('../src/server/fn/getMediaInfo')
const MediaInfo = require('../src/server/models/MediaInfo')

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27018/torrboard'
const ids = process.argv.slice(2).filter(a => a.startsWith('tt'))

if (!ids.length) {
  console.error('Usage: node scripts/refreshMediaInfo.js <imdbID> [imdbID...]')
  process.exit(2)
}

;(async () => {
  await mongoose.connect(MONGO_URL, {
    directConnection: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })

  for (const newId of ids) {
    const before = await MediaInfo.findOne({ imdbID: newId }, { title: 1, image: 1 }).lean()
    const ok = await getMediaInfo(null, { newId, torrentIds: [] })
    const after = await MediaInfo.findOne({ imdbID: newId }, { title: 1, image: 1 }).lean()
    const imgChanged = (before && before.image) !== (after && after.image)
    console.log(`${newId}  ${ok ? 'ok' : 'FAIL'}  "${after ? after.title : '?'}"${imgChanged ? '  [image updated]' : ''}`)
  }

  await mongoose.disconnect()
  process.exit(0)
})().catch(err => {
  console.error(err)
  process.exit(1)
})
