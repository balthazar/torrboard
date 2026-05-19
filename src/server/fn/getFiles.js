const { resolve } = require('path')
const { readdir } = require('fs').promises
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const uniq = require('lodash/uniq')
const cache = require('memory-cache')

const { DOWNLOAD_DIR } = require('../../config')

const VIDEO_EXTS = ['.mkv', '.avi', '.mp4', '.rar']
const isMedia = f =>
  !f.toLowerCase().includes('sample') && VIDEO_EXTS.some(ext => f.endsWith(ext))

const walkLocal = async dir => {
  let dirents
  try {
    dirents = await readdir(dir, { withFileTypes: true })
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'EACCES') {
      return []
    }
    throw err
  }

  const files = await Promise.all(
    dirents.map(dirent => {
      const res = resolve(dir, dirent.name)
      return dirent.isDirectory() ? walkLocal(res) : res
    }),
  )

  return Array.prototype.concat(...files)
}

// In dev we can't see the prod media volume, so shell out to kubectl exec
// against the running torrboard pod. Cached so a 10s frontend poll doesn't
// hammer the api server with an exec per tick.
const walkRemote = async dir => {
  const cached = cache.get('dev-files')
  if (cached) return cached

  const cmd =
    `kubectl --context dadonew -n apps exec deploy/torrboard -c torrboard ` +
    `-- find ${dir} -type f`
  try {
    const { stdout } = await exec(cmd, { maxBuffer: 32 * 1024 * 1024 })
    const files = stdout.split('\n').filter(Boolean)
    cache.put('dev-files', files, 30 * 1000)
    return files
  } catch (err) {
    console.error('[getFiles] kubectl exec failed:', err.message) // eslint-disable-line no-console
    return []
  }
}

module.exports = async () => {
  const dir = `${DOWNLOAD_DIR}/dl`
  const raw =
    process.env.NODE_ENV === 'production' ? await walkLocal(dir) : await walkRemote(dir)

  return uniq(raw.filter(isMedia))
}
