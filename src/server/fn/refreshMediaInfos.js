const ptn = require('parse-torrent-name')

const { getDeluge } = require('./deluge')
const Config = require('../models/Config')
const getMediaInfo = require('./getMediaInfo')

// Per-tick cap on OMDB requests so a backlog can't blow through the free
// 1000/day quota in one go. Sized to comfortably fit the 2-minute schedule.
const BATCH_LIMIT = 8
// Pause between sequential requests so we never burst-flood OMDB.
const REQUEST_DELAY_MS = 500
// After this many failed attempts, give up on a torrent so it stops being
// retried every 2 minutes forever.
const MAX_ATTEMPTS = 3
// If this many in a row fail, bail the tick early. Almost always a 401 from
// OMDB's daily quota; no point continuing to hammer it.
const CONSECUTIVE_FAILURE_BAIL = 3

const cleanTitle = raw =>
  raw
    // Drop SxxExx / Sxx / "Season N" / "Part N" and anything after.
    .replace(/\b(S\d{1,2}(E\d+)?|Season\s*\d+|Part\s*\d+)\b.*$/i, '')
    // Drop a release-year tail (1900-2099) and anything after.
    .replace(/\b(19|20)\d{2}\b.*$/, '')
    // Drop boilerplate tokens.
    .replace(/\b(COMPLETE|REPACK|PROPER|EXTENDED|REMUX|UNCUT)\b/gi, '')
    .replace(/\bseason\b/gi, '')
    // Normalize separators.
    .replace(/[._]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/ \[$/, '')
    .trim()

// Heuristics for torrents that clearly aren't movies or series so we never
// waste an OMDB call on them. Catches the Adobe installers, .apk/.7z apps,
// and known game piracy group releases that show up in mixed feeds.
const NON_MEDIA_PATTERNS = [
  /\b(apk|exe|msi|dmg|iso|pkg|deb|rpm|7z)\b/i,
  /\b(Adobe|Autodesk|AutoCAD|JetBrains|Affinity|Photoshop|Illustrator|InDesign|Lightroom|Premiere\s*Pro|After\s*Effects|WinRAR|MS\s*Office|Office\s*365)\b/i,
  /\b(DODI|FitGirl|CODEX|EMPRESS|SKIDROW|Razor1911|RELOADED|PLAZA|CPY|RUNE|HOODLUM|TENOKE|GOG)\b/i,
]

const isProbablyMedia = name => !NON_MEDIA_PATTERNS.some(re => re.test(name))

const sleep = ms => new Promise(r => setTimeout(r, ms))

module.exports = async () => {
  const { torrents } = await getDeluge()
  const config = (await Config.findOne()) || {}
  const fetchedMedias = config.fetchedMedias || {}

  const candidates = []
  const toSkip = []

  for (const torrent of torrents) {
    const status = fetchedMedias[torrent.id]
    // true = previously succeeded, 'skip' = filtered as non-media,
    // number >= MAX_ATTEMPTS = gave up. All terminal.
    if (status === true || status === 'skip') continue
    if (typeof status === 'number' && status >= MAX_ATTEMPTS) continue

    if (!isProbablyMedia(torrent.name)) {
      toSkip.push(torrent.id)
      continue
    }

    const meta = ptn(torrent.name)
    if (!meta.title) continue

    const title = cleanTitle(meta.title)
    if (!title) continue

    const prevAttempts = typeof status === 'number' ? status : 0
    candidates.push({ id: torrent.id, title, year: meta.year, attempt: prevAttempts + 1 })
  }

  if (toSkip.length) {
    await Config.updateOne(
      {},
      {
        $set: toSkip.reduce((acc, key) => {
          acc[`fetchedMedias.${key}`] = 'skip'
          return acc
        }, {}),
      },
    )
  }

  const batch = candidates.slice(0, BATCH_LIMIT)
  const updates = {}
  let consecutiveFailures = 0

  for (const item of batch) {
    const result = await getMediaInfo(item.id, { title: item.title, year: item.year })
    if (result.ok) {
      updates[`fetchedMedias.${item.id}`] = true
      consecutiveFailures = 0
    } else {
      // Only count non-transient outcomes toward MAX_ATTEMPTS. An OMDB rate
      // limit, network blip, or mongo hiccup shouldn't permanently blacklist
      // a legit torrent; without this a flaky 6-minute window would.
      if (!result.transient) {
        updates[`fetchedMedias.${item.id}`] = item.attempt
      }
      consecutiveFailures++
      if (consecutiveFailures >= CONSECUTIVE_FAILURE_BAIL) break
    }
    await sleep(REQUEST_DELAY_MS)
  }

  if (Object.keys(updates).length) {
    await Config.updateOne({}, { $set: updates })
  }
}
