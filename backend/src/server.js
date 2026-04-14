const env = require('./config/env')
const app = require('./app')

app.listen(env.port, () => {
  console.log(`[backend] server started at http://localhost:${env.port}`)
})
