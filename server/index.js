import { createApp } from './api.js'

const port = Number(process.env.PORT ?? 3000)
const app = createApp()

const server = app.listen(port, () => {
  console.log(`User API listening on http://localhost:${port}`)
})

function shutDown() {
  server.close(() => {
    process.exit(0)
  })
}

process.on('SIGINT', shutDown)
process.on('SIGTERM', shutDown)
