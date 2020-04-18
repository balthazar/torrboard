const util = require('util')
const exec = util.promisify(require('child_process').exec)

module.exports = async params => {
  const payload = params
    .map((param, i) => `{ "command": ["get_property", "${param}"], "request_id": ${i} }`)
    .join('\n')

  const { stdout } = await exec(`echo '${payload}' | socat - /tmp/mpvsocket`)
  if (!stdout) {
    return null
  }

  const res = stdout.split('\n').reduce((acc, cur, i) => {
    if (!cur || !cur.includes('request_id')) {
      return acc
    }

    const json = JSON.parse(cur)
    acc[params[i]] = json.data
    return acc
  }, {})

  const out = params.map(name => res[name]).filter(f => f !== undefined)

  if (out.length !== params.length) {
    return null
  }

  return out
}
