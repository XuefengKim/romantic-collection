const express = require('express')
const cors = require('cors')
const errorHandler = require('./middlewares/errorHandler')
const authRoutes = require('./routes/authRoutes')
const coupleRoutes = require('./routes/coupleRoutes')
const homeRoutes = require('./routes/homeRoutes')
const collectionRoutes = require('./routes/collectionRoutes')

const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ code: 0, message: 'ok', data: { status: 'up' } })
})

app.use('/api/auth', authRoutes)
app.use('/api/couple', coupleRoutes)
app.use('/api/home', homeRoutes)
app.use('/api/collection', collectionRoutes)

app.use(errorHandler)

module.exports = app
