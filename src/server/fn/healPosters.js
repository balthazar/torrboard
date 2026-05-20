const got = require('got')

const MediaInfo = require('../models/MediaInfo')
const tmdb = require('./tmdb')
const logErr = require('./logErr')

// HEAD the poster URL. Returns:
//   true   = URL is alive (2xx/3xx)
//   false  = URL is dead (4xx) — definitely gone, safe to replace
//   null   = unknown (5xx, timeout, network) — skip rather than replace
const probe = async url => {
  if (!url) return false
  try {
    const res = await got.head(url, {
      throwHttpErrors: false,
      followRedirect: true,
      timeout: { request: 10000 },
    })
    if (res.statusCode >= 200 && res.statusCode < 400) return true
    if (res.statusCode >= 400 && res.statusCode < 500) return false
    return null
  } catch {
    return null
  }
}

// Scan MediaInfo posters, swap Amazon-rotated 404s for working URLs from
// TMDB's CDN. Run nightly. Sequential to keep request rate sane and so a
// single bad record can't break the rest. No-op if TMDB isn't configured.
//
// Options:
//   limit:  max records to repair per pass (default 200)
//   dryRun: probe and report but don't write
module.exports = async ({ limit = 200, dryRun = false } = {}) => {
  if (!tmdb.hasKey() && !dryRun) {
    // eslint-disable-next-line no-console
    console.log('[healPosters] TMDB key not set; skipping')
    return { checked: 0, dead: 0, healed: 0, stillDead: 0, stopped: false }
  }

  const all = await MediaInfo.find(
    { image: { $exists: true, $ne: null } },
    { imdbID: 1, title: 1, image: 1 },
  ).lean()

  let checked = 0
  let dead = 0
  let healed = 0
  let stillDead = 0
  let stopped = false

  for (const m of all) {
    checked++
    const alive = await probe(m.image)
    if (alive !== false) continue
    dead++

    if (dryRun) continue
    if (healed + stillDead >= limit) {
      stopped = true
      break
    }

    const t = await tmdb.findByImdb(m.imdbID)
    const fresh = t && t.payload && t.payload.image
    if (!fresh || fresh === m.image) {
      stillDead++
      continue
    }

    const ok = await probe(fresh)
    if (ok !== true) {
      stillDead++
      continue
    }

    try {
      await MediaInfo.updateOne({ imdbID: m.imdbID }, { $set: { image: fresh } })
      healed++
    } catch (err) {
      logErr('healPosters', err)
      stillDead++
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `[healPosters] checked=${checked} dead=${dead} healed=${healed} stillDead=${stillDead}${
      stopped ? ` (stopped at limit=${limit})` : ''
    }`,
  )

  return { checked, dead, healed, stillDead, stopped }
}
