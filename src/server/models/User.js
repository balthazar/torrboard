const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  name: String,
  password: String,
  email: String,

  inviteCode: String,

  expires: Date,
  ips: [
    {
      value: String,
      lastSeen: Date,
    },
  ],
})

module.exports = mongoose.model('User', schema)
