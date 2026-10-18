/* Interviews (digital score sheet) and the final decision.
   Each interviewer saves a separate record per round; the average is shown. The master admin decides. */

// Validate the chosen options and add up the points. The total is never taken from the client.
function scoreSheet(input) {
  const scores = {};
  let total = 0;
  SCORE_CRITERIA.forEach((c) => {
    if (!input || input[c.key] === undefined || input[c.key] === '' || input[c.key] === null) return;
    if (c.range) {
      const n = Number(input[c.key]);
      if (!Number.isFinite(n) || n < 0 || n > c.max) fail(c.label + ' must be between 0 and ' + c.max + '.', 'INVALID');
      scores[c.key] = n;
      total += n;
    } else {
      const opt = c.options.find(([k]) => k === input[c.key]);
      if (!opt) fail(c.label + ' has an invalid choice.', 'INVALID');
      scores[c.key] = opt[0];
      total += opt[1];
    }
  });
  return { scores, total };
}

ACTIONS['interview.save'] = {
  ...STAFF,
  fn: (ctx, d) => P.lock(() => {
    const { app } = loadForStaff(ctx, d.application_id);
    const round = d.round === 'renewal' ? 'renewal' : 'initial';
    const { scores, total } = scoreSheet(d.scores);
    const grade = d.grade ? coerce(d.grade, GRADES, 'Grade') : '';
    const fundType = d.fund_type ? coerce(d.fund_type, FUND_TYPES, 'Fund type') : '';
    const amount = d.recommended_amount === undefined || d.recommended_amount === '' ? null : coerce(d.recommended_amount, 'n', 'Amount');
    const mode = ['in_person', 'online'].includes(d.mode) ? d.mode : 'in_person';
    const row = {
      application_id: app.id, round, event_id: clean(d.event_id, 60), mode, interviewer_id: ctx.user.id,
      scores: JSON.stringify(scores), total, grade, recommended_amount: amount, fund_type: fundType,
      remarks: clean(d.remarks, 1000), updated_at: isoNow(),
    };
    const existing = P.db.all('Interviews').find((i) => i.application_id === app.id && i.round === round && i.interviewer_id === ctx.user.id);
    if (existing) P.db.update('Interviews', existing.id, row);
    else P.db.insert('Interviews', Object.assign({ id: P.uuid(), created_at: isoNow() }, row));
    // The case carries the latest grade, total and fund type for lists and reports.
    const patch = { updated_at: isoNow() };
    if (round === 'initial') {
      patch.score = total;
      if (grade) patch.grade = grade;
      if (fundType) patch.fund_type = fundType;
    }
    P.db.update('Applications', app.id, patch);
    if (round === 'initial' && ['submitted', 'under_verification', 'interview_scheduled'].includes(app.status)) {
      P.db.update('Applications', app.id, { status: 'decision_pending' });
    }
    audit(ctx.user, 'interview.saved', 'application', app.id, { round, total, grade });
    return { total };
  }),
};

// Selection, waitlist or rejection. Final approval belongs to the master admin.
ACTIONS['admin.decide'] = {
  ...MASTER,
  fn: (ctx, d) => P.lock(() => {
    const { app } = loadForStaff(ctx, d.application_id);
    if (!['selected', 'not_selected', 'waitlisted'].includes(d.decision)) fail('Unknown decision.', 'INVALID');
    const note = clean(d.note, 300);
    const patch = { status: d.decision, status_note: note, updated_at: isoNow() };
    if (d.decision === 'selected') {
      const amount = coerce(d.amount, 'n', 'Amount');
      if (!amount) fail('Please enter the monthly amount.', 'INVALID');
      const fund = coerce(d.fund_type, FUND_TYPES, 'Fund type');
      if (!fund) fail('Please choose Zakat or non-Zakat funds.', 'INVALID');
      patch.monthly_amount = amount;
      patch.fund_type = fund;
      logRevision(ctx, app.id, 'monthly_amount', app.monthly_amount, amount, 'Selected');
    }
    P.db.update('Applications', app.id, patch);
    logRevision(ctx, app.id, 'status', app.status, d.decision, note || 'Committee decision');

    if (d.decision === 'selected') {
      if (!P.db.all('BankAccounts').some((b) => b.application_id === app.id)) {
        addPending(app.id, 'bank', 'Enter your bank account details', { due_on: istDate(10) });
      }
      queueMail(app.applicant_id, 'selected', 'Congratulations: you have been selected',
        mailText(['You have been selected for the Vidyanidhi scholarship (Rs ' + patch.monthly_amount + ' a month).',
          'Please sign in to the portal and enter your bank account details so that we can make the payment.']));
    } else if (d.decision === 'not_selected') {
      queueMail(app.applicant_id, 'not_selected', 'Your Vidyanidhi application',
        mailText(['Thank you for applying. After careful consideration your application could not be taken forward this time.',
          'We wish you every success in your studies.']));
    } else {
      queueMail(app.applicant_id, 'waitlisted', 'Your Vidyanidhi application',
        mailText(['Your application has been placed on the waiting list. We will contact you if a place becomes available.']));
    }
    audit(ctx.user, 'application.decided', 'application', app.id, { decision: d.decision });
    return { ok: true };
  }),
};
