/* Existing records. The committee's earlier scholars and applicants are imported once, without accounts.
   A scholar links a record to their own account when their email matches, or by asking (an admin approves). */

const last10 = (s) => String(s || '').replace(/\D/g, '').slice(-10);

function bulkInsert(table, rows) {
  if (rows.length === 0) return;
  if (P.db.insertMany) P.db.insertMany(table, rows);
  else rows.forEach((r) => P.db.insert(table, r));
}

// Move an imported record to a real account.
function moveApplicant(oldId, newId) {
  if (oldId === newId) return;
  if (P.db.all('Applicants').some((a) => a.id === newId)) {
    fail('That account already has its own application, so the record cannot be linked automatically.', 'EXISTS');
  }
  P.db.update('Applicants', oldId, { id: newId, claim_email: '', legacy: false });
  P.db.all('Applications').filter((a) => a.applicant_id === oldId).forEach((a) => P.db.update('Applications', a.id, { applicant_id: newId }));
  P.db.all('Invitations').filter((i) => i.user_id === oldId).forEach((i) => P.db.update('Invitations', i.id, { user_id: newId }));
  if (P.db.all('Users').some((u) => u.id === oldId)) P.db.remove('Users', oldId);
}

// Called after an email is verified: attach any imported record that was prepared for this address.
function linkLegacy(user) {
  if (!user || !user.email || !user.email_verified) return user;
  const match = P.db.all('Applicants').find((a) => a.legacy && a.claim_email === user.email && a.id !== user.id);
  if (match) {
    try {
      moveApplicant(match.id, user.id);
      audit(user, 'record.linked', 'applicant', user.id);
    } catch (e) {
      P.log('link skipped', e.message);
    }
  }
  return user;
}

ACTIONS['admin.legacy.email'] = {
  ...STAFF,
  fn: (ctx, d) => P.lock(() => {
    const { app } = loadForStaff(ctx, d.application_id);
    const ap = P.db.all('Applicants').find((a) => a.id === app.applicant_id);
    if (!ap || !ap.legacy) fail('Only imported records can be linked this way.', 'INVALID');
    const email = normEmail(d.email);
    if (!validEmail(email)) fail('Please enter a valid email address.', 'INVALID');
    P.db.update('Applicants', ap.id, { claim_email: email });
    const u = findUserByEmail(email);
    if (u && u.email_verified) linkLegacy(u);
    audit(ctx.user, 'record.email_set', 'application', app.id);
    return { ok: true };
  }),
};

ACTIONS['admin.claims'] = {
  ...STAFF,
  fn: () => {
    const apps = P.db.all('Applications');
    const people = {};
    P.db.all('Applicants').forEach((a) => { people[a.id] = a; });
    return {
      claims: P.db.all('Claims').filter((c) => c.status === 'pending').map((c) => {
        const app = apps.find((a) => a.application_no === c.application_no);
        const p = app ? people[app.applicant_id] : null;
        const u = findUserById(c.user_id);
        return {
          id: c.id, created_at: c.created_at, claimant: u ? (u.name || '') : '', claimant_email: u ? u.email : '',
          application_no: c.application_no, found: Boolean(app), record_name: p ? p.full_name : '', imported: Boolean(p && p.legacy),
          mobile_matches: Boolean(p && (last10(p.phone) === c.mobile || last10(p.whatsapp) === c.mobile)), note: c.note,
        };
      }),
    };
  },
};

ACTIONS['admin.claim.decide'] = {
  ...STAFF,
  fn: (ctx, d) => P.lock(() => {
    const c = P.db.all('Claims').find((x) => x.id === d.id && x.status === 'pending');
    if (!c) fail('Request not found.', 'NOT_FOUND');
    if (d.decision === 'approve') {
      const app = P.db.all('Applications').find((a) => a.application_no === c.application_no);
      const ap = app && P.db.all('Applicants').find((a) => a.id === app.applicant_id);
      if (!ap || !ap.legacy) fail('That application number is not an imported record.', 'INVALID');
      moveApplicant(ap.id, c.user_id);
      P.db.update('Claims', c.id, { status: 'approved', decided_by: ctx.user.id, decided_at: isoNow() });
      queueMail(c.user_id, 'claim_approved', 'Your record is linked',
        mailText(['Your existing scholarship record ' + c.application_no + ' is now linked to your account.', 'Please sign in to see it.']));
    } else {
      P.db.update('Claims', c.id, { status: 'rejected', decided_by: ctx.user.id, decided_at: isoNow() });
      queueMail(c.user_id, 'claim_rejected', 'We could not link your record',
        mailText(['We could not link the record you asked for. Please contact the scholarship office.']));
    }
    audit(ctx.user, 'claim.' + (d.decision === 'approve' ? 'approved' : 'rejected'), 'claim', c.id);
    return { ok: true };
  }),
};

// ---- one-time import (master admin). Rows are plain objects; the CLI maps the committee's sheets to these.
const IMPORT_APP_FIELDS = {
  course: 'short', subject: 'short', category: CATEGORIES, course_type: COURSE_TYPES, stream: 'short', duration_years: 'n',
  year_of_study: 'n', completion_month: 'month', university: 'short', college: 'short', last_exam: 'short',
  last_exam_year: 'n', last_percentage: 'n', referred_by: 'short', referrer_designation: 'short', referrer_zone: 'short',
  referrer_contact: 'short', wisdom_district: 'short', grade: 'short', fund_type: FUND_TYPES, monthly_amount: 'n', score: 'n',
};

function cycleForYear(year, cache) {
  const y = Number(year);
  if (!Number.isInteger(y)) return null;
  if (cache[y]) return cache[y];
  let c = P.db.all('Cycles').find((x) => x.year === y);
  if (!c) {
    c = { id: P.uuid(), code: String(y).slice(2), name: 'Scheme ' + y, year: y, is_open: false, closes_on: '', next_serial: 1 };
    P.db.insert('Cycles', c);
  }
  cache[y] = c;
  return c;
}

function importPeople(rows) {
  const existing = new Set(P.db.all('Applications').map((a) => a.application_no));
  const cache = {};
  const users = [];
  const people = [];
  const apps = [];
  const skipped = [];
  rows.forEach((r) => {
    const no = clean(r.application_no, 20);
    if (!no) return skipped.push({ application_no: '', reason: 'No application number' });
    if (existing.has(no)) return skipped.push({ application_no: no, reason: 'Already exists' });
    const cycle = cycleForYear(r.scheme_year, cache);
    if (!cycle) return skipped.push({ application_no: no, reason: 'No scheme year' });
    let ac;
    try {
      ac = pickFields(r, IMPORT_APP_FIELDS);
    } catch (e) {
      return skipped.push({ application_no: no, reason: e.message });
    }
    const status = STATUSES.includes(r.status) ? r.status : 'active';
    const id = P.uuid();
    existing.add(no);
    users.push(newUser('', clean(r.name, 100), { id, active: true }));
    people.push({
      id, full_name: clean(r.name, 100), gender: GENDERS.includes(r.gender) ? r.gender : '', dob: '', district: clean(r.district, 60),
      address: '', phone: clean(r.mobile, 20), whatsapp: clean(r.whatsapp, 20), guardian_name: clean(r.guardian_name, 100),
      guardian_phone: clean(r.guardian_phone, 20), guardian_occupation: '', family_income: null,
      claim_email: normEmail(r.claim_email), legacy: true, updated_at: isoNow(),
    });
    apps.push(Object.assign({
      id: P.uuid(), applicant_id: id, cycle_id: cycle.id, scheme_year: String(cycle.year), application_no: no, status,
      status_note: clean(r.status_note, 200), submitted_at: isoNow(), created_at: isoNow(), updated_at: isoNow(),
    }, ac));
  });
  bulkInsert('Users', users);
  bulkInsert('Applicants', people);
  bulkInsert('Applications', apps);
  return { created: apps.length, skipped };
}

function importVerifications(rows) {
  const byNo = {};
  P.db.all('Applications').forEach((a) => { byNo[a.application_no] = a; });
  const have = new Set(P.db.all('Verifications').map((v) => v.application_id));
  const out = [];
  const skipped = [];
  rows.forEach((r) => {
    const app = byNo[clean(r.application_no, 20)];
    if (!app) return skipped.push({ application_no: clean(r.application_no, 20), reason: 'Application not found' });
    if (have.has(app.id)) return skipped.push({ application_no: app.application_no, reason: 'Already has a verification' });
    let f;
    try {
      f = pickFields(r, VERIFY_FIELDS);
    } catch (e) {
      return skipped.push({ application_no: app.application_no, reason: e.message });
    }
    have.add(app.id);
    out.push(Object.assign({
      id: P.uuid(), application_id: app.id, verifier_id: '', assigned_by: '', assigned_at: '', due_on: '', status: 'submitted',
      submitted_at: clean(r.submitted_at, 30) || isoNow(), on_behalf: false,
    }, f));
    if (f.wisdom_district && !app.wisdom_district) P.db.update('Applications', app.id, { wisdom_district: f.wisdom_district });
  });
  bulkInsert('Verifications', out);
  return { created: out.length, skipped };
}

function importBank(rows) {
  const byNo = {};
  P.db.all('Applications').forEach((a) => { byNo[a.application_no] = a; });
  const have = new Set(P.db.all('BankAccounts').map((b) => b.application_id));
  const out = [];
  const skipped = [];
  rows.forEach((r) => {
    const app = byNo[clean(r.application_no, 20)];
    if (!app) return skipped.push({ application_no: clean(r.application_no, 20), reason: 'Application not found' });
    if (have.has(app.id)) return skipped.push({ application_no: app.application_no, reason: 'Already has bank details' });
    const account = clean(r.account_no, 30).replace(/\s+/g, '');
    const ifsc = clean(r.ifsc, 15).toUpperCase().replace(/\s+/g, '');
    if (!/^\d{9,18}$/.test(account)) return skipped.push({ application_no: app.application_no, reason: 'Account number is not a plain 9 to 18 digit number' });
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) return skipped.push({ application_no: app.application_no, reason: 'IFSC is not valid' });
    have.add(app.id);
    out.push({
      id: P.uuid(), application_id: app.id, holder: clean(r.holder, 100), account_no: account, bank: clean(r.bank, 80), ifsc,
      branch: clean(r.branch, 80), status: 'submitted', note: 'Imported, please verify', updated_at: isoNow(),
    });
  });
  bulkInsert('BankAccounts', out);
  return { created: out.length, skipped };
}

function importPayments(rows) {
  const byNo = {};
  P.db.all('Applications').forEach((a) => { byNo[a.application_no] = a; });
  const batches = {};
  P.db.all('PaymentBatches').forEach((b) => { batches[b.name] = b; });
  const out = [];
  const skipped = [];
  rows.forEach((r) => {
    const app = byNo[clean(r.application_no, 20)];
    if (!app) return skipped.push({ application_no: clean(r.application_no, 20), reason: 'Application not found' });
    const amount = Number(r.amount);
    const status = ['paid', 'failed'].includes(r.status) ? r.status : 'pending';
    if (!Number.isFinite(amount) || amount <= 0) return skipped.push({ application_no: app.application_no, reason: 'Amount is not valid' });
    const name = clean(r.batch, 80) || 'Imported payments';
    if (!batches[name]) {
      batches[name] = { id: P.uuid(), name, start_month: '', months: 0, status: 'sent', created_by: '', created_at: isoNow() };
      P.db.insert('PaymentBatches', batches[name]);
    }
    out.push({
      id: P.uuid(), batch_id: batches[name].id, application_id: app.id, amount, months: Number(r.months) || 0,
      fund_type: FUND_TYPES.includes(app.fund_type) ? app.fund_type : '', status, reference: '', paid_on: '', note: 'imported', created_at: isoNow(),
    });
  });
  bulkInsert('Payments', out);
  return { created: out.length, skipped };
}

ACTIONS['admin.import'] = {
  ...MASTER,
  fn: (ctx, d) => P.lock(() => {
    const rows = Array.isArray(d.rows) ? d.rows.slice(0, 200) : [];
    if (rows.length === 0) fail('There are no rows to import.', 'INVALID');
    const run = { people: importPeople, verifications: importVerifications, bank: importBank, payments: importPayments }[d.kind];
    if (!run) fail('Unknown import type.', 'INVALID');
    const result = run(rows);
    audit(ctx.user, 'import.' + d.kind, 'import', d.kind, { created: result.created, skipped: result.skipped.length });
    return result;
  }),
};
