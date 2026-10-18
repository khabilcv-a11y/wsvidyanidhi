/* Payments. Finance staff build a batch for a period, export the bank file, then mark each payment Paid or Failed.
   Amount = monthly amount x months in the period, never beyond the course end month. */

const PAYABLE_STATUSES = ['active', 'renewal_due', 'renewal_review'];

const monthIndex = (ym) => {
  const m = /^(\d{4})-(\d{2})$/.exec(ym || '');
  return m ? Number(m[1]) * 12 + Number(m[2]) - 1 : null;
};

// Months payable from `startMonth` for at most `months`, stopping at the course end month.
function monthsPayable(app, startMonth, months) {
  const start = monthIndex(startMonth);
  if (start === null) return 0;
  const end = monthIndex(app.completion_month);
  if (end === null) return months;
  return Math.max(0, Math.min(months, end - start + 1));
}

function eligibilityFor(ctx, d) {
  const startMonth = coerce(d.start_month, 'month', 'Start month');
  if (!startMonth) fail('Please choose the first month of the period.', 'INVALID');
  const months = Math.max(1, Math.min(12, Number(d.months) || 6));
  const fund = d.fund_type ? coerce(d.fund_type, FUND_TYPES, 'Fund type') : '';
  const banks = {};
  P.db.all('BankAccounts').forEach((b) => { banks[b.application_id] = b; });
  const paidAlready = new Set(P.db.all('Payments').filter((p) => p.status !== 'failed' && p.note === 'period:' + startMonth).map((p) => p.application_id));
  const { people } = indexAppsAndPeople();
  const rows = visibleApplications(ctx).filter(({ app }) => PAYABLE_STATUSES.includes(app.status) && (!fund || app.fund_type === fund))
    .map(({ app }) => {
      const n = monthsPayable(app, startMonth, months);
      const b = banks[app.id];
      let reason = '';
      if (!app.monthly_amount) reason = 'No monthly amount';
      else if (!app.fund_type) reason = 'Fund type not set';
      else if (!b || b.status !== 'verified') reason = 'Bank details not verified';
      else if (n === 0) reason = 'Course has ended';
      else if (paidAlready.has(app.id)) reason = 'Already in a payment for this period';
      return {
        application_id: app.id, application_no: app.application_no, name: (people[app.applicant_id] || {}).full_name,
        fund_type: app.fund_type, monthly_amount: app.monthly_amount, months: n, amount: (app.monthly_amount || 0) * n, reason,
      };
    });
  return { startMonth, months, rows };
}

ACTIONS['pay.eligible'] = { ...FINANCE, fn: (ctx, d) => { const r = eligibilityFor(ctx, d); return { start_month: r.startMonth, months: r.months, rows: r.rows }; } };

ACTIONS['pay.create'] = {
  ...FINANCE,
  fn: (ctx, d) => P.lock(() => {
    const r = eligibilityFor(ctx, d);
    const chosen = Array.isArray(d.application_ids) && d.application_ids.length ? new Set(d.application_ids) : null;
    const rows = r.rows.filter((x) => !x.reason && (!chosen || chosen.has(x.application_id)));
    if (rows.length === 0) fail('Nobody is eligible for this period.', 'INVALID');
    const batch = {
      id: P.uuid(), name: clean(d.name, 80) || 'Payment ' + r.startMonth, start_month: r.startMonth, months: r.months,
      status: 'draft', created_by: ctx.user.id, created_at: isoNow(),
    };
    P.db.insert('PaymentBatches', batch);
    rows.forEach((x) => P.db.insert('Payments', {
      id: P.uuid(), batch_id: batch.id, application_id: x.application_id, amount: x.amount, months: x.months,
      fund_type: x.fund_type, status: 'pending', reference: '', paid_on: '', note: 'period:' + r.startMonth, created_at: isoNow(),
    }));
    audit(ctx.user, 'payment.batch_created', 'batch', batch.id, { count: rows.length });
    return { id: batch.id, count: rows.length, total: rows.reduce((s, x) => s + x.amount, 0) };
  }),
};

function batchSummary(b) {
  const items = P.db.all('Payments').filter((p) => p.batch_id === b.id);
  const sum = (arr) => arr.reduce((s, p) => s + (p.amount || 0), 0);
  return {
    id: b.id, name: b.name, start_month: b.start_month, months: b.months, status: b.status, created_at: b.created_at,
    count: items.length, total: sum(items), paid: sum(items.filter((p) => p.status === 'paid')),
    failed: items.filter((p) => p.status === 'failed').length, pending: items.filter((p) => p.status === 'pending').length,
    zakat: sum(items.filter((p) => p.fund_type === 'zakat')), non_zakat: sum(items.filter((p) => p.fund_type === 'non_zakat')),
  };
}

ACTIONS['pay.batches'] = {
  ...FINANCE,
  fn: () => ({ batches: P.db.all('PaymentBatches').sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).map(batchSummary) }),
};

ACTIONS['pay.batch'] = {
  ...FINANCE,
  fn: (ctx, d) => {
    const b = P.db.all('PaymentBatches').find((x) => x.id === d.id);
    if (!b) fail('Batch not found.', 'NOT_FOUND');
    const { apps, people } = indexAppsAndPeople();
    return {
      batch: batchSummary(b),
      items: P.db.all('Payments').filter((p) => p.batch_id === b.id).map((p) => {
        const a = apps[p.application_id] || {};
        return Object.assign({}, p, { application_no: a.application_no, name: (people[a.applicant_id] || {}).full_name });
      }),
    };
  },
};

const csvText = (v) => '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"';

// Bank upload file. Account numbers are plain digits. Open it as text, not in a spreadsheet, or long numbers get damaged.
ACTIONS['pay.export'] = {
  ...FINANCE,
  fn: (ctx, d) => {
    const b = P.db.all('PaymentBatches').find((x) => x.id === d.id);
    if (!b) fail('Batch not found.', 'NOT_FOUND');
    const banks = {};
    P.db.all('BankAccounts').forEach((x) => { banks[x.application_id] = x; });
    const { apps, people } = indexAppsAndPeople();
    const head = ['Pay To', 'Contact No.', 'Beneficiary Account Number', 'Amount', 'Beneficiary IFSC', 'Requested Date', 'Application No.'];
    const lines = P.db.all('Payments').filter((p) => p.batch_id === b.id && p.status !== 'paid').map((p) => {
      const a = apps[p.application_id] || {};
      const person = people[a.applicant_id] || {};
      const bank = banks[p.application_id] || {};
      return [bank.holder || person.full_name, person.phone, bank.account_no, p.amount, bank.ifsc, istDate(), a.application_no].map(csvText).join(',');
    });
    if (b.status === 'draft') P.db.update('PaymentBatches', b.id, { status: 'sent' });
    audit(ctx.user, 'payment.exported', 'batch', b.id, { rows: lines.length });
    return { filename: (b.name || 'payments').replace(/[^\w-]+/g, '_') + '.csv', csv: [head.map(csvText).join(','), ...lines].join('\n') };
  },
};

ACTIONS['pay.mark'] = {
  ...FINANCE,
  fn: (ctx, d) => P.lock(() => {
    const status = coerce(d.status, ['paid', 'failed', 'pending'], 'Status');
    const ids = Array.isArray(d.ids) ? d.ids : [];
    if (!status || ids.length === 0) fail('Please choose payments and a status.', 'INVALID');
    const paidOn = d.paid_on ? coerce(d.paid_on, 'date', 'Paid on') : istDate();
    let n = 0;
    ids.forEach((id) => {
      const p = P.db.all('Payments').find((x) => x.id === id);
      if (!p) return;
      P.db.update('Payments', p.id, { status, reference: clean(d.reference, 60) || p.reference, paid_on: status === 'paid' ? paidOn : '' });
      n++;
    });
    audit(ctx.user, 'payment.marked', 'payment', ids.length + ' items', { status });
    return { updated: n };
  }),
};

// Failed payments go into a new batch so they can be retried.
ACTIONS['pay.retry'] = {
  ...FINANCE,
  fn: (ctx, d) => P.lock(() => {
    const failed = P.db.all('Payments').filter((p) => p.batch_id === d.batch_id && p.status === 'failed');
    if (failed.length === 0) fail('There are no failed payments in this batch.', 'INVALID');
    const old = P.db.all('PaymentBatches').find((x) => x.id === d.batch_id);
    const batch = {
      id: P.uuid(), name: (old ? old.name : 'Payment') + ' (retry)', start_month: old ? old.start_month : '', months: old ? old.months : 0,
      status: 'draft', created_by: ctx.user.id, created_at: isoNow(),
    };
    P.db.insert('PaymentBatches', batch);
    failed.forEach((p) => {
      P.db.update('Payments', p.id, { note: p.note + ' retried' });
      P.db.insert('Payments', Object.assign({}, p, { id: P.uuid(), batch_id: batch.id, status: 'pending', reference: '', paid_on: '', created_at: isoNow(), note: p.note.replace(' retried', '') }));
    });
    return { id: batch.id, count: failed.length };
  }),
};
