const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  name: String,
  password: String,
  email: { type: String, index: true, unique: true },

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
