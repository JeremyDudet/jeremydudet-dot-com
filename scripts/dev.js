#!/usr/bin/env node
const net = require('net')
const { spawn } = require('child_process')

function findOpenPort(start) {
  return new Promise((resolve) => {
    const tryPort = (port) => {
      const server = net.createServer()
      server.unref()
      server.once('error', () => tryPort(port + 1))
      server.listen(port, '0.0.0.0', () => {
        server.close(() => resolve(port))
      })
    }
    tryPort(start)
  })
}

const mode = process.argv[2] === 'start' ? 'start' : 'dev'
const forwarded = process.argv.slice(3)
const start = parseInt(process.env.PORT || '3000', 10)

findOpenPort(start).then((port) => {
  const child = spawn('next', [mode, '-p', String(port), ...forwarded], {
    stdio: 'inherit',
    env: { ...process.env, PORT: String(port) },
  })
  child.on('exit', (code) => process.exit(code ?? 0))
})
