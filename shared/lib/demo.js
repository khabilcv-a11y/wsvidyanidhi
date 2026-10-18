// Demo mode: sample data held in the browser so the portals can be previewed before the backend is connected.
// Turn on with ?demo on the portal address. Nothing here is real, and nothing is sent anywhere.

const KEY = 'vn_demo'

export function isDemo() {
  try {
    if (new URLSearchParams(window.location.search).has('demo')) sessionStorage.setItem(KEY, '1')
    if (new URLSearchParams(window.location.search).get('demo') === 'off') sessionStorage.removeItem(KEY)
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

const NAMES = [
  ['Aysha Rahman', 'female', 'Malappuram', 'MBBS', 'Medical', 'ug', 'submitted', 'A+'],
  ['Mohammed Rafi', 'male', 'Kozhikode', 'BTech Computer Science', 'Engineering', 'ug', 'under_verification', ''],
  ['Fathima Nasrin', 'female', 'Palakkad', 'BSc Nursing', 'Paramedical', 'ug', 'interview_scheduled', ''],
  ['Ameen Basheer', 'male', 'Kannur', 'BA Economics', 'Arts & Science', 'ug', 'documents_requested', ''],
  ['Sahla Jabin', 'female', 'Thrissur', 'MSc Chemistry', 'Arts & Science', 'pg', 'decision_pending', 'A'],
  ['Irfan Hameed', 'male', 'Wayanad', 'Diploma in Electrical Engineering', 'Vocational/Polytechnic', 'diploma', 'selected', 'A+'],
  ['Zainaba Latheef', 'female', 'Ernakulam', 'B.Pharm', 'Paramedical', 'ug', 'active', 'A+'],
  ['Shamil Koya', 'male', 'Malappuram', 'BDS', 'Medical', 'ug', 'active', 'A'],
  ['Najla Fasil', 'female', 'Kozhikode', 'BEd', 'Others', 'ug', 'renewal_due', 'A'],
  ['Unais Parambil', 'male', 'Kasaragod', 'MBA', 'Management', 'pg', 'not_selected', 'C'],
]

const apps = NAMES.map(([name, gender, district, course, stream, category, status, grade], i) => ({
  id: 'demo-app-' + (i + 1), application_no: '26' + String(i + 1).padStart(4, '0'), name, gender, district, course, stream, category,
  status, grade, scheme_year: '2026', monthly_amount: ['active', 'selected', 'renewal_due'].includes(status) ? [1500, 1000, 2000, 1500][i % 4] : null,
  fund_type: i % 3 === 0 ? 'non_zakat' : 'zakat', phone: '98470 0' + String(1000 + i), college: ['Govt Medical College', 'NIT Calicut', 'College of Nursing', 'MES College', 'Univ. College', 'Govt Polytechnic', 'College of Pharmacy', 'Dental College', 'Training College', 'School of Mgmt'][i],
}))

let docs = [
  { id: 'd1', label: 'Educational qualification certificate', status: 'accepted', reason: '', version: 1, uploaded_at: '2026-10-02T09:10:00Z', doc_type_id: 't1' },
  { id: 'd2', label: 'Fee payment receipt', status: 'under_review', reason: '', version: 1, uploaded_at: '2026-10-03T11:30:00Z', doc_type_id: 't2' },
  { id: 'd3', label: 'Ration card', status: 'reupload', reason: 'The photo is blurred. Please retake it in good light.', version: 1, uploaded_at: '2026-10-03T11:40:00Z', doc_type_id: 't4' },
]

const SAMPLE_DOC = btoa(unescape(encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="620"><rect width="900" height="620" fill="#fff"/><rect x="40" y="40" width="820" height="540" fill="none" stroke="#111" stroke-width="3"/><text x="450" y="130" font-family="Georgia" font-size="38" text-anchor="middle" fill="#111">SAMPLE DOCUMENT</text><text x="450" y="190" font-family="Arial" font-size="20" text-anchor="middle" fill="#555">Demo mode: this is not a real file</text><g stroke="#bbb" stroke-width="2"><path d="M90 280h720M90 340h720M90 400h720M90 460h520"/></g></svg>')))

const user = (portal) => (portal === 'admin'
  ? { id: 'demo-admin', email: 'committee@demo.local', name: 'Demo Committee', role: 'master', district_scope: [], finance: true, language: 'en' }
  : { id: 'demo-user', email: 'student@demo.local', name: 'Zahra Ameen', role: 'applicant', district_scope: [], finance: false, language: 'en' })

const META = {
  criteria: [], grades: ['A+', 'A', 'B+', 'B', 'C', 'D'], fund_types: ['zakat', 'non_zakat'],
  streams: ['Medical', 'Paramedical', 'Engineering', 'Arts & Science', 'Management', 'Law', 'Vocational/Polytechnic', 'Arabic', 'Others'],
  wisdom_districts: ['Malappuram North', 'Malappuram East', 'Calicut North', 'Calicut South', 'Kannur', 'Palakkad', 'Thrissur'],
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export async function demoCall(action, data, portal) {
  await wait(150)
  const me = user(portal)
  switch (action) {
    case 'public.info': return { open: true, name: 'Scheme 2026', closes_on: '' }
    case 'auth.google': case 'auth.login': case 'auth.verify': case 'auth.reset':
      return { token: 'demo', via: 'google', user: me }
    case 'auth.register': case 'auth.forgot': return { sent: true, dev_code: '123456' }
    case 'me': return { user: me, via: 'google' }
    case 'meta': return META

    // ---- applicant
    case 'app.load': return {
      consented: true,
      applicant: { full_name: me.name, phone: '98470 01234', district: 'Malappuram' },
      application: { id: 'demo-mine', application_no: '260000', status: 'documents_requested', course: 'BSc Physics', college: 'Govt College', category: 'ug' },
      open_cycle: { id: 'c26', name: 'Scheme 2026' },
      doc_types: [
        { id: 't1', label_en: 'Educational qualification certificate', label_ml: 'വിദ്യാഭ്യാസ യോഗ്യതാ സർട്ടിഫിക്കറ്റ്' },
        { id: 't2', label_en: 'Fee payment receipt', label_ml: 'ഫീസ് അടച്ച രസീത്' },
        { id: 't3', label_en: 'Recommendation letter', label_ml: 'ശുപാർശക്കത്ത്' },
        { id: 't4', label_en: 'Ration card', label_ml: 'റേഷൻ കാർഡ്' },
      ],
      docs: docs.slice().reverse(),
      pending: [
        { id: 'p1', title: 'Recommendation letter', due_on: '2026-10-28', doc_type_id: 't3', kind: 'document' },
        { id: 'p2', title: 'Upload again: Ration card', due_on: '2026-10-28', doc_type_id: 't4', kind: 'reupload' },
      ],
      claim: null,
    }
    case 'doc.upload': {
      const t = { t1: 'Educational qualification certificate', t2: 'Fee payment receipt', t3: 'Recommendation letter', t4: 'Ration card' }[data.doc_type_id] || 'Document'
      docs = docs.filter((d) => d.doc_type_id !== data.doc_type_id || false).concat([{ id: 'd' + Date.now(), label: t, status: 'under_review', reason: '', version: 1, uploaded_at: new Date().toISOString(), doc_type_id: data.doc_type_id }])
      return { ok: true }
    }
    case 'doc.file': case 'admin.docfile': return { mime: 'image/svg+xml', name: 'sample.svg', data: SAMPLE_DOC }
    case 'consent.give': case 'app.save': case 'app.start': case 'app.resubmit': return { ok: true, saved_at: new Date().toISOString(), id: 'demo-mine' }
    case 'app.submit': return { application_no: '260000' }

    // ---- admin
    case 'admin.dashboard': {
      const counts = {}
      apps.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1 })
      return { total: apps.length, counts, docs_to_review: docs.filter((d) => d.status === 'under_review').length + 4, pending_items: 9, needs_call: 1, verifications_due: 3, claims: 2 }
    }
    case 'admin.apps': return { rows: apps.map((a) => ({ ...a, submitted_at: '2026-10-02T10:00:00Z', legacy: false })) }
    case 'admin.app': {
      const a = apps.find((x) => x.id === data.id) || apps[0]
      return {
        application: { id: a.id, application_no: a.application_no, status: a.status, scheme_year: a.scheme_year, course: a.course, category: a.category, stream: a.stream, college: a.college, course_type: 'government', year_of_study: 2, completion_month: '2028-03', university: 'University of Calicut', last_exam: 'Plus Two', last_exam_year: 2024, last_percentage: 92.4, referred_by: 'Demo Referrer', referrer_designation: 'Unit President', referrer_zone: a.district, referrer_contact: '98470 00000', grade: a.grade, monthly_amount: a.monthly_amount, fund_type: a.fund_type },
        applicant: { full_name: a.name, gender: a.gender, dob: '2005-04-03', district: a.district, address: 'Demo House, ' + a.district, phone: a.phone, whatsapp: a.phone, guardian_name: 'Demo Guardian', guardian_phone: '98470 99999', guardian_occupation: 'Daily wage', family_income: 96000, legacy: false },
        docs: docs.map((d) => ({ ...d })), pending: [], verifications: [], interviews: [], invitations: [], renewals: [], payments: [], revisions: [], bank_status: '',
      }
    }
    case 'admin.review': {
      docs = docs.map((d) => (d.id === data.id ? { ...d, status: data.decision, reason: data.reason || '' } : d))
      return { ok: true }
    }
    case 'admin.status': return { ok: true }
    case 'admin.verifiers': return { verifiers: [{ id: 'v1', name: 'Demo Verifier', email: 'verifier@demo.local', districts: [] }] }
    case 'admin.users': return {
      people: [
        { id: 'u1', email: 'committee@demo.local', name: 'Demo Committee', role: 'master', district_scope: [], finance: true, active: true },
        { id: 'u2', email: 'panel@demo.local', name: 'Demo Panel', role: 'admin', district_scope: ['Kozhikode'], finance: false, active: true },
      ], invites: [],
    }
    case 'admin.audit': return { rows: [
      { at: new Date().toISOString(), who: 'committee@demo.local', action: 'document.viewed', entity: 'document', detail: '' },
      { at: new Date(Date.now() - 3.6e6).toISOString(), who: 'panel@demo.local', action: 'application.status', entity: 'application', detail: '{"to":"under_verification"}' },
    ] }
    default: return { ok: true }
  }
}
