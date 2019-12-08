const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  name: { type: String, unique: true },
  email: { type: String, index: true, unique: true },
  password: String,

  inviteCode: String,

  expires: Date,
  watched: [String],

  ips: [
    {
      value: String,
      lastSeen: Date,
    },
  ],
})

module.exports = mongoose.model('User', schema)
