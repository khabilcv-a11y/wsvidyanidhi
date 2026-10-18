// Local stand-in for Google Sheets, Drive and Gmail. Used by the dev server and the tests.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export function createPlatform({ dir = null, clock = () => new Date(), config = {} } = {}) {
  const tables = {}
  const mails = []
  const files = {}
  const cache = new Map()
  let secrets = {}
  const dbFile = dir ? path.join(dir, 'db.json') : null
  const fileDir = dir ? path.join(dir, 'files') : null

  if (dir) {
    fs.mkdirSync(fileDir, { recursive: true })
    if (fs.existsSync(dbFile)) {
      const saved = JSON.parse(fs.readFileSync(dbFile, 'utf8'))
      Object.assign(tables, saved.tables)
      secrets = saved.secrets || {}
    }
  }
  for (const k of ['SESSION_SECRET', 'PEPPER']) {
    if (!secrets[k]) secrets[k] = crypto.randomBytes(32).toString('hex')
  }
  const save = () => {
    if (dbFile) fs.writeFileSync(dbFile, JSON.stringify({ tables, secrets }, null, 1))
  }
  const rows = (name) => (tables[name] ??= [])
  const copy = (o) => JSON.parse(JSON.stringify(o))

  let mailQuota = config.mailQuota ?? 100

  const P = {
    isDev: true,
    now: clock,
    uuid: () => crypto.randomUUID(),
    secret: (k) => secrets[k],
    b64e: (s) => Buffer.from(s, 'utf8').toString('base64'),
    b64d: (s) => Buffer.from(s, 'base64').toString('utf8'),
    hmacB64: (key, msg) => crypto.createHmac('sha256', key).update(msg, 'utf8').digest('base64'),
    sha256B64: (s) => crypto.createHash('sha256').update(s, 'utf8').digest('base64'),
    randomCode: (n) => String(crypto.randomInt(0, 10 ** n)).padStart(n, '0'),
    log: (...a) => console.error('[backend]', ...a),
    lock: (fn) => fn(),
    cache: {
      get: (k) => cache.get(k) ?? null,
      put: (k, v) => void cache.set(k, v),
    },
    db: {
      all: (name) => copy(rows(name)),
      insert(name, obj) {
        rows(name).push(copy(obj))
        save()
      },
      update(name, id, patch) {
        const r = rows(name).find((x) => x.id === id)
        if (!r) throw new Error(`No ${name} row ${id}`)
        Object.assign(r, copy(patch))
        save()
      },
      remove(name, id) {
        tables[name] = rows(name).filter((x) => x.id !== id)
        save()
      },
    },
    mail: {
      quota: () => mailQuota - mails.length,
      send(to, subject, body) {
        mails.push({ at: clock().toISOString(), to, subject, body })
        console.log(`[mail] to ${to}: ${subject}`)
      },
    },
    files: {
      save(owner, name, mime, b64) {
        const id = crypto.randomUUID()
        files[id] = { mime, name }
        if (fileDir) fs.writeFileSync(path.join(fileDir, id), Buffer.from(b64, 'base64'))
        else files[id].data = b64
        return id
      },
      read(id, name, mime) {
        const f = files[id] ?? { mime, name }
        const data = fileDir ? fs.readFileSync(path.join(fileDir, id)).toString('base64') : files[id].data
        return { name: name || f.name, mime: mime || f.mime, data }
      },
    },
    // Dev sign-in: credential is "dev:email|Name". Real Google tokens are checked in gas/platform.gs.
    verifyGoogleIdToken(credential) {
      const m = /^dev:([^|]+)\|?(.*)$/.exec(String(credential || ''))
      if (!m) throw Object.assign(new Error('Google sign-in could not be verified.'), { code: 'AUTH' })
      return { email: m[1], name: m[2] || m[1].split('@')[0] }
    },
  }
  return { P, mails, tables }
}
