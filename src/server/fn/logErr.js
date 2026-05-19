// One-line error formatter for server logs. Keeps the actionable info
// (status, host, path, message) and drops the rest of the got/node noise.
const summarize = err => {
  if (!err) return 'unknown error'

  // got HTTP errors
  if (err.statusCode && err.host) {
    const apiMsg = err.body && err.body.error && err.body.error.message
    const tail = apiMsg || err.statusMessage || ''
    return `HTTP ${err.statusCode} ${err.method} ${err.host}${err.path} ${tail}`.trim()
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
