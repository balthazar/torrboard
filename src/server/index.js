const path = require('path')
const express = require('express')
const mongoose = require('mongoose')
const { ApolloServer } = require('apollo-server-express')
const { scheduleJob } = require('node-schedule')
const cookieParser = require('cookie-parser')

const { __APIPORT__ } = require('../config')
const graphql = require('./graphql')
const logErr = require('./fn/logErr')
const refreshMediaInfos = require('./fn/refreshMediaInfos')
const downloadRSS = require('./fn/downloadRSS')
const healPosters = require('./fn/healPosters')

const MONGO_URL =
  process.env.NODE_ENV === 'production'
    ? process.env.MONGO_URL
    : 'mongodb://127.0.0.1:27018/torrboard'

mongoose.Promise = Promise
mongoose.connect(MONGO_URL, {
  directConnection: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

const server = new ApolloServer({ ...graphql, playground: true })

const app = express()

app.use(cookieParser())
app.use(express.static(path.join(__dirname, '../../dist')))
app.use('/statics', express.static(path.join(__dirname, '../statics')))

server.applyMiddleware({ app })

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../../dist/index.html')))

app.listen(__APIPORT__, () => {
  console.log(`[TorrBoard API] Listening on ::${__APIPORT__} 🚀`) // eslint-disable-line no-console
})

// Last-resort handlers so a stray throw or rejection doesn't take down the api.
// Node's default behavior on unhandledRejection switched to "terminate" in v15,
// and node-schedule jobs are a common source of unobserved rejections.
process.on('unhandledRejection', err => logErr('unhandledRejection', err))
process.on('uncaughtException', err => logErr('uncaughtException', err))

const safely = (name, fn) => async () => {
  try {
    await fn()
  } catch (err) {
    logErr(name, err)
  }
}

// Every 2 minutes
scheduleJob('*/2 * * * *', async () => {
  await safely('refreshMediaInfos', refreshMediaInfos)()
  await safely('downloadRSS', downloadRSS)()
})

// Daily at 04:15 — swap rotated/dead Amazon poster URLs for TMDB ones.
scheduleJob('15 4 * * *', safely('healPosters', () => healPosters()))
