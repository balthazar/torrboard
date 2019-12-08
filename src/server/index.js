const express = require('express')
const mongoose = require('mongoose')
const { ApolloServer } = require('apollo-server-express')
const { scheduleJob } = require('node-schedule')
const cookieParser = require('cookie-parser')

const { __APIPORT__ } = require('../config')
const graphql = require('./graphql')
const refreshMediaInfos = require('./fn/refreshMediaInfos')
const downloadRSS = require('./fn/downloadRSS')

mongoose.Promise = Promise
mongoose.connect('mongodb://localhost/torrboard')

const server = new ApolloServer({ ...graphql, playground: false })

const app = express()

app.use(cookieParser())

server.applyMiddleware({ app })

app.listen(__APIPORT__, () => {
  console.log(`[TorrBoard API] Listening on ::${__APIPORT__} 🚀`) // eslint-disable-line no-console
})

// Every 2 minutes
scheduleJob('*/2 * * * *', () => {
  refreshMediaInfos()
  downloadRSS()
})
