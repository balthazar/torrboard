const got = require('got')

const fields = [
  [
    'name',
    'total_size',
    'state',
    'progress',
    'download_payload_rate',
    'upload_payload_rate',
    'eta',
    'ratio',
    'time_added',
    'total_done',
    'total_uploaded',
  ],
  [],
]

const [DELUGE_PASS, DELUGE_HOST] = process.env.DELUGE.split('@')

const r = (body, headers = {}) => got.post(`${DELUGE_HOST}/json`, { body, json: true, headers })
const payload = (method, params) => ({ method, params, id: Date.now() })

const query = async (method, args) => {
  const pass = await r(payload('auth.login', [DELUGE_PASS]))
  if (!pass.body.result) {
    throw new Error('Unauthorized.')
  }

  const cookie = pass.headers['set-cookie']
  const res = await r(payload(method, args), { cookie })

  return res.body.result
}

query('web.update_ui', fields).then(console.log)

module.exports = () => query('web.update_ui', fields)
