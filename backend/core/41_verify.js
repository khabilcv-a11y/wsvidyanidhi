/* Field verification: an admin assigns a local Wisdom bearer, who fills a short visit form on a phone.
   Verifiers see only the cases assigned to them, and only name, address, contact and guardian details. */

const VERIFIER_ONLY = { roles: ['verifier'] };
const VERIFY_FIELDS = {
  guardian_ok: 'bool', house: HOUSE, house_note: 'short', fin_condition: FIN_CONDITIONS, zakat_eligible: ['yes', 'no'],
  category: ZAKAT_CATEGORIES, wisdom_connection: CONNECTIONS, remarks: 'long', wisdom_district: 'short',
};

ACTIONS['admin.verifiers'] = {
  ...STAFF,
  fn: () => ({
    verifiers: P.db.all('Users').filter((u) => u.role === 'verifier' && u.active)
      .map((u) => ({ id: u.id, name: u.name || u.email, email: u.email, districts: splitScope(u.district_scope) })),
  }),
};

ACTIONS['admin.verify.assign'] = {
  ...STAFF,
  fn: (ctx, d) => P.lock(() => {
    const { app } = loadForStaff(ctx, d.application_id);
    const verifier = findUserById(d.verifier_id);
    if (!verifier || !verifier.active || !['verifier', 'admin', 'master'].includes(verifier.role)) fail('Please choose a field verifier.', 'INVALID');
    const due = d.due_on ? coerce(d.due_on, 'date', 'Due date') : istDate(14);
    const open = P.db.all('Verifications').find((v) => v.application_id === app.id && v.status === 'assigned');
    if (open) {
      P.db.update('Verifications', open.id, { verifier_id: verifier.id, due_on: due, assigned_by: ctx.user.id, assigned_at: isoNow() });
    } else {
      P.db.insert('Verifications', {
        id: P.uuid(), application_id: app.id, verifier_id: verifier.id, assigned_by: ctx.user.id, assigned_at: isoNow(),
        due_on: due, status: 'assigned', guardian_ok: false, submitted_at: '', on_behalf: false,
      });
    }
    if (['submitted', 'documents_requested'].includes(app.status)) {
      P.db.update('Applications', app.id, { status: 'under_verification', updated_at: isoNow() });
    }
    queueMail(verifier.id, 'verification', 'A new verification visit is assigned to you',
      mailText(['A new verification visit has been assigned to you (due ' + due + ').',
        'Sign in to the portal to see the details and to fill in the visit form.']));
    audit(ctx.user, 'verification.assigned', 'application', app.id, { verifier: verifier.email });
    return { ok: true };
  }),
};

function saveVerification(v, d, extra) {
  const fields = pickFields(d.fields, VERIFY_FIELDS);
  const required = ['house', 'fin_condition', 'zakat_eligible', 'category', 'wisdom_connection'];
  const missing = required.filter((k) => !fields[k]);
  if (missing.length) fail('Please answer: ' + missing.map((k) => k.replace(/_/g, ' ')).join(', ') + '.', 'INCOMPLETE');
  P.db.update('Verifications', v.id, Object.assign(fields, { status: 'submitted', submitted_at: isoNow() }, extra || {}));
  if (fields.wisdom_district) P.db.update('Applications', v.application_id, { wisdom_district: fields.wisdom_district });
}

ACTIONS['verify.mine'] = {
  ...VERIFIER_ONLY,
  fn: (ctx) => {
    const apps = {};
    P.db.all('Applications').forEach((a) => { apps[a.id] = a; });
    const people = {};
    P.db.all('Applicants').forEach((a) => { people[a.id] = a; });
    return {
      visits: P.db.all('Verifications').filter((v) => v.verifier_id === ctx.user.id && v.status !== 'reviewed')
        .sort((a, b) => (a.due_on < b.due_on ? -1 : 1))
        .map((v) => {
          const a = apps[v.application_id] || {};
          const p = people[a.applicant_id] || {};
          return { id: v.id, status: v.status, due_on: v.due_on, application_no: a.application_no, name: p.full_name, district: p.district };
        }),
    };
  },
};

ACTIONS['verify.get'] = {
  ...VERIFIER_ONLY,
  fn: (ctx, d) => {
    const v = P.db.all('Verifications').find((x) => x.id === d.id && x.verifier_id === ctx.user.id);
    if (!v) fail('Visit not found.', 'NOT_FOUND');
    const a = P.db.all('Applications').find((x) => x.id === v.application_id) || {};
    const p = P.db.all('Applicants').find((x) => x.id === a.applicant_id) || {};
    return {
      visit: v,
      student: {
        application_no: a.application_no, name: p.full_name, address: p.address, district: p.district, phone: p.phone,
        guardian_name: p.guardian_name, guardian_phone: p.guardian_phone, guardian_occupation: p.guardian_occupation,
      },
      wisdom_districts: wisdomDistricts(),
    };
  },
};

ACTIONS['verify.submit'] = {
  ...VERIFIER_ONLY,
  fn: (ctx, d) => P.lock(() => {
    const v = P.db.all('Verifications').find((x) => x.id === d.id && x.verifier_id === ctx.user.id);
    if (!v) fail('Visit not found.', 'NOT_FOUND');
    if (v.status === 'reviewed') fail('This visit has already been reviewed.', 'LOCKED');
    saveVerification(v, d);
    audit(ctx.user, 'verification.submitted', 'application', v.application_id);
    return { ok: true };
  }),
};

// An admin may fill the form for a bearer who cannot use the portal.
ACTIONS['admin.verify.submit'] = {
  ...STAFF,
  fn: (ctx, d) => P.lock(() => {
    const { app } = loadForStaff(ctx, d.application_id);
    let v = P.db.all('Verifications').find((x) => x.application_id === app.id && x.status !== 'reviewed');
    if (!v) {
      v = {
        id: P.uuid(), application_id: app.id, verifier_id: ctx.user.id, assigned_by: ctx.user.id, assigned_at: isoNow(),
        due_on: '', status: 'assigned', guardian_ok: false, submitted_at: '', on_behalf: true,
      };
      P.db.insert('Verifications', v);
    }
    saveVerification(v, d, { on_behalf: true });
    audit(ctx.user, 'verification.entered', 'application', app.id);
    return { ok: true };
  }),
};

ACTIONS['admin.verify.review'] = {
  ...STAFF,
  fn: (ctx, d) => P.lock(() => {
    const v = P.db.all('Verifications').find((x) => x.id === d.id);
    if (!v) fail('Visit not found.', 'NOT_FOUND');
    loadForStaff(ctx, v.application_id);
    if (v.status !== 'submitted') fail('The report has not been submitted yet.', 'INVALID');
    P.db.update('Verifications', v.id, { status: 'reviewed' });
    return { ok: true };
  }),
};
