const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  autoGrabs: [String],
})

module.exports = mongoose.model('Config', schema)
