// Local backend for development: the same code that runs in Google Apps Script, with data kept in
// backend/.devdata. No Google account needed. Start with: npm run backend:dev
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPlatform } from './platform.mjs'
import { loadCore } from './load-core.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.PORT || 8787)
const { P, mails } = createPlatform({ dir: path.join(here, '..', '.devdata'), config: { mailQuota: 100000 } })
const core = loadCore(P)
core.seedData('master@example.org')

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return res.writeHead(204, cors).end()
  if (req.method === 'GET') {
    if (req.url === '/__dev/mail') {
      return res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }).end(JSON.stringify(mails.slice(-20)))
    }
    return res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: true, dev: true }))
  }
  let raw = ''
  req.on('data', (c) => { raw += c; if (raw.length > 8e6) req.destroy() })
  req.on('end', () => {
    let out
    try {
      out = core.handle(JSON.parse(raw))
    } catch (e) {
      out = { ok: false, error: 'Bad request', code: 'BAD_REQUEST' }
    }
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }).end(JSON.stringify(out))
  })
}).listen(port, () => {
  console.log(`Dev backend on http://localhost:${port}`)
  console.log('Master admin for dev sign-in: master@example.org')
})

// Same schedule as the Google triggers, compressed for local use.
setInterval(() => { core.jobFlushOutbox(); core.jobReminders() }, 60_000).unref()
