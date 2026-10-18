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
  Cycles: { id: 's', code: 's', name: 's', is_open: 'b', closes_on: 's', next_serial: 'n' },
  DocTypes: { id: 's', code: 's', label_en: 's', label_ml: 's', required: 'b', sort: 'n', active: 'b' },
  Applicants: {
    id: 's', full_name: 's', gender: 's', dob: 's', district: 's', address: 's', phone: 's',
    whatsapp: 's', guardian_name: 's', guardian_phone: 's', guardian_occupation: 's',
    family_income: 'n', updated_at: 's',
  },
  Applications: {
    id: 's', applicant_id: 's', cycle_id: 's', application_no: 's', status: 's', course: 's',
    subject: 's', course_type: 's', stream: 's', duration_years: 'n', year_of_study: 'n',
    completion_month: 's', university: 's', college: 's', last_exam: 's', last_exam_year: 'n',
    last_percentage: 'n', submitted_at: 's', created_at: 's', updated_at: 's',
  },
  Documents: {
    id: 's', application_id: 's', doc_type_id: 's', file_id: 's', file_name: 's', mime: 's',
    status: 's', reason: 's', reviewed_by: 's', reviewed_at: 's', version: 'n', uploaded_at: 's',
  },
  Pending: {
    id: 's', application_id: 's', kind: 's', title: 's', doc_type_id: 's', due_on: 's', status: 's',
    created_at: 's', closed_at: 's', reminders: 'n', last_reminder: 's', flag: 's',
  },
  Outbox: {
    id: 's', user_id: 's', to: 's', kind: 's', subject: 's', body: 's', status: 's', error: 's',
    created_at: 's', sent_at: 's',
  },
  Consents: { id: 's', user_id: 's', kind: 's', version: 's', is_minor: 'b', guardian_name: 's', given_at: 's' },
  Audit: { id: 's', at: 's', actor: 's', action: 's', entity: 's', entity_id: 's', detail: 's' },
  Settings: { id: 's', value: 's' },
};

// Field maps used to validate what applicants may write.
const APPLICANT_FIELDS = {
  full_name: 'short', gender: GENDERS, dob: 'date', district: 'short', address: 'long', phone: 'short',
  whatsapp: 'short', guardian_name: 'short', guardian_phone: 'short', guardian_occupation: 'short',
  family_income: 'n',
};
const APPLICATION_FIELDS = {
  course: 'short', subject: 'short', course_type: COURSE_TYPES, stream: 'short', duration_years: 'n',
  year_of_study: 'n', completion_month: 'month', university: 'short', college: 'short',
  last_exam: 'short', last_exam_year: 'n', last_percentage: 'n',
};

function seedData(masterEmail) {
  if (P.db.all('DocTypes').length === 0) {
    [
      ['qualification', 'Educational qualification certificate', 'വിദ്യാഭ്യാസ യോഗ്യതാ സർട്ടിഫിക്കറ്റ്'],
      ['fee_receipt', 'Fee payment receipt', 'ഫീസ് അടച്ച രസീത്'],
      ['recommendation', 'Recommendation letter', 'ശുപാർശക്കത്ത്'],
      ['ration_card', 'Ration card', 'റേഷൻ കാർഡ്'],
    ].forEach(([code, en, ml], i) =>
      P.db.insert('DocTypes', { id: P.uuid(), code, label_en: en, label_ml: ml, required: true, sort: i + 1, active: true }));
  }
  if (P.db.all('Cycles').length === 0) {
    P.db.insert('Cycles', { id: P.uuid(), code: '26', name: 'Scheme 2026', is_open: true, closes_on: '', next_serial: 1 });
  }
  const email = normEmail(masterEmail);
  if (email && !P.db.all('Users').some((u) => u.email === email) && !P.db.all('StaffInvites').some((i) => i.email === email)) {
    P.db.insert('StaffInvites', { id: P.uuid(), email, role: 'master', district_scope: '', finance: true, created_at: isoNow() });
  }
}
