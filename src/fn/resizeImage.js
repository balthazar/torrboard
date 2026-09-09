// Squares and shrinks a picked image in the browser before it is uploaded.
// Doing it here rather than on the server keeps a native image library (sharp
// and its build toolchain) out of the dependency tree, and means what crosses
// the wire is a few tens of KB instead of whatever came off a phone camera.
const SIZE = 256
const QUALITY = 0.85

export const AVATAR_MIME = 'image/jpeg'

const loadImage = file =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('That file is not an image.'))
      img.onload = () => resolve(img)
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })

export default async file => {
  const img = await loadImage(file)

  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE

  const ctx = canvas.getContext('2d')

  // Centre-crop to a square first, so a portrait photo keeps its subject
  // instead of being squashed into the circle.
  const side = Math.min(img.width, img.height)
  const sx = (img.width - side) / 2
  const sy = (img.height - side) / 2

  ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE)

  return canvas.toDataURL(AVATAR_MIME, QUALITY)
}
