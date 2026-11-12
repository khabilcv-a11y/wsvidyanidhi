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
  // mobile number alone: only a masked status line, no session
  const only = t.ok(t.call('apply.lookup', { phone: '9847001234' }))
  assert.equal(only.limited, true)
  assert.equal(only.token, undefined)
  assert.equal(only.items[0].name, 'A*** K***')
  assert.match(only.items[0].application_no, /\*\*\*/)
  t.bad(t.call('apply.lookup', { phone: '9000000000' }), 'NOT_FOUND')
  t.bad(t.call('apply.lookup', {}), 'INVALID')

  // confirmation went to the contact email
  const queued = t.P.db.all('Outbox').filter((m) => m.to === 'asha@example.org')
  assert.equal(queued.length, 1)
})

test('one application per mobile number, and bad input is refused', () => {
  const t = setup()
  t.ok(begin(t))
  t.bad(begin(t), 'EXISTS')
  t.bad(t.call('apply.begin', { name: 'B', phone: '1234567890', agree: true }), 'INVALID')
  t.ok(t.call('apply.begin', { name: 'Bina', phone: '9847001299' }))
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
  assert.match(load.application.application_no, /^27\d{4}$/) // 2026-27 scheme: numbers start with 27
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

test('the application number and contact details are emailed at the start and again on submit', () => {
  const t = setup()
  const s = t.ok(t.call('apply.begin', { name: 'Asha K', phone: '9847001234', email: 'Asha@Example.org', agree: true }))
  const no = t.ok(t.call('app.load', {}, s.token)).application.application_no
  const first = t.mails.find((m) => m.to === 'asha@example.org')
  assert.ok(first, 'start email sent')
  assert.match(first.body, new RegExp(no))
  assert.match(first.body, /9847001234/)
  assert.match(first.body, /Check status/)
  t.bad(t.call('apply.begin', { name: 'Bina', phone: '9847001299', email: 'not-an-email', agree: true }), 'INVALID')
  const load = t.ok(t.call('app.load', {}, s.token))
  t.ok(t.call('app.save', { id: load.application.id, applicant: { full_name: 'Asha K', dob: '2006-03-04', district: 'Malappuram', phone: '9847001234', guardian_name: 'K Ali' }, application: { course: 'BSc', college: 'GC' } }, s.token))
  t.ok(t.call('app.submit', { id: load.application.id }, s.token))
  const queued = t.P.db.all('Outbox').filter((m) => m.to === 'asha@example.org')
  assert.equal(queued.length, 1)
  assert.match(queued[0].body, new RegExp(no))
})

test('an old database with the open "Scheme 2026" moves to 2026-27 and numbers start with 27', () => {
  const t = setup()
  // make it look like the first deployment
  t.P.db.all('Cycles').forEach((c) => t.P.db.remove('Cycles', c.id))
  t.P.db.insert('Cycles', { id: 'old', code: '26', name: 'Scheme 2026', year: 2026, is_open: true, closes_on: '', next_serial: 5 })
  const info = t.ok(t.call('public.info', {}))
  assert.equal(info.name, '2026–27')
  const s = t.ok(begin(t))
  assert.equal(t.ok(t.call('app.load', {}, s.token)).application.application_no, '270100')
  const old = t.P.db.all('Cycles').find((c) => c.id === 'old')
  assert.equal(old.is_open, false)
  assert.equal(old.name, '2025–26')
})

test('an old database with the first four document types moves to separate certificates', () => {
  const t = setup()
  t.P.db.all('DocTypes').forEach((d) => t.P.db.remove('DocTypes', d.id))
  ;[['qualification', 'application', true], ['fee_receipt', 'application', true], ['recommendation', 'application', true], ['ration_card', 'application', true]]
    .forEach(([code, stage, required], i) => t.P.db.insert('DocTypes', { id: 'old' + i, code, label_en: code, label_ml: '', stage, required, sort: i + 1, active: true }))
  const info = t.ok(t.call('public.info', {}))
  assert.deepEqual(info.doc_types.map((d) => d.label).sort(), ['Degree certificate (only if you have completed a degree)', 'Fee structure', 'Plus Two certificate', 'SSLC certificate', 'ration_card', 'recommendation'])
  const s = t.ok(begin(t))
  const load = t.ok(t.call('app.load', {}, s.token))
  assert.ok(load.doc_types.some((d) => d.code === 'recommendation' && d.stage === 'application'))
  assert.equal(load.doc_types.some((d) => d.code === 'qualification'), false)
  const sub = t.ok(t.call('app.save', { id: load.application.id, applicant: { full_name: 'Asha K', dob: '2006-03-04', district: 'Malappuram', phone: '9847001234', guardian_name: 'K Ali' }, application: { course: 'BSc', college: 'GC' } }, s.token))
  assert.ok(sub)
  t.ok(t.call('app.submit', { id: load.application.id }, s.token))
  const pending = t.ok(t.call('app.load', {}, s.token)).pending.map((p) => p.title).sort()
  assert.deepEqual(pending, ['Fee structure', 'Plus Two certificate', 'SSLC certificate', 'recommendation'])
})

test('people can ask to be told when applications open, and are emailed when a scheme year opens', () => {
  const t = setup()
  t.bad(t.call('public.subscribe', { name: 'A', phone: '9847001234' }), 'INVALID')
  t.bad(t.call('public.subscribe', { name: 'Asha', phone: '12345' }), 'INVALID')
  t.ok(t.call('public.subscribe', { name: 'Asha', phone: '98470 01234', email: 'asha@example.org' }))
  t.ok(t.call('public.subscribe', { name: 'Bina', phone: '9847001299' }))
  assert.equal(t.ok(t.call('public.subscribe', { name: 'Asha K', phone: '9847001234' })).already, true) // same number: updated, not doubled
  const m = t.ok(t.call('auth.google', { credential: 'dev:master@example.org|M' }))
  const list = t.ok(t.call('admin.subscribers', {}, m.token))
  assert.equal(list.rows.length, 2)
  const cycles = t.ok(t.call('admin.cycles', {}, m.token)).cycles
  const closed = cycles.find((c) => !c.is_open)
  const r = t.ok(t.call('admin.cycle.save', { id: closed.id, is_open: true }, m.token))
  assert.equal(r.subscribers_emailed, 1)
  assert.equal(t.P.db.all('Outbox').filter((o) => o.to === 'asha@example.org' && o.kind === 'applications_open').length, 1)
  assert.equal(t.ok(t.call('admin.subscribers.notify', {}, m.token)).queued, 0) // nobody is emailed twice
})

test('a database where the recommendation letter was moved to "later" asks for it while applying again', () => {
  const t = setup()
  const reco = t.P.db.all('DocTypes').find((d) => d.code === 'recommendation')
  t.P.db.update('DocTypes', reco.id, { stage: 'later' })
  const info = t.ok(t.call('public.info', {}))
  assert.ok(info.doc_types.some((d) => d.label === 'Recommendation letter'))
  const s = t.ok(begin(t))
  const load = t.ok(t.call('app.load', {}, s.token))
  t.ok(t.call('app.save', { id: load.application.id, applicant: {}, application: { referred_by: 'K Ali', referrer_designation: 'Shakha Secretary', referrer_shakha: 'Town', referrer_mandalam: 'North', referrer_zone: 'Malappuram', referrer_contact: '9895000000' } }, s.token))
  const again = t.ok(t.call('app.load', {}, s.token)).application
  assert.equal(again.referrer_shakha, 'Town')
  assert.equal(again.referrer_mandalam, 'North')
})
