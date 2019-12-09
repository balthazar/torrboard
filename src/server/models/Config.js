const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  autoGrabs: [String],
  fetchedMedias: {},
})

module.exports = mongoose.model('Config', schema)
