const { resolve } = require('path')
const { readdir } = require('fs').promises
const uniq = require('lodash/uniq')

const { DOWNLOAD_DIR } = require('../../config')

const getFiles = async dir => {
  const dirents = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    dirents.map(dirent => {
      const res = resolve(dir, dirent.name)
      return dirent.isDirectory() ? getFiles(res) : res
    }),
  )

  return Array.prototype.concat(...files)
}

module.exports = async () => {
  const raw = await getFiles(`${DOWNLOAD_DIR}/dl`)

  return uniq(
    raw.filter(
      f =>
        !f.toLowerCase().includes('sample') &&
        ['.mkv', '.avi', '.mp4', '.rar'].some(ext => f.endsWith(ext)),
    ),
  )
}
