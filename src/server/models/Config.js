const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  autoGrabs: [String],
  watched: [String],
  fetchedMedias: {},
})

module.exports = mongoose.model('Config', schema)
