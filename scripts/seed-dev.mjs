// Fills the LOCAL dev backend (npm run backend:dev) with fictional people so the committee screens can be tried.
// Usage: node scripts/seed-dev.mjs   (the dev backend must be running on port 8787). Never run this against the live backend.
const API = process.env.API || 'http://localhost:8787'
const call = async (action, data = {}, token) => {
  const r = await (await fetch(API, { method: 'POST', body: JSON.stringify({ action, data, token }) })).json()
  if (!r.ok) throw new Error(`${action}: ${r.error}`)
  return r.data
}
const png = Buffer.from('89504e470d0a1a0a', 'hex').toString('base64')

const master = await call('auth.google', { credential: 'dev:master@example.org|Demo Master' })
const M = master.token

const people = [
  ['Aysha Rahman', 'Malappuram', 'BSc Physics', 'Government College Malappuram', 'Arts & Science', 90000, 'Calicut University'],
  ['Mohammed Shafi', 'Kozhikode', 'B.Tech', 'MES College of Engineering', 'Engineering', 120000, 'APJ Abdul Kalam Technological University'],
  ['Fathima Nasrin', 'Kannur', 'MBBS', 'Government Medical College Kannur', 'Medical', 80000, 'Kerala University of Health Sciences'],
  ['Rashid K', 'Palakkad', 'BA English', 'Victoria College Palakkad', 'Arts & Science', 60000, 'Calicut University'],
  ['Shamna Beevi', 'Wayanad', 'B.Ed', 'Wayanad Teacher Training College', 'Arts & Science', 70000, 'Calicut University'],
  ['Anas P', 'Thrissur', 'B.Com', 'Sree Kerala Varma College', 'Management', 100000, 'Calicut University'],
  ['Nihala Jabin', 'Ernakulam', 'MA Political Science', 'Maharajas College', 'Arts & Science', 85000, 'Mahatma Gandhi University'],
  ['Sinan Ali', 'Kasaragod', 'Polytechnic Diploma', 'Government Polytechnic Kasaragod', 'Vocational/Polytechnic', 95000, 'Board of Technical Education'],
  ['Hiba Fathima', 'Malappuram', 'B.Pharm', 'Al Shifa College of Pharmacy', 'Paramedical', 110000, 'Kerala University of Health Sciences'],
  ['Jasir M', 'Kozhikode', 'LLB', 'Government Law College Kozhikode', 'Law', 75000, 'Kerala University of Law'],
  ['Zainab Noushad', 'Kollam', 'BCA', 'TKM College Kollam', 'Management', 90000, 'University of Kerala'],
  ['Ibrahim Khalil', 'Alappuzha', 'MSc Chemistry', 'SD College Alappuzha', 'Arts & Science', 65000, 'University of Kerala'],
  ['Sana Marjan', 'Malappuram', 'BA Arabic', 'Farook College', 'Arabic', 58000, 'Calicut University'],
  ['Adil Rahman', 'Kottayam', 'B.Tech', 'Rajiv Gandhi Institute', 'Engineering', 130000, 'APJ Abdul Kalam Technological University'],
]

const sessions = []
for (let i = 0; i < people.length; i++) {
  const [name, district, course, college, stream, income, university] = people[i]
  const phone = `98470${String(10100 + i)}`
  const s = await call('apply.begin', { name, phone, email: i % 3 === 0 ? `${name.split(' ')[0].toLowerCase()}@example.org` : '' })
  const load = await call('app.load', {}, s.token)
  const app = load.application
  await call('app.save', {
    id: app.id,
    applicant: { full_name: name, gender: i % 2 ? 'male' : 'female', dob: `200${i % 5}-0${(i % 9) + 1}-1${i % 9}`, district, phone, guardian_name: 'Guardian of ' + name.split(' ')[0], guardian_phone: '9895000000', family_income: income, address: 'House, ' + district },
    application: { course, college, stream, university, category: course.startsWith('M') && !course.startsWith('MB') ? 'pg' : 'ug', year_of_study: 1 + (i % 3), completion_month: '2028-03', last_exam: 'Plus Two', last_exam_year: 2026, last_percentage: 70 + i, tuition_fees: 30000 + i * 5000, expense_per_year: 60000 + i * 5000 },
  }, s.token)
  sessions.push({ token: s.token, appId: app.id, name })
  if (i < 12) {
    await call('app.submit', { id: app.id }, s.token)
    for (const t of load.doc_types.filter((x) => x.stage === 'application').slice(0, 1 + (i % 3))) {
      await call('doc.upload', { application_id: app.id, doc_type_id: t.id, mime: 'image/png', data: png }, s.token)
    }
  }
}

// a meet
const ev = await call('event.save', { name: 'State Intellectual Meet, Calicut', date: new Date(Date.now() + 20 * 864e5).toISOString().slice(0, 10), venue: 'Hotel Span, Kozhikode', status: 'open', kind: 'both' }, M)
await call('event.save', { name: 'Interview day, Malappuram', date: new Date(Date.now() + 45 * 864e5).toISOString().slice(0, 10), venue: 'Wisdom office, Malappuram' }, M)

// progress some cases
const all = (await call('admin.apps', {}, M)).rows
const byName = (n) => all.find((r) => r.name === n)
const staff = await call('auth.google', { credential: 'dev:verifier@example.org|Demo Verifier' })
await call('admin.invite', { email: 'verifier@example.org', role: 'verifier', district_scope: ['Malappuram'] }, M)
await call('event.invite', { event_id: ev.id, application_ids: all.slice(0, 8).map((r) => r.id) }, M)

for (const n of ['Aysha Rahman', 'Mohammed Shafi', 'Fathima Nasrin']) {
  await call('interview.save', { application_id: byName(n).id, scores: { zakat: 'miskeen', education: 8 }, grade: 'A', recommended_amount: 1500, fund_type: 'zakat', remarks: 'Good' }, M)
}
await call('admin.decide', { application_id: byName('Aysha Rahman').id, decision: 'selected', amount: 1500, fund_type: 'zakat', note: 'Selected' }, M)
await call('admin.decide', { application_id: byName('Mohammed Shafi').id, decision: 'selected', amount: 2000, fund_type: 'non_zakat', note: 'Selected' }, M)
await call('admin.decide', { application_id: byName('Rashid K').id, decision: 'not_selected', note: 'Not eligible' }, M)

// bank details for the two selected scholars; one verified
for (const [i, n] of ['Aysha Rahman', 'Mohammed Shafi'].entries()) {
  const sess = sessions.find((s) => s.name === n)
  await call('bank.save', { holder: n, bank: 'State Bank of India', branch: 'Main', account_no: `3012345678${i}0`, account_no2: `3012345678${i}0`, ifsc: 'SBIN0000123' }, sess.token)
}
await call('admin.bank.verify', { application_id: byName('Aysha Rahman').id, decision: 'verify' }, M)

console.log('Seeded', people.length, 'people. Sign in to the admin portal with master@example.org (developer sign-in).')
