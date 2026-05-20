// Repair torrents that ended up linked to multiple MediaInfo records.
// Strategy: for each duplicated torrent, keep it in the MediaInfo with the
// oldest _id (the original, correct match in nearly all cases) and pull it
// from the newer ones. MediaInfo records that become empty are deleted.
//
// Usage:
//   node scripts/dedupeTorrents.js            # dry run (default)
//   node scripts/dedupeTorrents.js --apply    # commit changes
require('dotenv').config()
const mongoose = require('mongoose')

const MediaInfo = require('../src/server/models/MediaInfo')

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27018/torrboard'
const apply = process.argv.includes('--apply')

;(async () => {
  await mongoose.connect(MONGO_URL, {
    directConnection: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })

  const all = await MediaInfo.find({}, { imdbID: 1, title: 1, torrents: 1 }).lean()

  // Map: torrentId -> array of MediaInfo, sorted oldest-first
  const byTorrent = new Map()
  for (const m of all) {
    for (const t of m.torrents || []) {
      if (!byTorrent.has(t)) byTorrent.set(t, [])
      byTorrent.get(t).push(m)
    }
  }
  for (const arr of byTorrent.values()) {
    arr.sort((a, b) => a._id.toString().localeCompare(b._id.toString()))
  }

  // For each MediaInfo, build list of torrents to pull (those it's not the
  // oldest holder of).
  const pullsByMedia = new Map()
  let dupCount = 0
  for (const [torrentId, mis] of byTorrent.entries()) {
    if (mis.length <= 1) continue
    dupCount++
    const keep = mis[0]
    for (const m of mis.slice(1)) {
      if (!pullsByMedia.has(m._id.toString())) {
        pullsByMedia.set(m._id.toString(), { media: m, pulls: [] })
      }
      pullsByMedia.get(m._id.toString()).pulls.push({ torrentId, keep })
    }
  }

  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN (pass --apply to commit)'}`)
  console.log(`Duplicated torrents: ${dupCount}`)
  console.log(`MediaInfo records affected: ${pullsByMedia.size}\n`)

  for (const { media, pulls } of pullsByMedia.values()) {
    const remaining = (media.torrents || []).length - pulls.length
    const fate = remaining === 0 ? 'DELETE' : `keep (${remaining} torrents left)`
    console.log(`  ${media.imdbID}  "${media.title}"  ${fate}`)
    for (const p of pulls) {
      console.log(`    pull ${p.torrentId}  (stays in ${p.keep.imdbID} "${p.keep.title}")`)
    }
  }

  if (!apply) {
    console.log(`\nDry run: no changes. Re-run with --apply to commit.`)
    await mongoose.disconnect()
    process.exit(0)
  }

  let pulled = 0
  let deleted = 0
  for (const { media, pulls } of pullsByMedia.values()) {
    const ids = pulls.map(p => p.torrentId)
    await MediaInfo.updateOne({ _id: media._id }, { $pullAll: { torrents: ids } })
    pulled += ids.length

    const fresh = await MediaInfo.findOne({ _id: media._id }, { torrents: 1 }).lean()
    if (fresh && (!fresh.torrents || fresh.torrents.length === 0)) {
      await MediaInfo.deleteOne({ _id: media._id })
      deleted++
    }
  }

  console.log(`\nPulled ${pulled} duplicated torrent links; deleted ${deleted} empty MediaInfo records.`)

  await mongoose.disconnect()
  process.exit(0)
})().catch(err => {
  console.error(err)
  process.exit(1)
})
