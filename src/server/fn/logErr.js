// One-line error formatter for server logs. Keeps the actionable info
// (status, host, path, message) and drops the rest of the got/node noise.
const summarize = err => {
  if (!err) return 'unknown error'

  // got 11+ HTTPError. statusCode lives on err.response, request shape
  // on err.options. Body is parsed when responseType: 'json' was set.
  if (err.response && err.response.statusCode) {
    const u = err.options && err.options.url
    const host = u ? u.host : ''
    const path = u ? `${u.pathname}${u.search || ''}` : ''
    const method = (err.options && err.options.method) || 'GET'
    const body = err.response.body
    const apiMsg = body && body.error && body.error.message
    const tail = apiMsg || err.response.statusMessage || ''
    return `HTTP ${err.response.statusCode} ${method} ${host}${path} ${tail}`.trim()
  }

  // Network errors (ECONNREFUSED, ENOTFOUND, etc.)
  if (err.code && (err.hostname || err.host)) {
    return `${err.code} ${err.hostname || err.host}${err.port ? `:${err.port}` : ''}`
  }

  // Filesystem errors
  if (err.code && err.path) {
    return `${err.code} ${err.path}`
  }

  return err.message || String(err)
}

module.exports = (label, err) => {
  // eslint-disable-next-line no-console
  console.error(label ? `[${label}] ${summarize(err)}` : summarize(err))
}
