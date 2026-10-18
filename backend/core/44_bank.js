/* Bank details. The applicant enters them after selection; an admin verifies them.
   Full numbers are visible only to finance-permission staff, and every view is logged. */

const maskAccount = (n) => (n ? '•••• ' + String(n).slice(-4) : '');

function validateBank(d) {
  const holder = clean(d.holder, 100);
  const account = clean(d.account_no, 30).replace(/\s+/g, '');
  const again = clean(d.account_no2, 30).replace(/\s+/g, '');
  const ifsc = clean(d.ifsc, 15).toUpperCase().replace(/\s+/g, '');
  const bank = clean(d.bank, 80);
  const branch = clean(d.branch, 80);
  if (!holder || !bank) fail('Please fill in the account holder name and the bank.', 'INVALID');
  if (!/^\d{9,18}$/.test(account)) fail('The account number must be 9 to 18 digits, with no letters or symbols.', 'INVALID');
  if (account !== again) fail('The two account numbers do not match.', 'INVALID');
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) fail('The IFSC code is not valid. It looks like SBIN0000001.', 'INVALID');
  return { holder, account_no: account, ifsc, bank, branch };
}

ACTIONS['bank.get'] = {
  roles: APPLICANT_ONLY,
  fn: (ctx) => {
    const app = myApplication(ctx.user.id);
    const b = app && P.db.all('BankAccounts').find((x) => x.application_id === app.id);
    if (!b) return { bank: null, eligible: Boolean(app && ['selected', 'active', 'renewal_due', 'renewal_review', 'on_hold'].includes(app.status)) };
    return { bank: { holder: b.holder, account_no: maskAccount(b.account_no), bank: b.bank, ifsc: b.ifsc, branch: b.branch, status: b.status, note: b.note }, eligible: true };
  },
};

ACTIONS['bank.save'] = {
  roles: APPLICANT_ONLY,
  fn: (ctx, d) => P.lock(() => {
    const app = myApplication(ctx.user.id);
    if (!app || !['selected', 'active', 'renewal_due', 'renewal_review', 'on_hold'].includes(app.status)) fail('Bank details are asked for only after selection.', 'LOCKED');
    const f = validateBank(d);
    const existing = P.db.all('BankAccounts').find((b) => b.application_id === app.id);
    if (existing && existing.status === 'verified') fail('Your bank details are verified and locked. Use "Request a change" to update them.', 'LOCKED');
    const row = Object.assign(f, { status: 'submitted', note: '', verified_by: '', verified_at: '', updated_at: isoNow() });
    if (existing) P.db.update('BankAccounts', existing.id, row);
    else P.db.insert('BankAccounts', Object.assign({ id: P.uuid(), application_id: app.id }, row));
    closePending(app.id, (p) => p.kind === 'bank');
    audit(ctx.user, 'bank.submitted', 'application', app.id);
    return { ok: true };
  }),
};

ACTIONS['bank.change'] = {
  roles: APPLICANT_ONLY,
  fn: (ctx, d) => P.lock(() => {
    const app = myApplication(ctx.user.id);
    const b = app && P.db.all('BankAccounts').find((x) => x.application_id === app.id);
    if (!b) fail('No bank details to change.', 'NOT_FOUND');
    P.db.update('BankAccounts', b.id, { status: 'change_requested', note: clean(d.note, 200), updated_at: isoNow() });
    audit(ctx.user, 'bank.change_requested', 'application', app.id);
    return { ok: true };
  }),
};

// Finance staff: full details for one case (logged).
ACTIONS['admin.bank.get'] = {
  ...FINANCE,
  fn: (ctx, d) => {
    const { app } = loadForStaff(ctx, d.application_id);
    const b = P.db.all('BankAccounts').find((x) => x.application_id === app.id);
    audit(ctx.user, 'bank.viewed', 'application', app.id);
    return { bank: b || null };
  },
};

ACTIONS['admin.bank.verify'] = {
  ...FINANCE,
  fn: (ctx, d) => P.lock(() => {
    const { app } = loadForStaff(ctx, d.application_id);
    const b = P.db.all('BankAccounts').find((x) => x.application_id === app.id);
    if (!b) fail('No bank details yet.', 'NOT_FOUND');
    const decision = d.decision === 'reject' ? 'rejected' : 'verified';
    if (decision === 'rejected' && !clean(d.note, 200)) fail('Please say what is wrong.', 'INVALID');
    P.db.update('BankAccounts', b.id, {
      status: decision === 'verified' ? 'verified' : 'submitted', note: decision === 'rejected' ? clean(d.note, 200) : '',
      verified_by: ctx.user.id, verified_at: isoNow(),
    });
    if (decision === 'rejected') {
      addPending(app.id, 'bank', 'Correct your bank details: ' + clean(d.note, 80), { due_on: istDate(7) });
      queueMail(app.applicant_id, 'bank_rejected', 'Please correct your bank details',
        mailText(['We could not accept your bank details.', 'Reason: ' + clean(d.note, 200), 'Please sign in and enter them again.']));
    } else if (app.status === 'selected') {
      P.db.update('Applications', app.id, { status: 'active', updated_at: isoNow() });
    }
    audit(ctx.user, 'bank.' + decision, 'application', app.id);
    return { ok: true };
  }),
};

// Overview without any account numbers, for the finance dashboard.
ACTIONS['admin.bank.list'] = {
  ...FINANCE,
  fn: (ctx) => {
    const { apps, people } = indexAppsAndPeople();
    return {
      rows: P.db.all('BankAccounts').map((b) => {
        const a = apps[b.application_id] || {};
        const p = people[a.applicant_id] || {};
        return { application_id: b.application_id, application_no: a.application_no, name: p.full_name, bank: b.bank, status: b.status, updated_at: b.updated_at, district: p.district, wisdom_district: a.wisdom_district };
      }).filter((r) => inScope(ctx.user, r.district || '', r.wisdom_district)),
    };
  },
};
