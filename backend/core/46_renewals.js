/* Six-monthly renewals: the scholar updates details and uploads the latest result and fee receipt,
   then the committee records one of the decisions it already uses (continue, amount up or down, hold, close, ...). */

const RENEWAL_FIELDS = {
  current_year: 'n', completion_month: 'month', course: 'short', college: 'short', last_exam: 'short',
  result_percentage: 'n', phone: 'short', note: 'long',
};
const FINAL_DECISIONS = ['continue', 'continue_increase', 'continue_reduce', 'on_hold', 'no_need', 'removed', 'course_completed', 'closed'];
const DECISION_STATUS = {
  continue: 'active', continue_increase: 'active', continue_reduce: 'active', on_hold: 'on_hold',
  no_need: 'discontinued', removed: 'discontinued', closed: 'discontinued', course_completed: 'completed',
  call_back: 'renewal_review', file_missing: 'renewal_review', not_attending: 'renewal_review',
};
const NEEDS_REMARKS = ['continue_reduce', 'on_hold', 'removed', 'closed', 'not_attending', 'call_back', 'file_missing'];

ACTIONS['renewal.open'] = {
  ...STAFF,
  fn: (ctx, d) => P.lock(() => {
    const period = clean(d.period, 20);
    if (!period) fail('Please name the renewal period, for example 2026-H2.', 'INVALID');
    const due = d.due_on ? coerce(d.due_on, 'date', 'Due date') : istDate(14);
    const chosen = Array.isArray(d.application_ids) && d.application_ids.length ? new Set(d.application_ids) : null;
    const types = P.db.all('DocTypes').filter((t) => t.stage === 'renewal' && t.active);
    const existing = new Set(P.db.all('Renewals').filter((r) => r.period === period).map((r) => r.application_id));
    let created = 0;
    visibleApplications(ctx).map(({ app }) => app)
      .filter((a) => a.status === 'active' && (!chosen || chosen.has(a.id)) && !existing.has(a.id))
      .forEach((a) => {
        const r = {
          id: P.uuid(), application_id: a.id, period, status: 'open', opened_at: isoNow(), decision: '', decided_by: '', decided_at: '',
          submitted_at: '',
        };
        P.db.insert('Renewals', r);
        P.db.update('Applications', a.id, { status: 'renewal_due', updated_at: isoNow() });
        addPending(a.id, 'renewal', 'Renewal ' + period + ': update your details and upload your latest result and fee receipt', { renewal_id: r.id, due_on: due });
        queueMail(a.applicant_id, 'renewal_open', 'Your Vidyanidhi renewal is open',
          mailText(['Your scholarship renewal for ' + period + ' is open (due ' + due + ').',
            'Please sign in to the portal, update your details and upload your latest exam result and fee receipt.']));
        created++;
      });
    audit(ctx.user, 'renewal.opened', 'renewal', period, { created, types: types.length });
    return { created };
  }),
};

ACTIONS['renewal.mine'] = {
  roles: APPLICANT_ONLY,
  fn: (ctx) => {
    const app = myApplication(ctx.user.id);
    if (!app) return { renewals: [] };
    const allTypes = P.db.all('DocTypes').filter((t) => t.active).sort((a, b) => a.sort - b.sort);
    const docs = P.db.all('Documents').filter((x) => x.application_id === app.id && x.renewal_id).sort((a, b) => b.version - a.version);
    return {
      doc_types: allTypes.filter((t) => t.stage === 'renewal'),
      renewals: P.db.all('Renewals').filter((r) => r.application_id === app.id)
        .sort((a, b) => (a.period < b.period ? 1 : -1))
        .map((r) => ({
          id: r.id, period: r.period, status: r.status, submitted_at: r.submitted_at, current_year: r.current_year,
          completion_month: r.completion_month, course: r.course, college: r.college, last_exam: r.last_exam,
          result_percentage: r.result_percentage, phone: r.phone, note: r.note,
          docs: docs.filter((x) => x.renewal_id === r.id).map((x) => docView(x, allTypes)),
        })),
      application: { course: app.course, college: app.college, year_of_study: app.year_of_study, completion_month: app.completion_month },
    };
  },
};

ACTIONS['renewal.submit'] = {
  roles: APPLICANT_ONLY,
  fn: (ctx, d) => P.lock(() => {
    const app = myApplication(ctx.user.id);
    const r = app && P.db.all('Renewals').find((x) => x.id === d.id && x.application_id === app.id);
    if (!r) fail('Renewal not found.', 'NOT_FOUND');
    if (r.status !== 'open') fail('This renewal has already been sent.', 'LOCKED');
    const f = pickFields(d.fields, RENEWAL_FIELDS);
    if (!f.current_year || !f.completion_month) fail('Please fill in your current year and the month your course ends.', 'INCOMPLETE');
    const types = P.db.all('DocTypes').filter((t) => t.stage === 'renewal' && t.active && t.required);
    const docs = P.db.all('Documents').filter((x) => x.renewal_id === r.id);
    const missing = types.filter((t) => !docs.some((x) => x.doc_type_id === t.id)).map((t) => t.label_en);
    if (missing.length) fail('Please upload: ' + missing.join(', ') + '.', 'INCOMPLETE');
    P.db.update('Renewals', r.id, Object.assign(f, { status: 'submitted', submitted_at: isoNow() }));
    P.db.update('Applications', app.id, { status: 'renewal_review', updated_at: isoNow() });
    closePending(app.id, (p) => p.kind === 'renewal' && p.renewal_id === r.id);
    audit(ctx.user, 'renewal.submitted', 'renewal', r.id);
    return { ok: true };
  }),
};

ACTIONS['renewal.list'] = {
  ...STAFF,
  fn: (ctx, d) => {
    const { apps, people } = indexAppsAndPeople();
    return {
      rows: P.db.all('Renewals').filter((r) => (!d.period || r.period === d.period) && (!d.status || r.status === d.status))
        .map((r) => {
          const a = apps[r.application_id] || {};
          const p = people[a.applicant_id] || {};
          return Object.assign({}, r, {
            application_no: a.application_no, name: p.full_name, district: p.district, wisdom_district: a.wisdom_district,
            monthly_amount: a.monthly_amount, course: a.course, scheme_year: a.scheme_year,
          });
        })
        .filter((r) => inScope(ctx.user, r.district || '', r.wisdom_district))
        .sort((a, b) => (a.submitted_at < b.submitted_at ? 1 : -1)),
    };
  },
};

ACTIONS['renewal.decide'] = {
  ...STAFF,
  fn: (ctx, d) => P.lock(() => {
    const r = P.db.all('Renewals').find((x) => x.id === d.id);
    if (!r) fail('Renewal not found.', 'NOT_FOUND');
    const { app } = loadForStaff(ctx, r.application_id);
    const decision = coerce(d.decision, RENEWAL_DECISIONS, 'Decision');
    if (!decision) fail('Please choose a decision.', 'INVALID');
    const remarks = clean(d.remarks, 300);
    if (NEEDS_REMARKS.includes(decision) && !remarks) fail('Please add a remark for this decision.', 'INVALID');
    const appPatch = { status: DECISION_STATUS[decision], updated_at: isoNow() };

    if (decision === 'continue_increase' || decision === 'continue_reduce') {
      const amount = coerce(d.new_amount, 'n', 'New amount');
      if (!amount) fail('Please enter the new monthly amount.', 'INVALID');
      if (decision === 'continue_increase' && amount <= (app.monthly_amount || 0)) fail('The new amount must be higher than the current one.', 'INVALID');
      if (decision === 'continue_reduce' && amount >= (app.monthly_amount || 0)) fail('The new amount must be lower than the current one.', 'INVALID');
      logRevision(ctx, app.id, 'monthly_amount', app.monthly_amount, amount, remarks || 'Renewal ' + r.period);
      appPatch.monthly_amount = amount;
    }
    // Details the scholar confirmed become the case's current details.
    if (FINAL_DECISIONS.includes(decision)) {
      ['current_year:year_of_study', 'completion_month:completion_month', 'course:course', 'college:college'].forEach((pair) => {
        const [from, to] = pair.split(':');
        if (r[from] !== null && r[from] !== '' && r[from] !== undefined) appPatch[to] = r[from];
      });
    }
    if (appPatch.status !== app.status) logRevision(ctx, app.id, 'status', app.status, appPatch.status, remarks || 'Renewal ' + r.period);
    P.db.update('Applications', app.id, appPatch);
    P.db.update('Renewals', r.id, {
      decision, remarks, new_amount: appPatch.monthly_amount === undefined ? null : appPatch.monthly_amount,
      status: FINAL_DECISIONS.includes(decision) ? 'decided' : 'submitted', decided_by: ctx.user.id, decided_at: isoNow(),
    });
    if (['call_back', 'file_missing'].includes(decision)) {
      addPending(app.id, 'renewal', decision === 'file_missing' ? 'Please send the missing documents' : 'Please call the committee office', { renewal_id: r.id, due_on: istDate(7) });
    }
    queueMail(app.applicant_id, 'renewal_decision', 'Your Vidyanidhi renewal',
      mailText([FINAL_DECISIONS.includes(decision) ? 'Your renewal for ' + r.period + ' has been reviewed.' : 'We need something more for your renewal.',
        remarks ? 'Note: ' + remarks : 'Sign in to the portal to see the details.']));
    audit(ctx.user, 'renewal.decided', 'renewal', r.id, { decision });
    return { ok: true };
  }),
};
