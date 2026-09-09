// Set or clear a user's profile picture straight in mongo, for seeding a face
// without going through the settings UI. The image never enters the repo.
//
// Needs a tunnel to the database: `npm run db` in another shell.
//
// Usage:
//   node scripts/setAvatar.js <user> <path/to/image>   # set
//   node scripts/setAvatar.js <user> --clear           # remove
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')

const Avatar = require('../src/server/models/Avatar')
const User = require('../src/server/models/User')
const { decodeAvatar } = require('../src/server/fn/decodeAvatar')

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27018/torrboard'

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

const [, , name, source] = process.argv

if (!name || !source) {
  console.error('Usage: node scripts/setAvatar.js <user> <path/to/image|--clear>')
  process.exit(1)
}

;(async () => {
  await mongoose.connect(MONGO_URL, { directConnection: true })

  const user = await User.findOne({ name }).lean().exec()
  if (!user) {
    throw new Error(`No such user: ${name}`)
  }

  if (source === '--clear') {
    const { deletedCount } = await Avatar.deleteOne({ user: name })
    console.log(deletedCount ? `Cleared ${name}'s picture.` : `${name} had no picture.`)
  } else {
    const mime = MIME_BY_EXT[path.extname(source).toLowerCase()]
    if (!mime) {
      throw new Error(`Unsupported extension on ${source}. Use jpg, png or webp.`)
    }

    // Same validation the graphql mutation applies, so a file seeded here can
    // never be something the /avatar route would refuse to stand behind.
    const { data } = decodeAvatar(fs.readFileSync(source).toString('base64'), mime)
    const updatedAt = new Date()

    await Avatar.updateOne(
      { user: name },
      { $set: { data, mime, updatedAt } },
      { upsert: true },
    )

    console.log(`Set ${name}'s picture from ${source} (${Math.round(data.length / 1024)}KB).`)
  }

  await mongoose.disconnect()
  process.exit(0)
})().catch(err => {
  console.error(err.message)
  process.exit(1)
})
