const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  imdbID: { type: String, unique: true },

  title: String,
  tags: [String],
  plot: String,
  image: String,
  type: { type: String, enum: ['movie', 'series'] },
  rating: Number,
  year: String,
  torrents: [String],
})

module.exports = mongoose.model('MediaInfo', schema)
