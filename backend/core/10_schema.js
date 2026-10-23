/* Tables (sheet tabs) and column types. s = text, n = number, b = true/false.
   The first column of every table is `id`. Adding a column here adds it to the sheet on the next setup run. */

const SCHEMA = {
  Users: {
    id: 's', email: 's', name: 's', phone: 's', password_hash: 's', salt: 's', role: 's',
    district_scope: 's', finance: 'b', allow_password: 'b', language: 's', active: 'b',
    email_verified: 'b', created_at: 's', last_login: 's',
  },
  StaffInvites: { id: 's', email: 's', role: 's', district_scope: 's', finance: 'b', created_at: 's' },
  Codes: { id: 's', email: 's', purpose: 's', code_hash: 's', payload: 's', expires: 's', attempts: 'n' },
  Cycles: { id: 's', code: 's', name: 's', year: 'n', is_open: 'b', closes_on: 's', next_serial: 'n' },
  DocTypes: { id: 's', code: 's', label_en: 's', label_ml: 's', stage: 's', required: 'b', sort: 'n', active: 'b' },
  Applicants: {
    id: 's', full_name: 's', gender: 's', dob: 's', district: 's', address: 's', phone: 's',
    whatsapp: 's', guardian_name: 's', guardian_phone: 's', guardian_occupation: 's',
    family_income: 'n', native_place: 's', post_office: 's', pin_code: 's', claim_email: 's', legacy: 'b', updated_at: 's',
  },
  Applications: {
    id: 's', applicant_id: 's', cycle_id: 's', scheme_year: 's', application_no: 's', status: 's',
    status_note: 's', course: 's', subject: 's', category: 's', course_type: 's', stream: 's',
    duration_years: 'n', year_of_study: 'n', completion_month: 's', university: 's', college: 's',
    last_exam: 's', last_exam_year: 'n', last_percentage: 'n',
    gpa: 's', has_backpapers: 's', backpaper_count: 'n', college_state: 's', college_district: 's', college_address: 's',
    prev_qualification: 's', prev_university: 's', prev_college: 's', hosteller: 's',
    tuition_fees: 'n', hostel_fees: 'n', travel_expense: 'n', expense_per_year: 'n',
    wisdom_scholarship: 's', wisdom_scholarship_year: 's', other_scholarship: 's', other_scholarship_name: 's',
    other_scholarship_provider: 's', other_scholarship_amount: 'n',
    referred_by: 's', referrer_designation: 's', referrer_zone: 's', referrer_contact: 's',
    wisdom_district: 's', grade: 's', score: 'n', fund_type: 's', monthly_amount: 'n',
    submitted_at: 's', created_at: 's', updated_at: 's',
  },
  Documents: {
    id: 's', application_id: 's', renewal_id: 's', doc_type_id: 's', file_id: 's', file_name: 's',
    mime: 's', status: 's', reason: 's', reviewed_by: 's', reviewed_at: 's', version: 'n', uploaded_at: 's',
  },
  Pending: {
    id: 's', application_id: 's', kind: 's', title: 's', doc_type_id: 's', renewal_id: 's', due_on: 's',
    status: 's', created_at: 's', closed_at: 's', reminders: 'n', last_reminder: 's', flag: 's',
  },
  Verifications: {
    id: 's', application_id: 's', verifier_id: 's', assigned_by: 's', assigned_at: 's', due_on: 's',
    status: 's', guardian_ok: 'b', house: 's', house_note: 's', fin_condition: 's', zakat_eligible: 's',
    category: 's', wisdom_connection: 's', remarks: 's', wisdom_district: 's', submitted_at: 's', on_behalf: 'b',
  },
  Interviews: {
    id: 's', application_id: 's', round: 's', event_id: 's', mode: 's', interviewer_id: 's', scores: 's',
    total: 'n', grade: 's', recommended_amount: 'n', fund_type: 's', remarks: 's', created_at: 's', updated_at: 's',
  },
  Events: {
    id: 's', name: 's', date: 's', venue: 's', mode: 's', kind: 's', status: 's', next_token: 'n', notes: 's', created_at: 's',
  },
  Invitations: {
    id: 's', event_id: 's', application_id: 's', user_id: 's', invited_at: 's', reply: 's', mode_pref: 's',
    arrival_time: 's', transport: 's', companions: 'n', companion_names: 's', reason: 's', replied_at: 's',
    checked_in_at: 's', token: 'n', attendance: 's', interview_status: 's', absent_reason: 's', remarks: 's',
  },
  BankAccounts: {
    id: 's', application_id: 's', holder: 's', account_no: 's', bank: 's', ifsc: 's', branch: 's',
    status: 's', note: 's', verified_by: 's', verified_at: 's', updated_at: 's',
  },
  PaymentBatches: { id: 's', name: 's', start_month: 's', months: 'n', status: 's', created_by: 's', created_at: 's' },
  Payments: {
    id: 's', batch_id: 's', application_id: 's', amount: 'n', months: 'n', fund_type: 's', status: 's',
    reference: 's', paid_on: 's', note: 's', created_at: 's',
  },
  Renewals: {
    id: 's', application_id: 's', period: 's', status: 's', opened_at: 's', submitted_at: 's',
    current_year: 'n', completion_month: 's', course: 's', college: 's', last_exam: 's',
    result_percentage: 'n', phone: 's', note: 's', decision: 's', new_amount: 'n', remarks: 's',
    decided_by: 's', decided_at: 's',
  },
  Revisions: {
    id: 's', application_id: 's', field: 's', old_value: 's', new_value: 's', reason: 's', by: 's', at: 's',
  },
  Claims: {
    id: 's', user_id: 's', application_no: 's', mobile: 's', note: 's', status: 's', created_at: 's', decided_by: 's', decided_at: 's',
  },
  Outbox: {
    id: 's', user_id: 's', to: 's', kind: 's', subject: 's', body: 's', status: 's', error: 's',
    created_at: 's', sent_at: 's',
  },
  Consents: { id: 's', user_id: 's', kind: 's', version: 's', is_minor: 'b', guardian_name: 's', given_at: 's' },
  Audit: { id: 's', at: 's', actor: 's', action: 's', entity: 's', entity_id: 's', detail: 's' },
  Settings: { id: 's', value: 's' },
};

// ---- vocabularies (taken from the committee's existing sheets and forms)
const CATEGORIES = ['ug', 'pg', 'diploma', 'others'];
const STREAMS = ['Medical', 'Paramedical', 'Engineering', 'Arts & Science', 'Management', 'Law', 'Vocational/Polytechnic', 'Arabic', 'Others'];
const HOUSE = ['own', 'rent', 'joint', 'other'];
const FIN_CONDITIONS = ['very_poor', 'poor', 'below_average', 'average', 'above_average'];
const ZAKAT_CATEGORIES = [
  'faqeer', 'miskeen', 'yatheem', 'debt', 'no_regular_income', 'chronic_illness',
  'other_difficulty', 'no_difficulty_consider', 'no_difficulty_reject',
];
const CONNECTIONS = ['functionary', 'member', 'supporter', 'none', 'relative_of_worker', 'other_org'];
const GRADES = ['A+', 'A', 'B+', 'B', 'C', 'D'];
const FUND_TYPES = ['zakat', 'non_zakat'];
const RENEWAL_DECISIONS = [
  'continue', 'continue_increase', 'continue_reduce', 'on_hold', 'no_need', 'removed',
  'course_completed', 'closed', 'call_back', 'file_missing', 'not_attending',
];
const DEFAULT_WISDOM_DISTRICTS = [
  'Malappuram North', 'Malappuram East', 'Malappuram West', 'Calicut North', 'Calicut South', 'Kannur',
  'Wayanad', 'Palakkad', 'Thrissur', 'Ernakulam', 'Alappuzha', 'Kollam', 'Trivandrum', 'Kasaragod',
];

// Interview score sheet (total 70). Options are [key, points]; 'range' is a free 0..max judgement.
const SCORE_CRITERIA = [
  { key: 'zakat', label: 'Zakat category', max: 13, options: [['yatheem', 13], ['miskeen', 5], ['faqeer', 5], ['debt', 5], ['others', 0]] },
  { key: 'family', label: 'Family background', max: 20, options: [['very_poor', 20], ['poor', 18], ['below_average', 16], ['average', 10], ['above_average', 6], ['rich', 0]] },
  { key: 'ration', label: 'Ration card', max: 5, options: [['yellow', 5], ['red', 4], ['blue', 2], ['white', 0]] },
  { key: 'parttime', label: 'Part-time job', max: 2, options: [['yes', 2], ['no', 0]] },
  { key: 'education', label: 'Education', max: 10, range: true },
  { key: 'fee', label: 'Course fee per year', max: 10, options: [['above_5l', 10], ['above_3l', 8], ['above_2l', 6], ['above_1l', 4], ['above_50k', 2], ['below_50k', 0]] },
  { key: 'org', label: 'Organisational connection', max: 10, options: [['district', 10], ['mandalam', 7], ['unit', 5], ['member', 3], ['none', 0]] },
];

// Application and applicant fields an applicant may write, and their types.
const APPLICANT_FIELDS = {
  full_name: 'short', gender: GENDERS, dob: 'date', district: 'short', address: 'long', phone: 'short',
  whatsapp: 'short', guardian_name: 'short', guardian_phone: 'short', guardian_occupation: 'short',
  family_income: 'n', native_place: 'short', post_office: 'short', pin_code: 'short',
};
const APPLICATION_FIELDS = {
  course: 'short', subject: 'short', category: CATEGORIES, course_type: COURSE_TYPES, stream: 'short',
  duration_years: 'n', year_of_study: 'n', completion_month: 'month', university: 'short', college: 'short',
  last_exam: 'short', last_exam_year: 'n', last_percentage: 'n',
  gpa: 'short', has_backpapers: 'short', backpaper_count: 'n', college_state: 'short', college_district: 'short', college_address: 'long',
  prev_qualification: 'short', prev_university: 'short', prev_college: 'short', hosteller: 'short',
  tuition_fees: 'n', hostel_fees: 'n', travel_expense: 'n', expense_per_year: 'n',
  wisdom_scholarship: 'short', wisdom_scholarship_year: 'short', other_scholarship: 'short', other_scholarship_name: 'short',
  other_scholarship_provider: 'short', other_scholarship_amount: 'n',
  referred_by: 'short', referrer_designation: 'short', referrer_zone: 'short', referrer_contact: 'short',
};

const DOC_TYPES_SEED = [
  ['qualification', 'Educational qualification certificate', 'വിദ്യാഭ്യാസ യോഗ്യതാ സർട്ടിഫിക്കറ്റ്', 'application', true],
  ['fee_receipt', 'Fee payment receipt', 'ഫീസ് അടച്ച രസീത്', 'application', true],
  ['recommendation', 'Recommendation letter', 'ശുപാർശക്കത്ത്', 'application', true],
  ['ration_card', 'Ration card', 'റേഷൻ കാർഡ്', 'application', true],
  ['exam_result', 'Latest exam result', 'ഏറ്റവും പുതിയ പരീക്ഷാഫലം', 'renewal', true],
  ['renewal_fee_receipt', 'Latest fee receipt', 'ഏറ്റവും പുതിയ ഫീസ് രസീത്', 'renewal', true],
];

function seedData(masterEmail) {
  if (P.db.all('DocTypes').length === 0) {
    DOC_TYPES_SEED.forEach(([code, en, ml, stage, required], i) =>
      P.db.insert('DocTypes', { id: P.uuid(), code, label_en: en, label_ml: ml, stage, required, sort: i + 1, active: true }));
  }
  if (P.db.all('Cycles').length === 0) {
    [[2022, false], [2023, false], [2025, false], [2026, true]].forEach(([year, open]) =>
      P.db.insert('Cycles', {
        id: P.uuid(), code: String(year).slice(2), name: 'Scheme ' + year, year, is_open: open, closes_on: '', next_serial: 1,
      }));
  }
  if (!P.db.all('Settings').some((s) => s.id === 'wisdom_districts')) {
    P.db.insert('Settings', { id: 'wisdom_districts', value: DEFAULT_WISDOM_DISTRICTS.join('|') });
  }
  const email = normEmail(masterEmail);
  if (email && !P.db.all('Users').some((u) => u.email === email) && !P.db.all('StaffInvites').some((i) => i.email === email)) {
    P.db.insert('StaffInvites', { id: P.uuid(), email, role: 'master', district_scope: '', finance: true, created_at: isoNow() });
  }
}

function wisdomDistricts() {
  const s = P.db.all('Settings').find((x) => x.id === 'wisdom_districts');
  return s && s.value ? s.value.split('|').filter(Boolean) : DEFAULT_WISDOM_DISTRICTS.slice();
}
