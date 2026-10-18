import test from 'node:test'
import assert from 'node:assert/strict'
import { createPlatform } from '../node/platform.mjs'
import { loadCore } from '../node/load-core.mjs'

function setup(startAt = '2026-10-20T06:00:00Z') {
  let now = new Date(startAt)
  const { P, mails, tables } = createPlatform({ clock: () => now })
  const core = loadCore(P)
  core.seedData('master@example.org')
  const call = (action, data = {}, token) => core.handle({ action, data, token })
  const ok = (r) => { assert.equal(r.ok, true, JSON.stringify(r)); return r.data }
  const bad = (r, code) => { assert.equal(r.ok, false, 'expected failure'); if (code) assert.equal(r.code, code, r.error); return r }
  return { P, core, mails, tables, call, ok, bad, advance: (ms) => { now = new Date(now.getTime() + ms) } }
}

const png = Buffer.from('89504e470d0a1a0a', 'hex').toString('base64')

async function applicantSession(t, email = 'asha@example.org') {
  const reg = t.ok(t.call('auth.register', { email, password: 'correct horse', name: 'Asha K' }))
  assert.match(reg.dev_code, /^\d{6}$/)
  return t.ok(t.call('auth.verify', { email, code: reg.dev_code }))
}

test('master is created from the invite on first Google sign-in', () => {
  const t = setup()
  const s = t.ok(t.call('auth.google', { credential: 'dev:master@example.org|Master' }))
  assert.equal(s.user.role, 'master')
  assert.equal(s.via, 'google')
  t.bad(t.call('auth.google', { credential: 'garbage' }), 'AUTH')
})

test('password sign-up needs the emailed code; staff cannot use passwords', () => {
  const t = setup()
  const reg = t.ok(t.call('auth.register', { email: 'a@example.org', password: 'longenough', name: 'A' }))
  t.bad(t.call('auth.login', { email: 'a@example.org', password: 'longenough' }), 'LOGIN') // not verified yet
  t.bad(t.call('auth.verify', { email: 'a@example.org', code: '000000' }), 'CODE')
  const s = t.ok(t.call('auth.verify', { email: 'a@example.org', code: reg.dev_code }))
  assert.equal(s.user.role, 'applicant')
  t.ok(t.call('auth.login', { email: 'a@example.org', password: 'longenough' }))
  t.bad(t.call('auth.login', { email: 'a@example.org', password: 'wrongwrong' }), 'LOGIN')

  const m = t.ok(t.call('auth.google', { credential: 'dev:master@example.org|M' }))
  const reg2 = t.ok(t.call('auth.register', { email: 'master@example.org', password: 'longenough', name: 'M' }))
  t.ok(t.call('auth.verify', { email: 'master@example.org', code: reg2.dev_code }))
  t.bad(t.call('auth.login', { email: 'master@example.org', password: 'longenough' }), 'LOGIN')
  assert.ok(m.token)
})

test('forgot password issues a code and sets a new password', async () => {
  const t = setup()
  await applicantSession(t, 'b@example.org')
  const f = t.ok(t.call('auth.forgot', { email: 'b@example.org' }))
  t.ok(t.call('auth.reset', { email: 'b@example.org', code: f.dev_code, password: 'brand new pass' }))
  t.ok(t.call('auth.login', { email: 'b@example.org', password: 'brand new pass' }))
  const unknown = t.ok(t.call('auth.forgot', { email: 'nobody@example.org' }))
  assert.equal(unknown.dev_code, undefined) // same reply, no code, no account leak
})

test('login attempts are rate limited', () => {
  const t = setup()
  for (let i = 0; i < 8; i++) t.bad(t.call('auth.login', { email: 'x@example.org', password: 'wrongwrong' }), 'LOGIN')
  t.bad(t.call('auth.login', { email: 'x@example.org', password: 'wrongwrong' }), 'RATE')
})

test('tampered or missing tokens are rejected', () => {
  const t = setup()
  const s = t.ok(t.call('auth.google', { credential: 'dev:master@example.org|M' }))
  t.bad(t.call('me', {}, s.token + 'x'), 'AUTH')
  t.bad(t.call('me', {}), 'AUTH')
  t.ok(t.call('me', {}, s.token))
})

test('applicant journey: consent, draft, submit, upload, review loop', async () => {
  const t = setup()
  const a = await applicantSession(t)
  let d = t.ok(t.call('app.load', {}, a.token))
  assert.equal(d.consented, false)
  t.bad(t.call('consent.give', { is_minor: true }, a.token), 'INVALID') // guardian name required
  t.ok(t.call('consent.give', { is_minor: false, version: 'v1' }, a.token))

  const { id } = t.ok(t.call('app.start', {}, a.token))
  t.bad(t.call('app.start', {}, a.token), 'EXISTS')

  t.bad(t.call('app.submit', { id }, a.token), 'INCOMPLETE')
  t.bad(t.call('app.save', { id, applicant: { dob: 'not-a-date' } }, a.token), 'INVALID')
  t.ok(t.call('app.save', {
    id,
    applicant: { full_name: 'Asha K', gender: 'female', dob: '2005-04-03', district: 'Malappuram', phone: '9999999999', guardian_name: 'K Ali', family_income: '120000', role: 'master' },
    application: { course: 'BSc', college: 'Govt College', course_type: 'government', year_of_study: 2, status: 'selected', application_no: 'HACK' },
  }, a.token))
  d = t.ok(t.call('app.load', {}, a.token))
  assert.equal(d.application.status, 'draft') // status and number cannot be written through save
  assert.equal(d.application.application_no, '')
  assert.equal(d.applicant.family_income, 120000)

  const sub = t.ok(t.call('app.submit', { id }, a.token))
  assert.equal(sub.application_no, '260001')
  d = t.ok(t.call('app.load', {}, a.token))
  assert.equal(d.application.status, 'submitted')
  assert.equal(d.pending.length, 4)
  t.bad(t.call('app.save', { id, application: { course: 'MSc' } }, a.token), 'LOCKED')

  const ration = d.doc_types.find((x) => x.code === 'ration_card')
  t.bad(t.call('doc.upload', { application_id: id, doc_type_id: ration.id, mime: 'text/html', data: png }, a.token), 'INVALID')
  t.ok(t.call('doc.upload', { application_id: id, doc_type_id: ration.id, mime: 'image/png', data: png }, a.token))
  d = t.ok(t.call('app.load', {}, a.token))
  assert.equal(d.pending.length, 3)
  assert.equal(d.docs[0].status, 'under_review')

  // staff
  const m = t.ok(t.call('auth.google', { credential: 'dev:master@example.org|M' }))
  const list = t.ok(t.call('admin.apps', {}, m.token))
  assert.equal(list.rows[0].name, 'Asha K')
  const doc = t.ok(t.call('admin.app', { id }, m.token)).docs[0]
  const file = t.ok(t.call('admin.docfile', { id: doc.id }, m.token))
  assert.equal(file.data, png)
  t.bad(t.call('admin.review', { id: doc.id, decision: 'reupload', reason: '' }, m.token), 'INVALID')
  t.ok(t.call('admin.review', { id: doc.id, decision: 'reupload', reason: 'Photo is blurred' }, m.token))
  d = t.ok(t.call('app.load', {}, a.token))
  assert.equal(d.application.status, 'documents_requested')
  assert.equal(d.docs[0].reason, 'Photo is blurred')
  assert.ok(d.pending.some((p) => p.kind === 'reupload'))
  assert.ok(t.tables.Outbox.some((o) => o.kind === 'reupload'))

  t.ok(t.call('doc.upload', { application_id: id, doc_type_id: ration.id, mime: 'image/png', data: png }, a.token))
  d = t.ok(t.call('app.load', {}, a.token))
  assert.equal(d.docs[0].version, 2)
  // three other required documents are still open, so sending back is refused
  t.bad(t.call('app.resubmit', { id }, a.token), 'INCOMPLETE')

  // an applicant must not reach admin actions or another person's data
  t.bad(t.call('admin.apps', {}, a.token), 'FORBIDDEN')
  t.bad(t.call('admin.users', {}, a.token), 'FORBIDDEN')
  const other = await applicantSession(t, 'other@example.org')
  t.bad(t.call('doc.file', { id: doc.id }, other.token), 'NOT_FOUND')
  t.bad(t.call('app.save', { id, application: { course: 'x' } }, other.token), 'NOT_FOUND')
})

test('district scope limits what an admin can see', async () => {
  const t = setup()
  const a = await applicantSession(t)
  t.ok(t.call('consent.give', {}, a.token))
  const { id } = t.ok(t.call('app.start', {}, a.token))
  t.ok(t.call('app.save', { id, applicant: { district: 'Malappuram' }, application: { course: 'BA' } }, a.token))

  const m = t.ok(t.call('auth.google', { credential: 'dev:master@example.org|M' }))
  t.ok(t.call('admin.invite', { email: 'kannur@example.org', role: 'admin', district_scope: ['Kannur'] }, m.token))
  const k = t.ok(t.call('auth.google', { credential: 'dev:kannur@example.org|K' }))
  assert.equal(k.user.role, 'admin')
  assert.equal(t.ok(t.call('admin.apps', {}, k.token)).rows.length, 0)
  t.bad(t.call('admin.app', { id }, k.token), 'FORBIDDEN')
  t.bad(t.call('admin.users', {}, k.token), 'FORBIDDEN') // admin is not master
  assert.equal(t.ok(t.call('admin.apps', {}, m.token)).rows.length, 1)
})

test('there is always one active master', () => {
  const t = setup()
  const m = t.ok(t.call('auth.google', { credential: 'dev:master@example.org|M' }))
  t.bad(t.call('admin.userupdate', { id: m.user.id, active: false }, m.token), 'INVALID')
  t.bad(t.call('admin.userupdate', { id: m.user.id, role: 'admin' }, m.token), 'INVALID')
  t.ok(t.call('admin.invite', { email: 'second@example.org', role: 'master' }, m.token))
  const s = t.ok(t.call('auth.google', { credential: 'dev:second@example.org|S' }))
  t.ok(t.call('admin.userupdate', { id: m.user.id, active: false }, s.token))
  t.bad(t.call('me', {}, m.token), 'AUTH') // deactivated people are locked out immediately
})

test('reminders follow the schedule and flag for a phone call', async () => {
  const t = setup('2026-10-20T06:00:00Z') // 11:30 IST
  const a = await applicantSession(t)
  t.ok(t.call('consent.give', {}, a.token))
  const { id } = t.ok(t.call('app.start', {}, a.token))
  t.ok(t.call('app.save', { id, applicant: { full_name: 'A', dob: '2005-01-01', district: 'Kannur', phone: '1', guardian_name: 'G' }, application: { course: 'BA', college: 'C' } }, a.token))
  t.ok(t.call('app.submit', { id }, a.token)) // due in 7 days
  t.core.jobFlushOutbox()
  const base = t.mails.length

  t.advance(4 * 86400000) // 3 days before due
  assert.equal(t.core.jobReminders().queued, 4)
  assert.equal(t.core.jobReminders().queued, 0) // once per day
  t.core.jobFlushOutbox()
  assert.equal(t.mails.length, base + 4)

  t.advance(3 * 86400000) // due day
  assert.equal(t.core.jobReminders().queued, 4)
  for (let i = 0; i < 3; i++) { t.advance(3 * 86400000); assert.equal(t.core.jobReminders().queued, 4) }
  t.advance(3 * 86400000)
  assert.equal(t.core.jobReminders().queued, 0) // overdue reminders stop after three
  assert.ok(t.tables.Pending.every((p) => p.flag === 'call'))
})

test('no emails are sent at night', () => {
  const t = setup('2026-10-20T18:00:00Z') // 23:30 IST
  assert.equal(t.core.jobFlushOutbox().skipped, 'night')
})
