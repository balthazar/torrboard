const path = require('path')
const express = require('express')
const jwt = require('jsonwebtoken')
const cors = require('cors')
const mongoose = require('mongoose')
const cookieParser = require('cookie-parser')
const { ApolloServer } = require('@apollo/server')
const { expressMiddleware } = require('@as-integrations/express4')
const { makeExecutableSchema } = require('@graphql-tools/schema')
const { scheduleJob } = require('node-schedule')

const { __APIPORT__ } = require('../config')
const { typeDefs, resolvers, context } = require('./graphql')
const Avatar = require('./models/Avatar')
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
  // Mounted twice on purpose. In production an nginx in front of this app owns
  // /statics and serves it from its own filesystem, so anything put there by a
  // deploy is invisible; /brand is forwarded through to us. The /statics mount
  // stays for local dev, where there is no proxy.
  const statics = express.static(path.join(__dirname, '../statics'))
  app.use('/statics', statics)
  app.use('/brand', statics)

  // Profile pictures live in mongo rather than on disk, so they need a route of
  // their own. It reads the same JWT the app already stores in a cookie, which
  // an <img> sends along same-origin for free: the pictures are the users' own
  // faces and this is a public URL, so they should not be world-readable.
  // Deliberately registered before the catch-all that serves index.html.
  app.get('/avatar/:name', async (req, res) => {
    try {
      jwt.verify(req.cookies.token, process.env.JWT_SECRET)
    } catch {
      return res.sendStatus(401)
    }

    try {
      // Not .lean(): the driver hands back a BSON Binary for a raw buffer
      // field, while a hydrated document casts it to an actual Buffer.
      const avatar = await Avatar.findOne({ user: req.params.name })
      if (!avatar || !avatar.data) {
        return res.sendStatus(404)
      }

      const etag = `"${avatar.updatedAt ? avatar.updatedAt.getTime() : 0}"`
      if (req.headers['if-none-match'] === etag) {
        return res.sendStatus(304)
      }

      res.set('Content-Type', avatar.mime)
      res.set('ETag', etag)
      // Revalidate every time: the URL is stable across replacements, so a
      // stale cached face would outlive the upload that replaced it.
      res.set('Cache-Control', 'private, max-age=0, must-revalidate')
      return res.send(avatar.data)
    } catch (err) {
      logErr('avatar', err)
      return res.sendStatus(500)
    }
  })

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
    console.log(`[bFlix API] Listening on ::${__APIPORT__} 🚀`) // eslint-disable-line no-console
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
