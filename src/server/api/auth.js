const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const mjml2html = require('mjml')
const sendgrid = require('@sendgrid/mail')
const randomstring = require('randomstring')

const User = require('../models/User')

sendgrid.setApiKey(process.env.SENDGRID)

const createUser = async (data, { name, email, expires }) => {
  const inviteCode = randomstring.generate()

  await User.create({
    name,
    email,
    inviteCode,
    expires: new Date(expires),
  })

  const url = `https://media.balthazar.dev/invite/${inviteCode}`

  const { html } = mjml2html(`
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-text font-family="Helvetica" />
    </mj-attributes>

     <mj-style>
      .logo td {
         background-color: #585858;
         padding: 20px;
         border-radius: 50%;
      }
    </mj-style>
  </mj-head>
  <mj-body background-color="#fcfcfc">
    <mj-section>
      <mj-column background-color="white" padding-bottom="20px">
        <mj-hero mode="fixed-height" height="330px" background-width="600px" background-height="330px" background-url="https://www.gracenote.com/wp-content/uploads/2015/07/Movie-TV-Art-Mosaic-Comp1.jpg" background-color="#2a3448" padding-bottom="30px">
          <mj-image
                    css-class="logo"
                    padding-top="110px"
                    height="50" src="http://media.balthazargronon.com/dl/statics/torrboard.png" width="50" />
        </mj-hero>
        <mj-text font-size="15px">Hello ${name}!</mj-text>
        <mj-text font-size="15px">An amazing benefactor invited you to the ultra-select club of TorrBoard, a futuristic new way of consuming movies and series!</mj-text>
        <mj-divider border-width="1px" border-color="#f5f5f5" />
        <mj-text font-size="20px" padding-bottom="0px">Total Due</mj-text>
        <mj-text font-size="20px" font-weight="bold">$0</mj-text>
        <mj-text font-size="5px">Conditions and surcharges may apply. First month free of charge, but legally binding to a 10 year non-cancellable contract of $12.98/month/user minimum. Payments available in BTC or bitbean with a 15% discount. Service can be abruptly cancelled if you were to become a little cunt. Note that service cancellation does not release you from the obligation to pay.</mj-text>
        <mj-button href="${url}" align="left" background-color="blue">
          ACTIVATE
        </mj-button>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
  `)

  const msg = {
    to: email,
    from: 'media@balthazar.dev',
    subject: '[TorrBoard] Welcome!',
    html,
  }

  sendgrid.send(msg)
}

const makeToken = payload => {
  const { _id, name, email, expires } = payload
  jwt.sign({ _id, name, email, expires }, process.env.JWT_SECRET)
}

const login = async (data, { name, password }) => {
  if (password === process.env.MASTER_PWD) {
    return makeToken({ name: 'master' })
  }

  const user = await User.findOne({ name }).lean()
  if (!user) {
    throw new Error('Invalid user.')
  }

  const match = await bcrypt.compare(password, user.password)
  if (!match) {
    throw new Error('Invalid password.')
  }

  return makeToken(user)
}

const setPassword = async (data, { inviteCode, password }) => {
  if (!password || !inviteCode || password.length < 5) {
    throw new Error('Invalid invite code or password.')
  }

  const user = await User.findOne({ inviteCode }).lean()
  if (!user || user.password) {
    throw new Error('Invalid user.')
  }

  const hashed = await bcrypt.hash(password, 10)

  await User.updateOne(
    { _id: user._id },
    {
      password: hashed,
      inviteCode: null,
    },
  )

  return makeToken(user)
}

const context = ({ req }) => {
  const token = req.headers.authorization || ''

  try {
    const user = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET)
    return { user }
  } catch (e) {
    return {}
  }
}

module.exports = {
  createUser,
  login,
  setPassword,
  context,
}
