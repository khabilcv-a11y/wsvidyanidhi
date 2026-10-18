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
  const google = (email, name = 'X') => ok(call('auth.google', { credential: `dev:${email}|${name}` }))
  return { P, core, mails, tables, call, ok, bad, google, advance: (ms) => { now = new Date(now.getTime() + ms) } }
}

const png = Buffer.from('89504e470d0a1a0a', 'hex').toString('base64')

// A submitted application for a new applicant. Returns tokens and ids.
function submittedApplicant(t, email, extra = {}) {
  const s = t.google(email, extra.name || 'Asha K')
  t.ok(t.call('consent.give', {}, s.token))
  const { id } = t.ok(t.call('app.start', {}, s.token))
  t.ok(t.call('app.save', {
    id,
    applicant: { full_name: extra.name || 'Asha K', dob: '2005-04-03', district: extra.district || 'Malappuram', phone: extra.phone || '9876543210', guardian_name: 'G', gender: 'female' },
    application: { course: 'BSc', college: 'Govt College', category: 'ug', completion_month: extra.completion_month || '2027-03', stream: 'Medical' },
  }, s.token))
  const { application_no } = t.ok(t.call('app.submit', { id }, s.token))
  return { token: s.token, id, application_no }
}

const goodBank = { holder: 'Asha K', account_no: '123456789012', account_no2: '123456789012', bank: 'SBI', ifsc: 'sbin0000123', branch: 'Calicut' }

test('verification: assign, limited view for the verifier, submit, review', () => {
  const t = setup()
  const m = t.google('master@example.org', 'M')
  const a = submittedApplicant(t, 'a@example.org')
  t.ok(t.call('admin.invite', { email: 'v1@example.org', role: 'verifier' }, m.token))
  t.ok(t.call('admin.invite', { email: 'v2@example.org', role: 'verifier' }, m.token))
  const v1 = t.google('v1@example.org', 'Verifier One')
  const v2 = t.google('v2@example.org', 'Verifier Two')
  const verifiers = t.ok(t.call('admin.verifiers', {}, m.token)).verifiers
  assert.equal(verifiers.length, 2)

  t.bad(t.call('admin.verify.assign', { application_id: a.id, verifier_id: a.id }, m.token), 'INVALID') // not a verifier
  t.ok(t.call('admin.verify.assign', { application_id: a.id, verifier_id: v1.user.id }, m.token))
  assert.equal(t.tables.Applications[0].status, 'under_verification')

  assert.equal(t.ok(t.call('verify.mine', {}, v2.token)).visits.length, 0)
  const visits = t.ok(t.call('verify.mine', {}, v1.token)).visits
  assert.equal(visits.length, 1)
  t.bad(t.call('verify.get', { id: visits[0].id }, v2.token), 'NOT_FOUND')

  const got = t.ok(t.call('verify.get', { id: visits[0].id }, v1.token))
  assert.deepEqual(Object.keys(got.student).sort(), ['address', 'application_no', 'district', 'guardian_name', 'guardian_occupation', 'guardian_phone', 'name', 'phone'])
  assert.ok(got.wisdom_districts.includes('Calicut North'))

  t.bad(t.call('verify.submit', { id: visits[0].id, fields: { house: 'own' } }, v1.token), 'INCOMPLETE')
  t.bad(t.call('verify.submit', { id: visits[0].id, fields: { house: 'castle' } }, v1.token), 'INVALID')
  t.ok(t.call('verify.submit', {
    id: visits[0].id,
    fields: { guardian_ok: true, house: 'rent', fin_condition: 'very_poor', zakat_eligible: 'yes', category: 'yatheem', wisdom_connection: 'supporter', remarks: 'Father deceased', wisdom_district: 'Malappuram East' },
  }, v1.token))
  const detail = t.ok(t.call('admin.app', { id: a.id }, m.token))
  assert.equal(detail.verifications[0].status, 'submitted')
  assert.equal(detail.verifications[0].verifier, 'Verifier One')
  assert.equal(detail.application.wisdom_district, 'Malappuram East')
  t.ok(t.call('admin.verify.review', { id: detail.verifications[0].id }, m.token))

  t.bad(t.call('admin.apps', {}, v1.token), 'FORBIDDEN') // verifiers have no committee access
  t.bad(t.call('verify.mine', {}, a.token), 'FORBIDDEN')
})

test('interview score sheet, privacy of grades, and the decision', () => {
  const t = setup()
  const m = t.google('master@example.org', 'M')
  const a = submittedApplicant(t, 'a@example.org')
  t.ok(t.call('admin.invite', { email: 'panel@example.org', role: 'admin' }, m.token))
  const p = t.google('panel@example.org', 'Panel')

  t.bad(t.call('interview.save', { application_id: a.id, scores: { zakat: 'king' } }, p.token), 'INVALID')
  t.bad(t.call('interview.save', { application_id: a.id, scores: { education: 11 } }, p.token), 'INVALID')
  t.bad(t.call('interview.save', { application_id: a.id, grade: 'Z' }, p.token), 'INVALID')
  const r = t.ok(t.call('interview.save', {
    application_id: a.id, scores: { zakat: 'yatheem', family: 'very_poor', ration: 'yellow', parttime: 'no', education: 8, fee: 'above_1l', org: 'unit' },
    grade: 'A+', recommended_amount: 1500, fund_type: 'zakat', remarks: 'Good', total: 999,
  }, p.token))
  assert.equal(r.total, 13 + 20 + 5 + 0 + 8 + 4 + 5) // computed on the server, a client total is ignored
  t.ok(t.call('interview.save', { application_id: a.id, scores: { zakat: 'miskeen' } }, m.token)) // a second interviewer

  const detail = t.ok(t.call('admin.app', { id: a.id }, m.token))
  assert.equal(detail.interviews.length, 2)
  assert.equal(detail.application.status, 'decision_pending')

  const mine = t.ok(t.call('app.load', {}, a.token))
  for (const k of ['grade', 'score', 'fund_type', 'status_note', 'wisdom_district']) assert.equal(k in mine.application, false, k + ' must not reach the applicant')
  assert.equal('monthly_amount' in mine.application, false)

  t.bad(t.call('admin.decide', { application_id: a.id, decision: 'selected', amount: 1500, fund_type: 'zakat' }, p.token), 'FORBIDDEN')
  t.bad(t.call('admin.decide', { application_id: a.id, decision: 'selected', fund_type: 'zakat' }, m.token), 'INVALID')
  t.bad(t.call('admin.decide', { application_id: a.id, decision: 'selected', amount: 1500 }, m.token), 'INVALID')
  t.ok(t.call('admin.decide', { application_id: a.id, decision: 'selected', amount: 1500, fund_type: 'zakat' }, m.token))
  const after = t.ok(t.call('app.load', {}, a.token))
  assert.equal(after.application.status, 'selected')
  assert.equal(after.application.monthly_amount, 1500)
  assert.ok(after.pending.some((x) => x.kind === 'bank'))
  assert.ok(t.tables.Outbox.some((o) => o.kind === 'selected'))
  assert.ok(t.ok(t.call('admin.app', { id: a.id }, m.token)).revisions.some((x) => x.field === 'monthly_amount'))
})

test('amount and status changes need a reason and are kept in the history', () => {
  const t = setup()
  const m = t.google('master@example.org', 'M')
  const a = submittedApplicant(t, 'a@example.org')
  t.bad(t.call('admin.status', { id: a.id, status: 'on_hold' }, m.token), 'INVALID')
  t.ok(t.call('admin.status', { id: a.id, status: 'on_hold', reason: 'Results awaited' }, m.token))
  t.bad(t.call('admin.amount', { id: a.id, monthly_amount: 2000 }, m.token), 'INVALID')
  t.ok(t.call('admin.amount', { id: a.id, monthly_amount: 2000, reason: 'Fee increase' }, m.token))
  const rev = t.ok(t.call('admin.app', { id: a.id }, m.token)).revisions
  assert.ok(rev.some((x) => x.field === 'status' && x.new_value === 'on_hold' && x.reason === 'Results awaited'))
  assert.ok(rev.some((x) => x.field === 'monthly_amount' && x.new_value === '2000'))
  // corrections keep the old value
  t.ok(t.call('admin.app.edit', { id: a.id, application: { college: 'New College' }, reason: 'Typo' }, m.token))
  assert.ok(t.ok(t.call('admin.app', { id: a.id }, m.token)).revisions.some((x) => x.field === 'college' && x.old_value === 'Govt College'))
})

test('bank details: validation, masking, finance permission, locking', () => {
  const t = setup()
  const m = t.google('master@example.org', 'M')
  const a = submittedApplicant(t, 'a@example.org')
  t.bad(t.call('bank.save', goodBank, a.token), 'LOCKED') // not selected yet
  t.ok(t.call('admin.decide', { application_id: a.id, decision: 'selected', amount: 1500, fund_type: 'zakat' }, m.token))

  t.bad(t.call('bank.save', { ...goodBank, account_no2: '999' }, a.token), 'INVALID')
  t.bad(t.call('bank.save', { ...goodBank, account_no: '2.09E14', account_no2: '2.09E14' }, a.token), 'INVALID')
  t.bad(t.call('bank.save', { ...goodBank, ifsc: 'BAD' }, a.token), 'INVALID')
  t.ok(t.call('bank.save', goodBank, a.token))
  const mine = t.ok(t.call('bank.get', {}, a.token)).bank
  assert.equal(mine.account_no, '•••• 9012')
  assert.equal(mine.ifsc, 'SBIN0000123')

  t.ok(t.call('admin.invite', { email: 'adm@example.org', role: 'admin' }, m.token))
  const adm = t.google('adm@example.org', 'Adm')
  t.bad(t.call('admin.bank.get', { application_id: a.id }, adm.token), 'FORBIDDEN')
  t.bad(t.call('pay.batches', {}, adm.token), 'FORBIDDEN')
  assert.equal(t.ok(t.call('admin.bank.get', { application_id: a.id }, m.token)).bank.account_no, '123456789012')
  assert.ok(t.tables.Audit.some((x) => x.action === 'bank.viewed'))

  t.bad(t.call('admin.bank.verify', { application_id: a.id, decision: 'reject' }, m.token), 'INVALID') // needs a note
  t.ok(t.call('admin.bank.verify', { application_id: a.id, decision: 'verify' }, m.token))
  assert.equal(t.ok(t.call('app.load', {}, a.token)).application.status, 'active')
  t.bad(t.call('bank.save', goodBank, a.token), 'LOCKED')
  t.ok(t.call('bank.change', { note: 'Changed bank' }, a.token))
  t.ok(t.call('bank.save', { ...goodBank, account_no: '555555555555', account_no2: '555555555555' }, a.token))
})

test('payments: months stop at the course end, batch, export, paid and failed, retry', () => {
  const t = setup()
  const m = t.google('master@example.org', 'M')
  const full = submittedApplicant(t, 'full@example.org', { name: 'Full Year', completion_month: '2028-03' })
  const ending = submittedApplicant(t, 'end@example.org', { name: 'Ends Soon', completion_month: '2026-09' })
  const unbanked = submittedApplicant(t, 'nobank@example.org', { name: 'No Bank' })
  for (const s of [full, ending, unbanked]) t.ok(t.call('admin.decide', { application_id: s.id, decision: 'selected', amount: 1500, fund_type: 'zakat' }, m.token))
  for (const s of [full, ending]) {
    t.ok(t.call('bank.save', goodBank, s.token))
    t.ok(t.call('admin.bank.verify', { application_id: s.id, decision: 'verify' }, m.token))
  }

  const el = t.ok(t.call('pay.eligible', { start_month: '2026-07', months: 6 }, m.token))
  const byName = Object.fromEntries(el.rows.map((r) => [r.name, r]))
  assert.equal(byName['Full Year'].amount, 9000)
  assert.equal(byName['Ends Soon'].months, 3) // July, August, September
  assert.equal(byName['Ends Soon'].amount, 4500)
  assert.equal(byName['No Bank'], undefined) // selected but bank details not verified yet, so not an active scholar

  const batch = t.ok(t.call('pay.create', { name: 'Jul-Dec 2026', start_month: '2026-07', months: 6 }, m.token))
  assert.equal(batch.count, 2)
  assert.equal(batch.total, 13500)
  assert.match(t.ok(t.call('pay.eligible', { start_month: '2026-07', months: 6 }, m.token)).rows.find((r) => r.name === 'Full Year').reason, /Already in a payment/)

  const csv = t.ok(t.call('pay.export', { id: batch.id }, m.token)).csv
  assert.match(csv, /"123456789012"/) // plain digits, never scientific notation
  assert.match(csv, /"SBIN0000123"/)

  const items = t.ok(t.call('pay.batch', { id: batch.id }, m.token)).items
  t.ok(t.call('pay.mark', { ids: [items[0].id], status: 'paid', reference: 'UTR1' }, m.token))
  t.ok(t.call('pay.mark', { ids: [items[1].id], status: 'failed' }, m.token))
  const sum = t.ok(t.call('pay.batches', {}, m.token)).batches[0]
  assert.equal(sum.failed, 1)
  assert.ok(sum.paid > 0)
  const retry = t.ok(t.call('pay.retry', { batch_id: batch.id }, m.token))
  assert.equal(retry.count, 1)
  assert.equal(t.ok(t.call('report.summary', {}, m.token)).payments.failed, 1)
})

test('events: invite, reply, check-in tokens, walk-in, absentees', () => {
  const t = setup()
  const m = t.google('master@example.org', 'M')
  const a = submittedApplicant(t, 'a@example.org', { name: 'Alpha' })
  const b = submittedApplicant(t, 'b@example.org', { name: 'Beta' })
  const c = submittedApplicant(t, 'c@example.org', { name: 'Gamma' })
  const { id: eventId } = t.ok(t.call('event.save', { name: 'State Meet', date: '2026-11-05', venue: 'Calicut', mode: 'hybrid', kind: 'both', status: 'open' }, m.token))
  t.bad(t.call('event.save', { name: '' }, m.token), 'INVALID')
  t.bad(t.call('event.invite', { event_id: eventId }, m.token), 'INVALID') // must choose who
  const inv = t.ok(t.call('event.invite', { event_id: eventId, filter: { status: 'submitted' } }, m.token))
  assert.equal(inv.created, 3)
  assert.equal(t.ok(t.call('event.invite', { event_id: eventId, filter: { status: 'submitted' } }, m.token)).created, 0) // no duplicates
  assert.ok(t.tables.Outbox.filter((o) => o.kind === 'invitation').length === 3)

  const mine = t.ok(t.call('invite.mine', {}, a.token)).invitations[0]
  assert.equal(mine.event.name, 'State Meet')
  t.bad(t.call('invite.reply', { id: mine.id, reply: 'not_attending' }, a.token), 'INVALID') // reason needed
  t.ok(t.call('invite.reply', { id: mine.id, reply: 'attending', arrival_time: '09:30', transport: 'bus', companions: 1, companion_names: 'Mother' }, a.token))
  const mineB = t.ok(t.call('invite.mine', {}, b.token)).invitations[0]
  t.ok(t.call('invite.reply', { id: mineB.id, reply: 'not_attending', reason: 'difficult_to_travel' }, b.token))
  t.bad(t.call('invite.reply', { id: mine.id, reply: 'attending' }, b.token), 'NOT_FOUND') // someone else's invitation

  let ev = t.ok(t.call('event.get', { id: eventId }, m.token))
  assert.deepEqual({ ...ev.counts }, { invited: 3, attending: 1, online: 0, not_attending: 1, no_reply: 1, present: 0 })

  const found = t.ok(t.call('event.search', { event_id: eventId, q: 'alp' }, m.token)).rows
  assert.equal(found.length, 1)
  const t1 = t.ok(t.call('event.checkin', { id: found[0].id }, m.token))
  assert.equal(t1.token, 1)
  assert.equal(t.ok(t.call('event.checkin', { id: found[0].id }, m.token)).already, true)
  const walk = t.ok(t.call('event.walkin', { event_id: eventId, application_id: c.id }, m.token))
  assert.equal(walk.token, 2)

  ev = t.ok(t.call('event.get', { id: eventId }, m.token))
  assert.equal(ev.counts.present, 2)
  const abs = t.ok(t.call('event.absentees', { id: eventId }, m.token)).absentees
  assert.deepEqual(abs.map((x) => x.name), ['Beta'])
  assert.equal(abs[0].reason, 'difficult_to_travel')
  t.ok(t.call('event.mark', { id: abs[0].id, absent_reason: 'Exam', interview_status: 'rescheduled' }, m.token))

  t.ok(t.call('event.save', { id: eventId, name: 'State Meet', date: '2026-11-05', status: 'closed' }, m.token))
  t.bad(t.call('invite.reply', { id: mine.id, reply: 'online' }, a.token), 'LOCKED')
})

test('renewals: open, scholar update with documents, committee decisions', () => {
  const t = setup()
  const m = t.google('master@example.org', 'M')
  const a = submittedApplicant(t, 'a@example.org')
  t.ok(t.call('admin.decide', { application_id: a.id, decision: 'selected', amount: 1000, fund_type: 'non_zakat' }, m.token))
  t.ok(t.call('bank.save', goodBank, a.token))
  t.ok(t.call('admin.bank.verify', { application_id: a.id, decision: 'verify' }, m.token))

  assert.equal(t.ok(t.call('renewal.open', { period: '2027-H1' }, m.token)).created, 1)
  assert.equal(t.ok(t.call('renewal.open', { period: '2027-H1' }, m.token)).created, 0)
  const st = t.ok(t.call('renewal.mine', {}, a.token))
  const r = st.renewals[0]
  assert.equal(r.status, 'open')
  assert.equal(st.doc_types.length, 2)

  t.bad(t.call('renewal.submit', { id: r.id, fields: { current_year: 3, completion_month: '2028-03' } }, a.token), 'INCOMPLETE') // no documents yet
  for (const type of st.doc_types) t.ok(t.call('doc.upload', { application_id: a.id, renewal_id: r.id, doc_type_id: type.id, mime: 'image/png', data: png }, a.token))
  const appType = t.ok(t.call('app.load', {}, a.token)).doc_types[0]
  t.bad(t.call('doc.upload', { application_id: a.id, renewal_id: r.id, doc_type_id: appType.id, mime: 'image/png', data: png }, a.token), 'INVALID') // wrong kind of document
  t.ok(t.call('renewal.submit', { id: r.id, fields: { current_year: 3, completion_month: '2028-03', result_percentage: 82, last_exam: 'Semester 4' } }, a.token))

  const list = t.ok(t.call('renewal.list', { period: '2027-H1' }, m.token)).rows
  assert.equal(list[0].status, 'submitted')
  t.bad(t.call('renewal.decide', { id: r.id, decision: 'continue_increase', new_amount: 900 }, m.token), 'INVALID') // must be higher
  t.bad(t.call('renewal.decide', { id: r.id, decision: 'on_hold' }, m.token), 'INVALID') // remark needed
  t.ok(t.call('renewal.decide', { id: r.id, decision: 'file_missing', remarks: 'Result is blurred' }, m.token))
  assert.equal(t.ok(t.call('app.load', {}, a.token)).application.status, 'renewal_review')
  t.ok(t.call('renewal.decide', { id: r.id, decision: 'continue_increase', new_amount: 1500, remarks: 'Fee rose' }, m.token))
  const done = t.ok(t.call('app.load', {}, a.token)).application
  assert.equal(done.status, 'active')
  assert.equal(done.monthly_amount, 1500)
  assert.equal(done.year_of_study, 3)
  assert.equal(done.completion_month, '2028-03')
  assert.ok(t.ok(t.call('admin.app', { id: a.id }, m.token)).revisions.some((x) => x.field === 'monthly_amount' && x.new_value === '1500'))
})

test('import and claiming of existing records', () => {
  const t = setup()
  const m = t.google('master@example.org', 'M')
  const rows = [
    { application_no: '230001', scheme_year: 2023, name: 'Old Scholar', gender: 'female', mobile: '9446000001', district: 'Kozhikode', guardian_name: 'G', course: 'MBBS', stream: 'Medical', category: 'ug', year_of_study: 3, completion_month: '2027-06', college: 'MCH', monthly_amount: 1500, fund_type: 'zakat', status: 'active' },
    { application_no: '250002', scheme_year: 2025, name: 'Second', gender: 'male', mobile: '9446000002', district: 'Malappuram', course: 'BTech', stream: 'Engineering', category: 'ug', monthly_amount: 1000, fund_type: 'non_zakat' },
    { application_no: '', name: 'No Number' },
    { application_no: '250003', scheme_year: 2025, name: 'Bad Amount', monthly_amount: -5 },
  ]
  let r = t.ok(t.call('admin.import', { kind: 'people', rows }, m.token))
  assert.equal(r.created, 2)
  assert.equal(r.skipped.length, 2)
  r = t.ok(t.call('admin.import', { kind: 'people', rows }, m.token))
  assert.equal(r.created, 0) // importing again is harmless
  assert.ok(t.tables.Cycles.some((c) => c.year === 2023))

  const bank = t.ok(t.call('admin.import', { kind: 'bank', rows: [
    { application_no: '230001', holder: 'Old Scholar', account_no: '123456789012', bank: 'SBI', ifsc: 'SBIN0000123', branch: 'X' },
    { application_no: '250002', holder: 'Second', account_no: '2.0910400023599E14', bank: 'SBI', ifsc: 'SBIN0000123' },
  ] }, m.token))
  assert.equal(bank.created, 1)
  assert.match(bank.skipped[0].reason, /plain/)

  t.bad(t.call('admin.import', { kind: 'people', rows: [] }, m.token), 'INVALID')

  // an admin prepares the link by email; signing in with that email connects the record
  const list = t.ok(t.call('admin.apps', {}, m.token)).rows
  const rec = list.find((x) => x.application_no === '230001')
  assert.equal(rec.legacy, true)
  t.ok(t.call('admin.legacy.email', { application_id: rec.id, email: 'old.scholar@example.org' }, m.token))
  const s = t.google('old.scholar@example.org', 'Old Scholar')
  const mine = t.ok(t.call('app.load', {}, s.token))
  assert.equal(mine.application.application_no, '230001')
  assert.equal(mine.application.status, 'active')
  assert.equal(mine.application.monthly_amount, 1000 + 500)
  assert.equal(t.tables.Users.filter((u) => u.email === '').length, 1) // the other placeholder remains

  // a second scholar asks to claim by number and mobile; an admin approves
  const s2 = t.google('second@example.org', 'Second')
  t.bad(t.call('claim.request', { application_no: '250002', mobile: '123' }, s2.token), 'INVALID')
  t.ok(t.call('claim.request', { application_no: '250002', mobile: '9446000002' }, s2.token))
  t.bad(t.call('claim.request', { application_no: '250002', mobile: '9446000002' }, s2.token), 'EXISTS')
  const claims = t.ok(t.call('admin.claims', {}, m.token)).claims
  assert.equal(claims.length, 1)
  assert.equal(claims[0].mobile_matches, true)
  t.ok(t.call('admin.claim.decide', { id: claims[0].id, decision: 'approve' }, m.token))
  assert.equal(t.ok(t.call('app.load', {}, s2.token)).application.application_no, '250002')
  assert.equal(t.tables.Users.filter((u) => u.email === '').length, 0)
})

test('reports count scholars by district and scheme year', () => {
  const t = setup()
  const m = t.google('master@example.org', 'M')
  t.ok(t.call('admin.import', { kind: 'people', rows: [
    { application_no: '230001', scheme_year: 2023, name: 'A', district: 'Kozhikode', stream: 'Medical', category: 'ug', course: 'MBBS', monthly_amount: 1500, fund_type: 'zakat' },
    { application_no: '230002', scheme_year: 2023, name: 'B', district: 'Kozhikode', stream: 'Engineering', category: 'ug', course: 'BTech', monthly_amount: 1000, fund_type: 'non_zakat' },
    { application_no: '250001', scheme_year: 2025, name: 'C', district: 'Malappuram', stream: 'Medical', category: 'pg', course: 'MBBS', monthly_amount: 2000, fund_type: 'zakat', gender: 'female' },
  ] }, m.token))
  const rep = t.ok(t.call('report.summary', {}, m.token))
  assert.deepEqual(rep.years, ['2023', '2025'])
  const koz = rep.by_district.find((d) => d.district === 'Kozhikode')
  assert.equal(koz['2023'], 2)
  assert.equal(koz.total, 2)
  assert.equal(rep.money.scholars, 3)
  assert.equal(rep.money.per_month, 4500)
  assert.equal(rep.money.by_fund.zakat.per_month, 3500)
  assert.equal(rep.by_course[0].key, 'MBBS')
})

test('an admin limited to a Wisdom district only sees cases verified there', () => {
  const t = setup()
  const m = t.google('master@example.org', 'M')
  const a = submittedApplicant(t, 'a@example.org', { district: 'Idukki' })
  t.ok(t.call('admin.invite', { email: 'north@example.org', role: 'admin', district_scope: ['Calicut North'] }, m.token))
  const n = t.google('north@example.org', 'North')
  assert.equal(t.ok(t.call('admin.apps', {}, n.token)).rows.length, 0)
  t.ok(t.call('admin.verify.submit', {
    application_id: a.id,
    fields: { house: 'own', fin_condition: 'poor', zakat_eligible: 'no', category: 'miskeen', wisdom_connection: 'none', wisdom_district: 'Calicut North' },
  }, m.token))
  assert.equal(t.ok(t.call('admin.apps', {}, n.token)).rows.length, 1)
})
