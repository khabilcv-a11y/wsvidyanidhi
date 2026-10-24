/* Applicant actions: consent, application form, submission and document upload. */

const APPLICANT_ONLY = ['applicant'];
const INTERNAL_APP_FIELDS = ['grade', 'score', 'fund_type', 'status_note', 'wisdom_district'];

// Applicants never see committee-only fields (grade, score, fund type, internal notes).
function applicantView(app) {
  if (!app) return null;
  const out = Object.assign({}, app);
  INTERNAL_APP_FIELDS.forEach((k) => { delete out[k]; });
  if (!['selected', 'active', 'renewal_due', 'renewal_review', 'on_hold', 'completed'].includes(app.status)) delete out.monthly_amount;
  return out;
}

function openCycle() {
  return P.db.all('Cycles').find((c) => c.is_open) || null;
}

function myApplication(uid) {
  const open = openCycle();
  const mine = P.db.all('Applications')
    .filter((a) => a.applicant_id === uid)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return mine.find((a) => open && a.cycle_id === open.id) || mine[0] || null;
}

function docView(d, types) {
  const t = types.find((x) => x.id === d.doc_type_id);
  return {
    id: d.id, doc_type_id: d.doc_type_id, renewal_id: d.renewal_id, label: t ? t.label_en : '', status: d.status, size: d.size || 0,
    reason: d.reason, version: d.version, uploaded_at: d.uploaded_at, file_name: d.file_name, mime: d.mime,
  };
}

ACTIONS['app.load'] = {
  roles: APPLICANT_ONLY,
  fn: (ctx) => {
    const uid = ctx.user.id;
    const allTypes = P.db.all('DocTypes').filter((t) => t.active).sort((a, b) => a.sort - b.sort);
    const types = allTypes.filter((t) => t.stage !== 'renewal');
    const application = myApplication(uid);
    const docs = application
      ? P.db.all('Documents').filter((d) => d.application_id === application.id && !d.renewal_id && d.status !== 'removed')
          .sort((a, b) => b.version - a.version).map((d) => docView(d, allTypes))
      : [];
    const pending = application
      ? P.db.all('Pending').filter((p) => p.application_id === application.id && p.status === 'open')
          .sort((a, b) => (a.due_on < b.due_on ? -1 : 1))
          .map((p) => ({ id: p.id, kind: p.kind, title: p.title, due_on: p.due_on, doc_type_id: p.doc_type_id, renewal_id: p.renewal_id }))
      : [];
    return {
      consented: P.db.all('Consents').some((c) => c.user_id === uid && c.kind === 'privacy'),
      applicant: P.db.all('Applicants').find((a) => a.id === uid) || null,
      application: applicantView(application),
      open_cycle: openCycle(),
      doc_types: types,
      limits: { max_bytes: MAX_FILE_BYTES, mimes: ALLOWED_MIME, max_files: MAX_FILES_PER_DOC, max_total: MAX_DOCS_PER_APPLICATION },
      docs,
      pending,
      claim: P.db.all('Claims').filter((c) => c.user_id === uid).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0] || null,
    };
  },
};

ACTIONS['consent.give'] = {
  roles: APPLICANT_ONLY,
  fn: (ctx, d) => {
    const minor = Boolean(d.is_minor);
    const guardian = clean(d.guardian_name, 100);
    if (minor && !guardian) fail('Please enter the parent or guardian name.', 'INVALID');
    P.db.insert('Consents', {
      id: P.uuid(), user_id: ctx.user.id, kind: 'privacy', version: clean(d.version, 30) || 'v1',
      is_minor: minor, guardian_name: minor ? guardian : '', given_at: isoNow(),
    });
    return { ok: true };
  },
};

ACTIONS['app.start'] = {
  roles: APPLICANT_ONLY,
  fn: (ctx) => P.lock(() => {
    const uid = ctx.user.id;
    const cycle = openCycle();
    if (!cycle) fail('Applications are not open right now.', 'CLOSED');
    const mine = P.db.all('Applications').filter((a) => a.applicant_id === uid);
    if (mine.some((a) => a.cycle_id === cycle.id)) fail('You have already started an application.', 'EXISTS');
    if (mine.some((a) => ['selected', 'active', 'renewal_due', 'renewal_review', 'on_hold'].includes(a.status))) {
      fail('You are already a scholar, so you do not need a new application.', 'EXISTS');
    }
    if (!P.db.all('Applicants').some((a) => a.id === uid)) {
      P.db.insert('Applicants', { id: uid, full_name: ctx.user.name, updated_at: isoNow() });
    }
    const app = {
      id: P.uuid(), applicant_id: uid, cycle_id: cycle.id, scheme_year: String(cycle.year || ''), application_no: '',
      status: 'draft', created_at: isoNow(), updated_at: isoNow(),
    };
    P.db.insert('Applications', app);
    return { id: app.id };
  }),
};

function ownApplication(ctx, id) {
  const a = P.db.all('Applications').find((x) => x.id === id && x.applicant_id === ctx.user.id);
  if (!a) fail('Application not found.', 'NOT_FOUND');
  return a;
}

ACTIONS['app.save'] = {
  roles: APPLICANT_ONLY,
  fn: (ctx, d) => P.lock(() => {
    const app = ownApplication(ctx, d.id);
    if (!EDITABLE.includes(app.status)) fail('This application can no longer be edited.', 'LOCKED');
    const ap = pickFields(d.applicant, APPLICANT_FIELDS);
    const ac = pickFields(d.application, APPLICATION_FIELDS);
    ap.updated_at = isoNow();
    if (P.db.all('Applicants').some((a) => a.id === ctx.user.id)) P.db.update('Applicants', ctx.user.id, ap);
    else P.db.insert('Applicants', Object.assign({ id: ctx.user.id }, ap));
    ac.updated_at = isoNow();
    P.db.update('Applications', app.id, ac);
    return { saved_at: isoNow() };
  }),
};

ACTIONS['app.submit'] = {
  roles: APPLICANT_ONLY,
  fn: (ctx, d) => P.lock(() => {
    const app = ownApplication(ctx, d.id);
    if (!EDITABLE.includes(app.status)) fail('This application has already been submitted.', 'LOCKED');
    const ap = P.db.all('Applicants').find((a) => a.id === ctx.user.id) || {};
    const missing = [
      ['full name', ap.full_name], ['date of birth', ap.dob], ['district', ap.district], ['mobile number', ap.phone],
      ['guardian name', ap.guardian_name], ['course', app.course], ['college', app.college],
    ].filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) fail('Please fill in: ' + missing.join(', ') + '.', 'INCOMPLETE');

    const cycle = P.db.all('Cycles').find((c) => c.id === app.cycle_id);
    let number = app.application_no;
    if (!number) {
      if (!cycle || !cycle.is_open) fail('Applications are closed.', 'CLOSED');
      number = cycle.code + String(cycle.next_serial).padStart(4, '0');
      P.db.update('Cycles', cycle.id, { next_serial: cycle.next_serial + 1 });
      P.db.update('Applications', app.id, { application_no: number });
    }
    P.db.update('Applications', app.id, { status: 'submitted', submitted_at: app.submitted_at || isoNow(), updated_at: isoNow() });

    // One pending item for each required application document that is still missing.
    const docs = P.db.all('Documents').filter((x) => x.application_id === app.id);
    const open = P.db.all('Pending').filter((p) => p.application_id === app.id && p.status === 'open');
    P.db.all('DocTypes').filter((t) => t.required && t.active && t.stage !== 'renewal').forEach((t) => {
      if (!docs.some((x) => x.doc_type_id === t.id) && !open.some((p) => p.doc_type_id === t.id)) {
        addPending(app.id, 'document', t.label_en, { doc_type_id: t.id, due_on: istDate(7) });
      }
    });
    queueMail(ctx.user.id, 'submitted', 'Vidyanidhi application received',
      mailText(['Your application ' + number + ' has been received.',
        'Keep this number safe. To see your application status or add missing documents, use "Check status" on the scholarship website with your application number and mobile number.']));
    audit(ctx.user, 'application.submitted', 'application', app.id, { number });
    return { application_no: number };
  }),
};

function addPending(applicationId, kind, title, extra) {
  const e = extra || {};
  const row = {
    id: P.uuid(), application_id: applicationId, kind, title, doc_type_id: e.doc_type_id || '', renewal_id: e.renewal_id || '',
    due_on: e.due_on || '', status: 'open', created_at: isoNow(), closed_at: '', reminders: 0, last_reminder: '', flag: '',
  };
  P.db.insert('Pending', row);
  return row;
}

function closePending(applicationId, match) {
  P.db.all('Pending').filter((p) => p.application_id === applicationId && p.status === 'open' && match(p))
    .forEach((p) => P.db.update('Pending', p.id, { status: 'closed', closed_at: isoNow() }));
}

ACTIONS['doc.upload'] = {
  roles: APPLICANT_ONLY,
  fn: (ctx, d) => {
    const app = ownApplication(ctx, d.application_id);
    let renewal = null;
    if (d.renewal_id) {
      renewal = P.db.all('Renewals').find((r) => r.id === d.renewal_id && r.application_id === app.id);
      if (!renewal || renewal.status !== 'open') fail('This renewal is not open for uploads.', 'LOCKED');
    } else if (!['draft', 'submitted', 'documents_requested'].includes(app.status)) {
      fail('Documents cannot be added at this stage.', 'LOCKED');
    }
    const type = P.db.all('DocTypes').find((t) => t.id === d.doc_type_id && t.active);
    if (!type) fail('Unknown document type.', 'INVALID');
    if ((type.stage === 'renewal') !== Boolean(renewal)) fail('That document does not belong here.', 'INVALID');
    const mime = clean(d.mime, 40);
    if (!ALLOWED_MIME.includes(mime)) fail('Please upload a JPG, PNG or PDF.', 'INVALID');
    const data = String(d.data || '');
    if (!data || data.length > Math.ceil(MAX_FILE_BYTES * 1.4)) fail('The file is too large. The limit is 2 MB.', 'INVALID');
    if (P.db.all('Documents').filter((x) => x.application_id === app.id).length >= MAX_DOCS_PER_APPLICATION) {
      fail('You have reached the limit of ' + MAX_DOCS_PER_APPLICATION + ' uploaded files. Please contact the scholarship office.', 'LIMIT');
    }

    const previous = P.db.all('Documents')
      .filter((x) => x.application_id === app.id && x.doc_type_id === type.id && (x.renewal_id || '') === (d.renewal_id || ''))
      .sort((a, b) => b.version - a.version);
    if (previous.some((x) => x.status === 'accepted')) fail('This document has already been accepted.', 'LOCKED');
    if (previous.length >= MAX_VERSIONS_PER_DOC) fail('Too many uploads for this document. Please contact the scholarship office.', 'LIMIT');
    const keptNow = previous.filter((x) => !['removed', 'reupload'].includes(x.status)).length;
    if (keptNow >= MAX_FILES_PER_DOC) fail('You can add up to ' + MAX_FILES_PER_DOC + ' files for one document. Remove one to add another.', 'LIMIT');

    const ext = mime === 'application/pdf' ? 'pdf' : mime === 'image/png' ? 'png' : 'jpg';
    const fileName = type.code + '_v' + ((previous[0] ? previous[0].version : 0) + 1) + '.' + ext;
    const fileId = P.files.save(ctx.user.id, fileName, mime, data);

    P.lock(() => {
      P.db.insert('Documents', {
        id: P.uuid(), application_id: app.id, renewal_id: d.renewal_id || '', doc_type_id: type.id, file_id: fileId,
        file_name: fileName, mime, size: Math.round(data.length * 0.75), status: 'under_review', reason: '', reviewed_by: '', reviewed_at: '',
        version: (previous[0] ? previous[0].version : 0) + 1, uploaded_at: isoNow(),
      });
      closePending(app.id, (p) => p.doc_type_id === type.id && (p.renewal_id || '') === (d.renewal_id || ''));
    });
    return { ok: true };
  },
};

// Take back a file that was added by mistake (not once it has been accepted).
ACTIONS['doc.remove'] = {
  roles: APPLICANT_ONLY,
  fn: (ctx, d) => P.lock(() => {
    const doc = P.db.all('Documents').find((x) => x.id === d.id);
    if (!doc) fail('Document not found.', 'NOT_FOUND');
    const app = ownApplication(ctx, doc.application_id);
    if (doc.status === 'accepted') fail('This document has already been accepted.', 'LOCKED');
    if (doc.renewal_id || !['draft', 'submitted', 'documents_requested'].includes(app.status)) fail('Documents cannot be changed at this stage.', 'LOCKED');
    P.db.update('Documents', doc.id, { status: 'removed' });
    const left = P.db.all('Documents').some((x) => x.application_id === app.id && x.doc_type_id === doc.doc_type_id && !x.renewal_id && !['removed', 'reupload'].includes(x.status));
    const type = P.db.all('DocTypes').find((t) => t.id === doc.doc_type_id);
    const open = P.db.all('Pending').some((p) => p.application_id === app.id && p.status === 'open' && p.doc_type_id === doc.doc_type_id);
    if (!left && type && type.required && app.status !== 'draft' && !open) addPending(app.id, 'document', type.label_en, { doc_type_id: type.id, due_on: istDate(7) });
    return { ok: true };
  }),
};

ACTIONS['doc.file'] = {
  roles: APPLICANT_ONLY,
  fn: (ctx, d) => {
    const doc = P.db.all('Documents').find((x) => x.id === d.id);
    if (!doc) fail('Document not found.', 'NOT_FOUND');
    ownApplication(ctx, doc.application_id);
    return P.files.read(doc.file_id, doc.file_name, doc.mime);
  },
};

// Applicant sends corrected documents back to the committee.
ACTIONS['app.resubmit'] = {
  roles: APPLICANT_ONLY,
  fn: (ctx, d) => P.lock(() => {
    const app = ownApplication(ctx, d.id);
    if (app.status !== 'documents_requested') fail('Nothing to send back.', 'LOCKED');
    const stillOpen = P.db.all('Pending').some((p) => p.application_id === app.id && p.status === 'open');
    if (stillOpen) fail('Please upload all requested documents first.', 'INCOMPLETE');
    P.db.update('Applications', app.id, { status: 'submitted', updated_at: isoNow() });
    audit(ctx.user, 'application.resubmitted', 'application', app.id);
    return { ok: true };
  }),
};

// Link an existing (imported) record to this account. An admin approves it.
ACTIONS['claim.request'] = {
  roles: APPLICANT_ONLY,
  fn: (ctx, d) => P.lock(() => {
    const no = clean(d.application_no, 20);
    const mobile = clean(d.mobile, 20).replace(/\D/g, '').slice(-10);
    if (!no || mobile.length < 10) fail('Please enter your application number and the 10-digit mobile number on your application.', 'INVALID');
    throttle('claim:' + ctx.user.id, 5, 3600);
    if (P.db.all('Claims').some((c) => c.user_id === ctx.user.id && c.status === 'pending')) fail('You already have a request waiting for approval.', 'EXISTS');
    P.db.insert('Claims', {
      id: P.uuid(), user_id: ctx.user.id, application_no: no, mobile, note: clean(d.note, 200), status: 'pending',
      created_at: isoNow(), decided_by: '', decided_at: '',
    });
    return { ok: true };
  }),
};
