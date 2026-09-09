// Avatars arrive base64-encoded inside a graphql variable (same shape as
// uploadTorrent) and get stored as a Buffer in mongo, so this is the only
// place standing between a caller and the bytes we later hand back with a
// Content-Type header. It validates rather than transforms: the browser has
// already resized to 256x256, and pulling in a native image library just to
// re-encode here is not worth the dependency.
const MAX_AVATAR_BYTES = 512 * 1024

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

// A claimed mime is only a claim. Each allowed type is paired with a check of
// the actual leading bytes so we never serve, say, HTML under image/jpeg.
const SIGNATURES = {
  'image/jpeg': buf => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  'image/png': buf => buf.length >= 8 && buf.subarray(0, 8).equals(PNG_MAGIC),
  'image/webp': buf =>
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buf.subarray(8, 12).toString('latin1') === 'WEBP',
}

const decodeAvatar = (filedump, mime) => {
  if (!filedump || typeof filedump !== 'string') {
    throw new Error('No image provided.')
  }

  const check = SIGNATURES[mime]
  if (!check) {
    throw new Error(`Unsupported image type: ${mime}. Use JPEG, PNG or WebP.`)
  }

  // canvas.toDataURL() yields "data:image/jpeg;base64,..."; accept either form.
  const base64 = filedump.replace(/^data:[^;,]*;base64,/, '')
  const data = Buffer.from(base64, 'base64')

  if (data.length > MAX_AVATAR_BYTES) {
    throw new Error(`Image too large: ${Math.round(data.length / 1024)}KB, max 512KB.`)
  }

  if (!check(data)) {
    throw new Error(`That is not a valid ${mime} image.`)
  }

  return { data, mime }
}

module.exports = { decodeAvatar, MAX_AVATAR_BYTES }
