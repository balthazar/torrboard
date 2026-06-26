const { resolve } = require('path')
const { readdir } = require('fs').promises
const got = require('got')
const uniq = require('lodash/uniq')
const cache = require('memory-cache')

const { DOWNLOAD_DIR } = require('../../config')
const logErr = require('./logErr')

const VIDEO_EXTS = ['.mkv', '.avi', '.mp4', '.rar']
const IGNORE = (process.env.FILE_IGNORE || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
const isIgnored = name => IGNORE.includes(name)
const isMedia = f =>
  !f.toLowerCase().includes('sample') && VIDEO_EXTS.some(ext => f.endsWith(ext))

// getDeluge polls every ~10s, so a persistent misconfiguration would log on
// every tick. Throttle identical (code+path) errors to one line per window.
const FS_ERR_THROTTLE_MS = 5 * 60 * 1000
const warnFsError = err => {
  const key = `getfiles-fs-err:${err.code}:${err.path || ''}`
  if (cache.get(key)) return
  cache.put(key, 1, FS_ERR_THROTTLE_MS)
  logErr('getFiles', err)
}

// Prod: recursively scan the local media volume.
const walkLocal = async (dir, isRoot = false) => {
  let dirents
  try {
    dirents = await readdir(dir, { withFileTypes: true })
  } catch (err) {
    // A permission error (EACCES), or a missing/unreadable *root* directory,
    // is an operator-fixable misconfiguration: the media volume isn't mounted,
    // or its ownership/mode is wrong. Silently returning [] here is what made
    // the homepage go blank with no signal, so surface these loudly. A nested
    // ENOENT is almost always a file removed mid-walk; stay quiet for those.
    if (err.code === 'EACCES' || (isRoot && err.code === 'ENOENT')) {
      warnFsError(err)
      return []
    }
    if (err.code === 'ENOENT') {
      return []
    }
    throw err
  }

  const files = await Promise.all(
    dirents
      .filter(d => !isIgnored(d.name))
      .map(dirent => {
        const res = resolve(dir, dirent.name)
        return dirent.isDirectory() ? walkLocal(res) : res
      }),
  )

  return Array.prototype.concat(...files)
}

// Dev: walk the prod nginx autoindex at /dl/. The api can't see the prod
// volume so we parse <a href="..."> links recursively. Non-blocking: the
// caller gets the cached list immediately and a background refresh repopulates
// it. NGINX_PWD must be set in .env to "user:password".
const REMOTE_CACHE_KEY = 'dev-files'
const REMOTE_TTL_MS = 10 * 60 * 1000
const HREF_RE = /<a href="([^"?][^"]*)"/gi

const fetchListing = async url => {
  const [username, password] = (process.env.NGINX_PWD || '').split(':')
  const res = await got(url, {
    username,
    password,
    timeout: { request: 20 * 1000 },
    retry: { limit: 0 },
  })

  // Defensive: nginx serves index.html when present instead of the autoindex,
  // so a book or static site under /dl/ would otherwise hand us hundreds of
  // unrelated <a> tags (absolute external URLs, anchors, etc). Only trust
  // pages whose <title> says "Index of /...".
  if (!/<title>\s*Index of /i.test(res.body)) {
    return []
  }

  const links = []
  let m
  while ((m = HREF_RE.exec(res.body)) !== null) {
    const h = m[1]
    if (h === '../') continue
    if (h.startsWith('/') || h.startsWith('#')) continue
    if (h.includes('://')) continue
    links.push(h)
  }
  HREF_RE.lastIndex = 0
  return links
}

const walkHttp = async (url, basePath) => {
  let entries
  try {
    entries = await fetchListing(url)
  } catch (err) {
    logErr(`getFiles ${url}`, err)
    return []
  }

  const out = await Promise.all(
    entries.map(entry => {
      const name = decodeURIComponent(entry.replace(/\/$/, ''))
      if (isIgnored(name)) {
        return []
      }
      if (entry.endsWith('/')) {
        return walkHttp(`${url}${entry}`, `${basePath}/${name}`)
      }
      return [`${basePath}/${name}`]
    }),
  )

  return Array.prototype.concat(...out)
}

let refreshing = false
const refreshRemote = dir => {
  if (refreshing) return
  if (!process.env.NGINX_PWD || !process.env.NGINX_URL) {
    console.error('[getFiles] NGINX_URL/NGINX_PWD not set; cannot list prod files') // eslint-disable-line no-console
    return
  }
  refreshing = true

  const started = Date.now()
  walkHttp(`${process.env.NGINX_URL}/dl/`, dir)
    .then(files => {
      cache.put(REMOTE_CACHE_KEY, files, REMOTE_TTL_MS)
      console.log( // eslint-disable-line no-console
        `[getFiles] indexed ${files.length} files in ${Math.round((Date.now() - started) / 1000)}s`,
      )
    })
    .catch(err => logErr('getFiles walk', err))
    .then(() => {
      refreshing = false
    })
}

const walkRemote = async dir => {
  const cached = cache.get(REMOTE_CACHE_KEY)
  if (!cached) {
    refreshRemote(dir)
    return []
  }
  return cached
}

module.exports = async () => {
  const dir = `${DOWNLOAD_DIR}/dl`
  const raw =
    process.env.NODE_ENV === 'production' ? await walkLocal(dir, true) : await walkRemote(dir)

  return uniq(raw.filter(isMedia))
}
