// Manually trigger one heal pass. Same work the daily cron does.
//
// Usage:
//   node scripts/healPosters.js              # dry run (default) — probe and report
//   node scripts/healPosters.js --apply      # repair via TMDB
//   node scripts/healPosters.js --apply --limit=50
require('dotenv').config()
const mongoose = require('mongoose')

const healPosters = require('../src/server/fn/healPosters')

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27018/torrboard'
const apply = process.argv.includes('--apply')
const limitArg = process.argv.find(a => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.slice('--limit='.length), 10) : 200

;(async () => {
  await mongoose.connect(MONGO_URL, { directConnection: true })

  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN (pass --apply to commit)'} limit=${limit}`)
  await healPosters({ dryRun: !apply, limit })

  await mongoose.disconnect()
  process.exit(0)
})().catch(err => {
  console.error(err)
  process.exit(1)
})
