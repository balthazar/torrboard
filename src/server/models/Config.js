const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  autoGrabs: [String],
  fetchedMedias: {},
  omdbCooldownUntil: Number,
})

module.exports = mongoose.model('Config', schema)
