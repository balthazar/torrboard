const mongoose = require('mongoose')

// Kept out of the User document on purpose: User is read on every authenticated
// request (and cached wholesale in auth.getUsers), so a few hundred KB of image
// bytes riding along on each of those would be wasteful. Keyed by user name
// rather than _id to match how the rest of the app addresses users.
const schema = new mongoose.Schema({
  user: { type: String, unique: true, index: true },
  data: Buffer,
  mime: String,
  updatedAt: Date,
})

module.exports = mongoose.model('Avatar', schema)
