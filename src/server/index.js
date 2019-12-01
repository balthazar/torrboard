const mongoose = require('mongoose')
const { ApolloServer } = require('apollo-server')
const { scheduleJob } = require('node-schedule')

const { __APIPORT__ } = require('../config')
const { schema, rootValue } = require('./graphql')
const refreshMediaInfos = require('./fn/refreshMediaInfos')

mongoose.Promise = Promise
mongoose.connect('mongodb://localhost/torrboard')

const server = new ApolloServer({ schema, rootValue, playground: false })

server.listen(__APIPORT__).then(() => {
  console.log(`[TorrBoard API] Listening on ::${__APIPORT__} 🚀`) // eslint-disable-line no-console
})

// Every 5 minutes
scheduleJob('*/5 * * * *', () => {
  refreshMediaInfos()
})
