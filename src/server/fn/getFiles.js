const { resolve } = require('path')
const { readdir } = require('fs').promises
const { DOWNLOAD_DIR } = process.env

const getFiles = async dir => {
  const dirents = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    dirents.map(dirent => {
      const res = resolve(dir, dirent.name)
      return dirent.isDirectory() ? getFiles(res) : res
    }),
  )

  return Array.prototype.concat(...files).filter(file => !/sample\..*$/.test(file))
}


// TODO: un-hardcode /dl here
module.exports = () => getFiles(`${DOWNLOAD_DIR}/dl`)
