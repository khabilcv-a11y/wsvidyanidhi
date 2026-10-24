/* Admin actions. Every one is checked for staff access and the staff member's district scope. */

const STAFF = { staff: true };
const MASTER = { staff: true, master: true };
const FINANCE = { staff: true, finance: true };

// A person's scope matches the applicant's native district or the application's Wisdom (organisation) district.
function inScope(user, district, wisdomDistrict) {
  const scope = splitScope(user.district_scope);
  return scope.length === 0 || scope.includes(district) || (wisdomDistrict ? scope.includes(wisdomDistrict) : false);
}

function loadForStaff(ctx, applicationId) {
  const app = P.db.all('Applications').find((a) => a.id === applicationId);
  if (!app) fail('Application not found.', 'NOT_FOUND');
  const applicant = P.db.all('Applicants').find((a) => a.id === app.applicant_id) || {};
  if (!inScope(ctx.user, applicant.district || '', app.wisdom_district)) fail('This application is outside your district.', 'FORBIDDEN');
  return { app, applicant };
}

function visibleApplications(ctx) {
  const byId = {};
  P.db.all('Applicants').forEach((a) => { byId[a.id] = a; });
  return P.db.all('Applications')
    .map((app) => ({ app, ap: byId[app.applicant_id] || {} }))
    .filter(({ app, ap }) => inScope(ctx.user, ap.district || '', app.wisdom_district));
}

const userLabel = (id) => {
  const u = id && findUserById(id);
  return u ? (u.name || u.email) : '';
};

function logRevision(ctx, applicationId, field, oldValue, newValue, reason) {
  P.db.insert('Revisions', {
    id: P.uuid(), application_id: applicationId, field, old_value: clean(oldValue, 200), new_value: clean(newValue, 200),
    reason: clean(reason, 300), by: ctx.user.id, at: isoNow(),
  });
}

ACTIONS.meta = {
  fn: () => ({
    criteria: SCORE_CRITERIA, grades: GRADES, fund_types: FUND_TYPES, statuses: STATUSES, streams: STREAMS,
    categories: CATEGORIES, house: HOUSE, fin_conditions: FIN_CONDITIONS, zakat_categories: ZAKAT_CATEGORIES,
    connections: CONNECTIONS, renewal_decisions: RENEWAL_DECISIONS, wisdom_districts: wisdomDistricts(),
  }),
};

ACTIONS['admin.dashboard'] = {
  ...STAFF,
  fn: (ctx) => {
    const rows = visibleApplications(ctx);
    const ids = new Set(rows.map(({ app }) => app.id));
    const counts = {};
    rows.forEach(({ app }) => { counts[app.status] = (counts[app.status] || 0) + 1; });
    const toReview = P.db.all('Documents').filter((d) => d.status === 'under_review' && ids.has(d.application_id)).length;
    const pending = P.db.all('Pending').filter((p) => p.status === 'open' && ids.has(p.application_id));
    return {
      total: rows.length, counts, docs_to_review: toReview, pending_items: pending.length,
      needs_call: pending.filter((p) => p.flag === 'call').length,
      verifications_due: P.db.all('Verifications').filter((v) => v.status === 'assigned' && ids.has(v.application_id)).length,
      claims: P.db.all('Claims').filter((c) => c.status === 'pending').length,
    };
  },
};

ACTIONS['admin.apps'] = {
  ...STAFF,
  fn: (ctx) => ({
    rows: visibleApplications(ctx)
      .sort((a, b) => (a.app.created_at < b.app.created_at ? 1 : -1))
      .slice(0, 3000)
      .map(({ app, ap }) => ({
        id: app.id, application_no: app.application_no, status: app.status, course: app.course, category: app.category,
        stream: app.stream, college: app.college, name: ap.full_name || '', district: ap.district || '',
        wisdom_district: app.wisdom_district, phone: ap.phone || '', scheme_year: app.scheme_year,
        monthly_amount: app.monthly_amount, fund_type: app.fund_type, grade: app.grade, score: app.score,
        submitted_at: app.submitted_at, legacy: Boolean(ap.legacy),
      })),
  }),
};

ACTIONS['admin.app'] = {
  ...STAFF,
  fn: (ctx, d) => {
    const { app, applicant } = loadForStaff(ctx, d.id);
    const types = P.db.all('DocTypes');
    const docs = P.db.all('Documents').filter((x) => x.application_id === app.id && x.status !== 'removed')
      .sort((a, b) => (a.uploaded_at < b.uploaded_at ? 1 : -1)).map((x) => docView(x, types));
    const events = {};
    P.db.all('Events').forEach((e) => { events[e.id] = e; });
    return {
      application: app,
      applicant: Object.assign({}, applicant, { claim_email: undefined }),
      docs,
      pending: P.db.all('Pending').filter((p) => p.application_id === app.id && p.status === 'open'),
      verifications: P.db.all('Verifications').filter((v) => v.application_id === app.id)
        .map((v) => Object.assign({}, v, { verifier: userLabel(v.verifier_id) })),
      interviews: P.db.all('Interviews').filter((i) => i.application_id === app.id)
        .map((i) => Object.assign({}, i, { interviewer: userLabel(i.interviewer_id), scores: safeJson(i.scores) })),
      invitations: P.db.all('Invitations').filter((i) => i.application_id === app.id)
        .map((i) => Object.assign({}, i, { event: events[i.event_id] ? events[i.event_id].name : '' })),
      renewals: P.db.all('Renewals').filter((r) => r.application_id === app.id)
        .sort((a, b) => (a.period < b.period ? 1 : -1)),
      payments: P.db.all('Payments').filter((p) => p.application_id === app.id)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
      revisions: P.db.all('Revisions').filter((r) => r.application_id === app.id)
        .sort((a, b) => (a.at < b.at ? 1 : -1)).map((r) => Object.assign({}, r, { by: userLabel(r.by) })),
      bank_status: (P.db.all('BankAccounts').find((b) => b.application_id === app.id) || {}).status || '',
    };
  },
};

function safeJson(s) {
  try {
    return s ? JSON.parse(s) : {};
  } catch (e) {
    return {};
  }
}

// Corrections made by the committee. Every changed field keeps its old value in the history.
ACTIONS['admin.app.edit'] = {
  ...STAFF,
  fn: (ctx, d) => P.lock(() => {
    const { app } = loadForStaff(ctx, d.id);
    const ap = pickFields(d.applicant, APPLICANT_FIELDS);
    const ac = pickFields(d.application, APPLICATION_FIELDS);
    const before = P.db.all('Applicants').find((a) => a.id === app.applicant_id) || {};
    Object.keys(ap).forEach((k) => { if (String(before[k] ?? '') !== String(ap[k] ?? '')) logRevision(ctx, app.id, 'applicant.' + k, before[k], ap[k], d.reason || 'Correction'); });
    Object.keys(ac).forEach((k) => { if (String(app[k] ?? '') !== String(ac[k] ?? '')) logRevision(ctx, app.id, k, app[k], ac[k], d.reason || 'Correction'); });
    if (Object.keys(ap).length) P.db.update('Applicants', app.applicant_id, Object.assign(ap, { updated_at: isoNow() }));
    if (Object.keys(ac).length) P.db.update('Applications', app.id, Object.assign(ac, { updated_at: isoNow() }));
    audit(ctx.user, 'application.edited', 'application', app.id, { fields: Object.keys(Object.assign({}, ap, ac)) });
    return { ok: true };
  }),
};

ACTIONS['admin.docfile'] = {
  ...STAFF,
  fn: (ctx, d) => {
    const doc = P.db.all('Documents').find((x) => x.id === d.id);
    if (!doc) fail('Document not found.', 'NOT_FOUND');
    loadForStaff(ctx, doc.application_id);
    audit(ctx.user, 'document.viewed', 'document', doc.id);
    return P.files.read(doc.file_id, doc.file_name, doc.mime);
  },
};

ACTIONS['admin.review'] = {
  ...STAFF,
  fn: (ctx, d) => P.lock(() => {
    const decision = d.decision;
    if (!['accepted', 'reupload'].includes(decision)) fail('Unknown decision.', 'INVALID');
    const reason = clean(d.reason, 300);
    if (decision === 'reupload' && !reason) fail('A reason is required when asking for a new upload.', 'INVALID');
    const doc = P.db.all('Documents').find((x) => x.id === d.id);
    if (!doc) fail('Document not found.', 'NOT_FOUND');
    const { app } = loadForStaff(ctx, doc.application_id);
    const type = P.db.all('DocTypes').find((t) => t.id === doc.doc_type_id) || { label_en: 'document' };
    P.db.update('Documents', doc.id, {
      status: decision, reason: decision === 'reupload' ? reason : '', reviewed_by: ctx.user.id, reviewed_at: isoNow(),
    });
    if (decision === 'reupload') {
      if (!doc.renewal_id && ['submitted', 'documents_requested'].includes(app.status)) {
        P.db.update('Applications', app.id, { status: 'documents_requested', updated_at: isoNow() });
      }
      addPending(app.id, 'reupload', 'Upload again: ' + type.label_en,
        { doc_type_id: doc.doc_type_id, renewal_id: doc.renewal_id, due_on: istDate(7) });
      queueMail(app.applicant_id, 'reupload', 'Please upload your ' + type.label_en + ' again',
        mailText(['Your ' + type.label_en + ' needs to be uploaded again.', 'Reason: ' + reason,
          'Sign in to the portal to upload it.']));
    }
    audit(ctx.user, 'document.' + decision, 'document', doc.id, { reason });
    return { ok: true };
  }),
};

const REASON_STATUSES = ['on_hold', 'discontinued', 'completed', 'not_selected'];

ACTIONS['admin.status'] = {
  ...STAFF,
  fn: (ctx, d) => P.lock(() => {
    if (!STATUSES.includes(d.status)) fail('Unknown status.', 'INVALID');
    const { app } = loadForStaff(ctx, d.id);
    const reason = clean(d.reason, 300);
    if (REASON_STATUSES.includes(d.status) && !reason) fail('Please give a reason for this status.', 'INVALID');
    P.db.update('Applications', app.id, { status: d.status, status_note: reason || app.status_note, updated_at: isoNow() });
    logRevision(ctx, app.id, 'status', app.status, d.status, reason);
    audit(ctx.user, 'application.status', 'application', app.id, { from: app.status, to: d.status });
    return { ok: true };
  }),
};

// Change of the monthly amount: always with a reason, always in the revision history.
ACTIONS['admin.amount'] = {
  ...STAFF,
  fn: (ctx, d) => P.lock(() => {
    const { app } = loadForStaff(ctx, d.id);
    const amount = coerce(d.monthly_amount, 'n', 'Amount');
    const reason = clean(d.reason, 300);
    if (amount === null) fail('Please enter the amount.', 'INVALID');
    if (!reason) fail('Please give a reason for the change.', 'INVALID');
    logRevision(ctx, app.id, 'monthly_amount', app.monthly_amount, amount, reason);
    P.db.update('Applications', app.id, { monthly_amount: amount, updated_at: isoNow() });
    audit(ctx.user, 'application.amount', 'application', app.id, { from: app.monthly_amount, to: amount });
    return { ok: true };
  }),
};

ACTIONS['admin.cycles'] = {
  ...STAFF,
  fn: () => ({ cycles: P.db.all('Cycles').sort((a, b) => b.year - a.year) }),
};

ACTIONS['admin.cycle.save'] = {
  ...MASTER,
  fn: (ctx, d) => P.lock(() => {
    const c = P.db.all('Cycles').find((x) => x.id === d.id);
    if (!c) fail('Cycle not found.', 'NOT_FOUND');
    const patch = {};
    if ('is_open' in d) patch.is_open = Boolean(d.is_open);
    if ('closes_on' in d) patch.closes_on = coerce(d.closes_on, 'date', 'Closing date');
    if (patch.is_open) P.db.all('Cycles').filter((x) => x.is_open && x.id !== c.id).forEach((x) => P.db.update('Cycles', x.id, { is_open: false }));
    P.db.update('Cycles', c.id, patch);
    audit(ctx.user, 'cycle.updated', 'cycle', c.id, patch);
    return { ok: true };
  }),
};

ACTIONS['admin.cycle.create'] = {
  ...MASTER,
  fn: (ctx, d) => P.lock(() => {
    const year = Number(d.year);
    if (!Number.isInteger(year) || year < 2020 || year > 2100) fail('Please enter a valid year.', 'INVALID');
    if (P.db.all('Cycles').some((c) => c.year === year)) fail('That scheme year already exists.', 'EXISTS');
    P.db.insert('Cycles', { id: P.uuid(), code: String(year).slice(2), name: 'Scheme ' + year, year, is_open: false, closes_on: '', next_serial: 1 });
    audit(ctx.user, 'cycle.created', 'cycle', String(year));
    return { ok: true };
  }),
};

ACTIONS['admin.settings'] = { ...STAFF, fn: () => ({ wisdom_districts: wisdomDistricts() }) };

ACTIONS['admin.settings.save'] = {
  ...MASTER,
  fn: (ctx, d) => P.lock(() => {
    const list = (Array.isArray(d.wisdom_districts) ? d.wisdom_districts : []).map((x) => clean(x, 60)).filter(Boolean);
    if (list.length === 0) fail('Please keep at least one district.', 'INVALID');
    const value = list.join('|');
    if (P.db.all('Settings').some((s) => s.id === 'wisdom_districts')) P.db.update('Settings', 'wisdom_districts', { value });
    else P.db.insert('Settings', { id: 'wisdom_districts', value });
    audit(ctx.user, 'settings.updated', 'settings', 'wisdom_districts');
    return { ok: true };
  }),
};

ACTIONS['admin.users'] = {
  ...MASTER,
  fn: () => ({
    people: P.db.all('Users').filter((u) => u.role !== 'applicant').map((u) => ({
      ...publicUser(u), active: u.active, allow_password: u.allow_password, last_login: u.last_login,
    })),
    invites: P.db.all('StaffInvites').map((i) => ({
      email: i.email, role: i.role, district_scope: splitScope(i.district_scope), finance: i.finance,
    })),
  }),
};

ACTIONS['admin.invite'] = {
  ...MASTER,
  fn: (ctx, d) => P.lock(() => {
    const email = normEmail(d.email);
    if (!validEmail(email)) fail('Please enter a valid email address.', 'INVALID');
    if (!['verifier', 'admin', 'master'].includes(d.role)) fail('Unknown role.', 'INVALID');
    const scope = joinScope(d.district_scope);
    const finance = Boolean(d.finance);
    const existing = findUserByEmail(email);
    if (existing) {
      guardLastMaster(existing, d.role, true);
      P.db.update('Users', existing.id, { role: d.role, district_scope: scope, finance, active: true });
    } else {
      const inv = P.db.all('StaffInvites').find((i) => i.email === email);
      const row = { email, role: d.role, district_scope: scope, finance };
      if (inv) P.db.update('StaffInvites', inv.id, row);
      else P.db.insert('StaffInvites', Object.assign({ id: P.uuid(), created_at: isoNow() }, row));
    }
    audit(ctx.user, 'staff.invited', 'user', email, { role: d.role, scope, finance });
    return { ok: true };
  }),
};

// There must always be at least one active master.
function guardLastMaster(target, newRole, newActive) {
  if (target.role !== 'master') return;
  if (newRole === 'master' && newActive) return;
  const masters = P.db.all('Users').filter((u) => u.role === 'master' && u.active);
  if (masters.length <= 1) fail('There must be at least one active master admin.', 'INVALID');
}

ACTIONS['admin.userupdate'] = {
  ...MASTER,
  fn: (ctx, d) => P.lock(() => {
    const u = findUserById(d.id);
    if (!u || u.role === 'applicant') fail('Person not found.', 'NOT_FOUND');
    const patch = {};
    if ('active' in d) patch.active = Boolean(d.active);
    if ('finance' in d) patch.finance = Boolean(d.finance);
    if ('allow_password' in d) patch.allow_password = Boolean(d.allow_password);
    if ('district_scope' in d) patch.district_scope = joinScope(d.district_scope);
    if ('role' in d) {
      if (!['verifier', 'admin', 'master'].includes(d.role)) fail('Unknown role.', 'INVALID');
      patch.role = d.role;
    }
    guardLastMaster(u, 'role' in patch ? patch.role : u.role, 'active' in patch ? patch.active : u.active);
    P.db.update('Users', u.id, patch);
    audit(ctx.user, 'staff.updated', 'user', u.id, patch);
    return { ok: true };
  }),
};

ACTIONS['admin.audit'] = {
  ...MASTER,
  fn: () => {
    const users = {};
    P.db.all('Users').forEach((u) => { users[u.id] = u.email; });
    return {
      rows: P.db.all('Audit').sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 300)
        .map((r) => ({ at: r.at, who: users[r.actor] || r.actor, action: r.action, entity: r.entity, entity_id: r.entity_id, detail: r.detail })),
    };
  },
};
