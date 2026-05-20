const path = require('path')
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const cookieParser = require('cookie-parser')
const { ApolloServer } = require('@apollo/server')
const { expressMiddleware } = require('@as-integrations/express4')
const { makeExecutableSchema } = require('@graphql-tools/schema')
const { scheduleJob } = require('node-schedule')

const { __APIPORT__ } = require('../config')
const { typeDefs, resolvers, context } = require('./graphql')
const { applyDirectives } = require('./directives')
const logErr = require('./fn/logErr')
const refreshMediaInfos = require('./fn/refreshMediaInfos')
const downloadRSS = require('./fn/downloadRSS')
const healPosters = require('./fn/healPosters')

const MONGO_URL =
  process.env.NODE_ENV === 'production'
    ? process.env.MONGO_URL
    : 'mongodb://127.0.0.1:27018/torrboard'

mongoose.connect(MONGO_URL, { directConnection: true })

const start = async () => {
  const schema = applyDirectives(makeExecutableSchema({ typeDefs, resolvers }))

  const server = new ApolloServer({ schema })
  await server.start()

  const app = express()
  app.use(cookieParser())
  app.use(express.static(path.join(__dirname, '../../dist')))
  app.use('/statics', express.static(path.join(__dirname, '../statics')))

  // .torrent uploads come through as base64 inside a GraphQL variable, so the
  // default 100kb body-parser cap rejects anything but tiny single-file torrents.
  app.use(
    '/graphql',
    cors(),
    express.json({ limit: '20mb' }),
    expressMiddleware(server, { context }),
  )

  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../../dist/index.html')))

  app.listen(__APIPORT__, () => {
    console.log(`[TorrBoard API] Listening on ::${__APIPORT__} 🚀`) // eslint-disable-line no-console
  })
}

start().catch(err => logErr('start', err))

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

// Daily at 04:15, swap rotated/dead Amazon poster URLs for TMDB ones.
scheduleJob('15 4 * * *', safely('healPosters', () => healPosters()))
