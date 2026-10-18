/* Admin actions. Every one is checked for staff access and the staff member's district scope. */

const STAFF = { staff: true };
const MASTER = { staff: true, master: true };

function inScope(user, district) {
  const scope = splitScope(user.district_scope);
  return scope.length === 0 || scope.includes(district);
}

function loadForStaff(ctx, applicationId) {
  const app = P.db.all('Applications').find((a) => a.id === applicationId);
  if (!app) fail('Application not found.', 'NOT_FOUND');
  const applicant = P.db.all('Applicants').find((a) => a.id === app.applicant_id) || {};
  if (!inScope(ctx.user, applicant.district || '')) fail('This application is outside your district.', 'FORBIDDEN');
  return { app, applicant };
}

function visibleApplications(ctx) {
  const applicants = P.db.all('Applicants');
  const byId = {};
  applicants.forEach((a) => { byId[a.id] = a; });
  return P.db.all('Applications')
    .map((app) => ({ app, ap: byId[app.applicant_id] || {} }))
    .filter(({ ap }) => inScope(ctx.user, ap.district || ''));
}

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
    };
  },
};

ACTIONS['admin.apps'] = {
  ...STAFF,
  fn: (ctx) => ({
    rows: visibleApplications(ctx)
      .sort((a, b) => (a.app.created_at < b.app.created_at ? 1 : -1))
      .slice(0, 2000)
      .map(({ app, ap }) => ({
        id: app.id, application_no: app.application_no, status: app.status, course: app.course,
        college: app.college, name: ap.full_name || '', district: ap.district || '', phone: ap.phone || '',
        submitted_at: app.submitted_at,
      })),
  }),
};

ACTIONS['admin.app'] = {
  ...STAFF,
  fn: (ctx, d) => {
    const { app, applicant } = loadForStaff(ctx, d.id);
    const types = P.db.all('DocTypes');
    const docs = P.db.all('Documents').filter((x) => x.application_id === app.id)
      .sort((a, b) => (a.uploaded_at < b.uploaded_at ? 1 : -1)).map((x) => docView(x, types));
    const pending = P.db.all('Pending').filter((p) => p.application_id === app.id && p.status === 'open');
    return { application: app, applicant, docs, pending };
  },
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
      if (['submitted', 'documents_requested'].includes(app.status)) {
        P.db.update('Applications', app.id, { status: 'documents_requested', updated_at: isoNow() });
      }
      P.db.insert('Pending', {
        id: P.uuid(), application_id: app.id, kind: 'reupload', title: 'Upload again: ' + type.label_en,
        doc_type_id: doc.doc_type_id, due_on: istDate(7), status: 'open', created_at: isoNow(), closed_at: '',
        reminders: 0, last_reminder: '', flag: '',
      });
      queueMail(app.applicant_id, 'reupload', 'Please upload your ' + type.label_en + ' again',
        mailText(['Your ' + type.label_en + ' needs to be uploaded again.', 'Reason: ' + reason,
          'Sign in to the portal to upload it.']));
    }
    audit(ctx.user, 'document.' + decision, 'document', doc.id, { reason });
    return { ok: true };
  }),
};

ACTIONS['admin.status'] = {
  ...STAFF,
  fn: (ctx, d) => P.lock(() => {
    if (!STATUSES.includes(d.status)) fail('Unknown status.', 'INVALID');
    const { app } = loadForStaff(ctx, d.id);
    P.db.update('Applications', app.id, { status: d.status, updated_at: isoNow() });
    audit(ctx.user, 'application.status', 'application', app.id, { from: app.status, to: d.status });
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
