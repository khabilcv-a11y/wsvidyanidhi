/* "Tell me when applications open". People leave a mobile number (and an email if they have one) on the home page
   while the scheme is closed. When a scheme year is opened, those with an email are emailed; the committee can
   message the rest on WhatsApp from the list. */

ACTIONS['public.subscribe'] = {
  pub: true,
  fn: (ctx, d) => {
    const name = clean(d.name, 100);
    const phone = normPhone(d.phone);
    const email = normEmail(d.email);
    if (name.length < 2) fail('Please enter your name.', 'INVALID');
    if (!/^[6-9]\d{9}$/.test(phone)) fail('Please enter a valid 10-digit mobile number.', 'INVALID');
    if (email && !validEmail(email)) fail('That email address does not look right. You can leave it empty.', 'INVALID');
    throttle('sub', 400, 3600);
    throttle('sub:' + phone, 4, 3600);
    return P.lock(() => {
      const old = P.db.all('Subscribers').find((s) => s.phone === phone);
      if (old) P.db.update('Subscribers', old.id, { name, email: email || old.email });
      else P.db.insert('Subscribers', { id: P.uuid(), name, phone, email, created_at: isoNow(), notified_at: '', notified_for: '' });
      return { ok: true, already: Boolean(old) };
    });
  },
};

// Queue the "applications are open" email for everyone with an email who has not been told about this scheme year.
function notifySubscribers(cycle) {
  let queued = 0;
  P.db.all('Subscribers').filter((s) => s.notified_for !== cycle.name).forEach((s) => {
    if (s.email) {
      P.db.insert('Outbox', {
        id: P.uuid(), user_id: '', to: s.email, kind: 'applications_open', subject: 'Vidyanidhi scholarship applications are open',
        body: mailText(['Dear ' + s.name + ',', 'You asked us to tell you when applications open.',
          'Applications for the WISDOM Students VIDYANIDHI Scholarship Programme ' + cycle.name + ' are now open' + (cycle.closes_on ? ' until ' + cycle.closes_on : '') + '.',
          'Apply on the scholarship website. You only need your mobile number to start.']),
        status: 'queued', error: '', created_at: isoNow(), sent_at: '',
      });
      queued++;
    }
    P.db.update('Subscribers', s.id, { notified_at: s.email ? isoNow() : s.notified_at, notified_for: s.email ? cycle.name : s.notified_for });
  });
  return queued;
}

ACTIONS['admin.subscribers'] = {
  ...STAFF,
  fn: () => {
    const open = P.db.all('Cycles').find((c) => c.is_open) || null;
    return {
      open_cycle: open ? open.name : '',
      rows: P.db.all('Subscribers').sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    };
  },
};

ACTIONS['admin.subscribers.notify'] = {
  ...MASTER,
  fn: (ctx) => P.lock(() => {
    const open = P.db.all('Cycles').find((c) => c.is_open);
    if (!open) fail('No scheme year is open for applications.', 'INVALID');
    const queued = notifySubscribers(open);
    audit(ctx.user, 'subscribers.notified', 'cycle', open.id, { queued });
    return { queued };
  }),
};

// The committee marks people it has messaged on WhatsApp, so nobody is messaged twice.
ACTIONS['admin.subscribers.mark'] = {
  ...STAFF,
  fn: (ctx, d) => P.lock(() => {
    const s = P.db.all('Subscribers').find((x) => x.id === d.id);
    if (!s) fail('Not found.', 'NOT_FOUND');
    const open = P.db.all('Cycles').find((c) => c.is_open);
    P.db.update('Subscribers', s.id, { notified_at: isoNow(), notified_for: open ? open.name : 'told' });
    return { ok: true };
  }),
};
