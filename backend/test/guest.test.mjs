import test from 'node:test'
import assert from 'node:assert/strict'
import { createPlatform } from '../node/platform.mjs'
import { loadCore } from '../node/load-core.mjs'

function setup() {
  const now = new Date('2026-10-20T06:00:00Z')
  const { P, mails } = createPlatform({ clock: () => now })
  const core = loadCore(P)
  core.seedData('master@example.org')
  const call = (action, data = {}, token) => core.handle({ action, data, token })
  const ok = (r) => { assert.equal(r.ok, true, JSON.stringify(r)); return r.data }
  const bad = (r, code) => { assert.equal(r.ok, false, 'expected failure'); if (code) assert.equal(r.code, code, r.error); return r }
  return { P, mails, call, ok, bad }
}

const png = Buffer.from('89504e470d0a1a0a', 'hex').toString('base64')
const begin = (t, extra = {}) => t.call('apply.begin', { name: 'Asha K', phone: '98470 01234', agree: true, ...extra })

test('a guest can apply, submit and come back with mobile + application number or date of birth', () => {
  const t = setup()
  const s = t.ok(begin(t))
  assert.equal(s.via, 'guest')
  const load = t.ok(t.call('app.load', {}, s.token))
  assert.equal(load.consented, true)
  assert.equal(load.application.status, 'draft')
  assert.equal(load.limits.max_bytes, 2 * 1024 * 1024)

  t.ok(t.call('app.save', {
    id: load.application.id,
    applicant: { full_name: 'Asha K', dob: '2006-03-04', district: 'Malappuram', phone: '9847001234', guardian_name: 'K Ali', email: 'asha@example.org' },
    application: { course: 'BSc Physics', college: 'Govt College' },
  }, s.token))
  const sub = t.ok(t.call('app.submit', { id: load.application.id }, s.token))
  assert.match(sub.application_no, /\d/)

  // coming back later
  const a = t.ok(t.call('apply.lookup', { phone: '9847001234', application_no: sub.application_no.toLowerCase() }))
  assert.equal(a.via, 'guest')
  const b = t.ok(t.call('apply.lookup', { phone: '+91 98470 01234', dob: '2006-03-04' }))
  assert.ok(b.token)
  t.bad(t.call('apply.lookup', { phone: '9847001234', application_no: 'XX9999' }), 'NOT_FOUND')
  t.bad(t.call('apply.lookup', { phone: '9847001234', dob: '2001-01-01' }), 'NOT_FOUND')
  t.bad(t.call('apply.lookup', { phone: '9847001234' }), 'INVALID')

  // confirmation went to the contact email
  const queued = t.P.db.all('Outbox').filter((m) => m.to === 'asha@example.org')
  assert.equal(queued.length, 1)
})

test('one application per mobile number, and bad input is refused', () => {
  const t = setup()
  t.ok(begin(t))
  t.bad(begin(t), 'EXISTS')
  t.bad(t.call('apply.begin', { name: 'B', phone: '1234567890', agree: true }), 'INVALID')
  t.bad(t.call('apply.begin', { name: 'Bina', phone: '9847001299' }), 'INVALID') // no consent
  t.bad(t.call('apply.begin', { name: 'Bina', phone: '9847001299', agree: true, is_minor: true }), 'INVALID') // minor needs guardian
  t.ok(t.call('apply.begin', { name: 'Bina', phone: '9847001299', agree: true, is_minor: true, guardian_name: 'Parent' }))
})

test('a guest only reaches their own application and cannot use staff actions', () => {
  const t = setup()
  const a = t.ok(begin(t))
  const b = t.ok(t.call('apply.begin', { name: 'Bina', phone: '9847001299', agree: true }))
  const appA = t.ok(t.call('app.load', {}, a.token)).application
  t.bad(t.call('app.save', { id: appA.id, applicant: {}, application: { course: 'x' } }, b.token), 'NOT_FOUND')
  t.bad(t.call('admin.dashboard', {}, a.token), 'FORBIDDEN')
})

test('lookups are rate limited', () => {
  const t = setup()
  t.ok(begin(t))
  for (let i = 0; i < 6; i++) t.bad(t.call('apply.lookup', { phone: '9847001234', application_no: 'NOPE' + i }), 'NOT_FOUND')
  t.bad(t.call('apply.lookup', { phone: '9847001234', application_no: 'NOPE9' }), 'RATE')
})

test('upload limits: type, size, three files per document, remove and re-add', () => {
  const t = setup()
  const s = t.ok(begin(t))
  const load = t.ok(t.call('app.load', {}, s.token))
  assert.match(load.application.application_no, /^26\d{4}$/) // number is given at the start
  const type = load.doc_types[0]
  const up = (extra) => t.call('doc.upload', { application_id: load.application.id, doc_type_id: type.id, mime: 'image/png', data: png, ...extra }, s.token)
  t.bad(up({ mime: 'image/gif' }), 'INVALID')
  t.bad(up({ data: 'A'.repeat(3 * 1024 * 1024) }), 'INVALID')
  for (let i = 0; i < 3; i++) t.ok(up({}))
  t.bad(up({}), 'LIMIT') // a fourth file
  const docs = t.ok(t.call('app.load', {}, s.token)).docs
  assert.equal(docs.length, 3)
  assert.ok(docs[0].size > 0)
  t.ok(t.call('doc.remove', { id: docs[0].id }, s.token))
  assert.equal(t.ok(t.call('app.load', {}, s.token)).docs.length, 2)
  t.ok(up({})) // room again
})

test('numbers are given in order at the start and kept on submit', () => {
  const t = setup()
  const a = t.ok(begin(t))
  const b = t.ok(t.call('apply.begin', { name: 'Bina', phone: '9847001299', agree: true }))
  const na = t.ok(t.call('app.load', {}, a.token)).application.application_no
  const nb = t.ok(t.call('app.load', {}, b.token)).application.application_no
  assert.equal(Number(nb), Number(na) + 1)
  // a draft can be found again by mobile number + application number
  t.ok(t.call('apply.lookup', { phone: '9847001234', application_no: na }))
})
