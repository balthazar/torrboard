const { test } = require('node:test')
const assert = require('node:assert')

const { decodeAvatar, MAX_AVATAR_BYTES } = require('./decodeAvatar')

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
const webp = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP'),
])

test('decodeAvatar accepts a bare base64 jpeg', () => {
  const res = decodeAvatar(jpeg.toString('base64'), 'image/jpeg')
  assert.equal(res.mime, 'image/jpeg')
  assert.ok(res.data.equals(jpeg))
})

test('decodeAvatar accepts png and webp', () => {
  assert.equal(decodeAvatar(png.toString('base64'), 'image/png').mime, 'image/png')
  assert.equal(decodeAvatar(webp.toString('base64'), 'image/webp').mime, 'image/webp')
})

test('decodeAvatar strips a data-url prefix, since canvas.toDataURL emits one', () => {
  const res = decodeAvatar(`data:image/jpeg;base64,${jpeg.toString('base64')}`, 'image/jpeg')
  assert.ok(res.data.equals(jpeg))
})

test('decodeAvatar rejects a mime outside the allowlist', () => {
  assert.throws(() => decodeAvatar(jpeg.toString('base64'), 'image/svg+xml'), /Unsupported/)
  assert.throws(() => decodeAvatar(jpeg.toString('base64'), 'text/html'), /Unsupported/)
})

// The mime arrives as a plain graphql variable, so a caller can claim anything.
// The magic bytes are the only thing that actually says what the payload is.
test('decodeAvatar rejects content whose magic bytes contradict the claimed mime', () => {
  assert.throws(() => decodeAvatar(png.toString('base64'), 'image/jpeg'), /not a valid/)
  assert.throws(() => decodeAvatar(jpeg.toString('base64'), 'image/png'), /not a valid/)
  const html = Buffer.from('<html><script>alert(1)</script>')
  assert.throws(() => decodeAvatar(html.toString('base64'), 'image/jpeg'), /not a valid/)
})

test('decodeAvatar rejects payloads over the cap', () => {
  const big = Buffer.concat([jpeg, Buffer.alloc(MAX_AVATAR_BYTES)])
  assert.throws(() => decodeAvatar(big.toString('base64'), 'image/jpeg'), /too large/)
})

test('decodeAvatar rejects empty or missing input', () => {
  assert.throws(() => decodeAvatar('', 'image/jpeg'), /No image/)
  assert.throws(() => decodeAvatar(null, 'image/jpeg'), /No image/)
  // Buffer.from ignores non-base64 characters rather than throwing, so garbage
  // decodes to too few bytes to carry a signature instead of raising.
  assert.throws(() => decodeAvatar('!!!!', 'image/jpeg'), /not a valid/)
})
