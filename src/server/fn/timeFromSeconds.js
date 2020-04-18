module.exports = sec => new Date(sec * 1e3).toISOString().substr(11, 8)
