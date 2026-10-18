/* Intellectual Meet and interview days: events, invitations, replies, check-in with tokens, absentees. */

const REPLIES = ['none', 'attending', 'not_attending', 'online'];
const NOT_ATTENDING_REASONS = ['difficult_to_travel', 'no_need', 'other'];
const TRANSPORT = ['bus', 'train', 'own_vehicle', 'other'];
const EVENT_FIELDS = { name: 'short', date: 'date', venue: 'short', mode: ['in_person', 'online', 'hybrid'], kind: ['admission', 'renewal', 'both'], status: ['planned', 'open', 'closed'], notes: 'long' };

function invitationRow(inv, apps, people) {
  const a = apps[inv.application_id] || {};
  const p = people[a.applicant_id] || {};
  return Object.assign({}, inv, {
    application_no: a.application_no, name: p.full_name, district: p.district, phone: p.phone,
    scheme_year: a.scheme_year, status: a.status,
  });
}

function indexAppsAndPeople() {
  const apps = {};
  const people = {};
  P.db.all('Applications').forEach((a) => { apps[a.id] = a; });
  P.db.all('Applicants').forEach((a) => { people[a.id] = a; });
  return { apps, people };
}

function scopedInvitations(ctx, eventId) {
  const { apps, people } = indexAppsAndPeople();
  return P.db.all('Invitations').filter((i) => i.event_id === eventId)
    .filter((i) => {
      const a = apps[i.application_id] || {};
      const p = people[a.applicant_id] || {};
      return inScope(ctx.user, p.district || '', a.wisdom_district);
    })
    .map((i) => invitationRow(i, apps, people));
}

function eventCounts(rows) {
  return {
    invited: rows.length,
    attending: rows.filter((r) => r.reply === 'attending').length,
    online: rows.filter((r) => r.reply === 'online').length,
    not_attending: rows.filter((r) => r.reply === 'not_attending').length,
    no_reply: rows.filter((r) => r.reply === 'none').length,
    present: rows.filter((r) => r.attendance === 'present' || r.attendance === 'online').length,
  };
}

ACTIONS['event.list'] = {
  ...STAFF,
  fn: (ctx) => ({
    events: P.db.all('Events').sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((e) => Object.assign({}, e, { counts: eventCounts(scopedInvitations(ctx, e.id)) })),
  }),
};

ACTIONS['event.save'] = {
  ...STAFF,
  fn: (ctx, d) => P.lock(() => {
    const f = pickFields(d, EVENT_FIELDS);
    if (!f.name || !f.date) fail('Please enter the event name and date.', 'INVALID');
    if (d.id) {
      const e = P.db.all('Events').find((x) => x.id === d.id);
      if (!e) fail('Event not found.', 'NOT_FOUND');
      P.db.update('Events', e.id, f);
      audit(ctx.user, 'event.updated', 'event', e.id);
      return { id: e.id };
    }
    const row = Object.assign({ mode: 'in_person', kind: 'both', status: 'planned', notes: '' }, f,
      { id: P.uuid(), next_token: 1, created_at: isoNow() });
    P.db.insert('Events', row);
    audit(ctx.user, 'event.created', 'event', row.id);
    return { id: row.id };
  }),
};

ACTIONS['event.get'] = {
  ...STAFF,
  fn: (ctx, d) => {
    const event = P.db.all('Events').find((e) => e.id === d.id);
    if (!event) fail('Event not found.', 'NOT_FOUND');
    const rows = scopedInvitations(ctx, event.id).sort((a, b) => ((a.token || 9999) - (b.token || 9999)) || String(a.name).localeCompare(String(b.name)));
    return { event, invitations: rows, counts: eventCounts(rows) };
  },
};

// Invite chosen applications, or everyone matching a filter (status and/or scheme year).
ACTIONS['event.invite'] = {
  ...STAFF,
  fn: (ctx, d) => P.lock(() => {
    const event = P.db.all('Events').find((e) => e.id === d.event_id);
    if (!event) fail('Event not found.', 'NOT_FOUND');
    let rows = visibleApplications(ctx).map(({ app }) => app);
    if (Array.isArray(d.application_ids) && d.application_ids.length) {
      const set = new Set(d.application_ids);
      rows = rows.filter((a) => set.has(a.id));
    } else {
      const f = d.filter || {};
      if (!f.status && !f.scheme_year) fail('Please choose who to invite.', 'INVALID');
      if (f.status) rows = rows.filter((a) => a.status === f.status);
      if (f.scheme_year) rows = rows.filter((a) => a.scheme_year === String(f.scheme_year));
    }
    const already = new Set(P.db.all('Invitations').filter((i) => i.event_id === event.id).map((i) => i.application_id));
    let created = 0;
    let emailed = 0;
    rows.filter((a) => !already.has(a.id)).forEach((a) => {
      P.db.insert('Invitations', {
        id: P.uuid(), event_id: event.id, application_id: a.id, user_id: a.applicant_id, invited_at: isoNow(),
        reply: 'none', companions: 0, attendance: '', interview_status: 'scheduled',
      });
      created++;
      addPending(a.id, 'meet', 'Reply to invitation: ' + event.name, { due_on: istDate(5) });
      const u = findUserById(a.applicant_id);
      if (u && u.email && u.email_verified) {
        queueMail(u.id, 'invitation', 'You are invited: ' + event.name,
          mailText([event.name + ' on ' + event.date + (event.venue ? ' at ' + event.venue : '') + '.',
            'Please sign in to the portal and tell us whether you will attend.']));
        emailed++;
      }
    });
    audit(ctx.user, 'event.invited', 'event', event.id, { created, emailed });
    return { created, emailed, skipped: rows.length - created };
  }),
};

function loadInvitation(ctx, id) {
  const inv = P.db.all('Invitations').find((i) => i.id === id);
  if (!inv) fail('Invitation not found.', 'NOT_FOUND');
  loadForStaff(ctx, inv.application_id);
  return inv;
}

function giveToken(event) {
  const token = event.next_token || 1;
  P.db.update('Events', event.id, { next_token: token + 1 });
  return token;
}

ACTIONS['event.checkin'] = {
  ...STAFF,
  fn: (ctx, d) => P.lock(() => {
    const inv = loadInvitation(ctx, d.id);
    const event = P.db.all('Events').find((e) => e.id === inv.event_id);
    if (inv.checked_in_at) return { token: inv.token, already: true };
    const token = giveToken(event);
    P.db.update('Invitations', inv.id, {
      checked_in_at: isoNow(), token, attendance: inv.reply === 'online' ? 'online' : 'present',
      companions: d.companions === undefined ? inv.companions : Number(d.companions) || 0, absent_reason: '',
    });
    return { token };
  }),
};

// A candidate who turns up without having been invited.
ACTIONS['event.walkin'] = {
  ...STAFF,
  fn: (ctx, d) => P.lock(() => {
    const event = P.db.all('Events').find((e) => e.id === d.event_id);
    if (!event) fail('Event not found.', 'NOT_FOUND');
    const { app } = loadForStaff(ctx, d.application_id);
    let inv = P.db.all('Invitations').find((i) => i.event_id === event.id && i.application_id === app.id);
    if (!inv) {
      inv = {
        id: P.uuid(), event_id: event.id, application_id: app.id, user_id: app.applicant_id, invited_at: isoNow(),
        reply: 'none', companions: 0, attendance: '', interview_status: 'scheduled', remarks: 'Walk-in',
      };
      P.db.insert('Invitations', inv);
    }
    if (inv.checked_in_at) return { token: inv.token, already: true };
    const token = giveToken(event);
    P.db.update('Invitations', inv.id, { checked_in_at: isoNow(), token, attendance: 'present' });
    return { token };
  }),
};

ACTIONS['event.mark'] = {
  ...STAFF,
  fn: (ctx, d) => P.lock(() => {
    const inv = loadInvitation(ctx, d.id);
    const patch = {};
    if ('attendance' in d) patch.attendance = coerce(d.attendance, ['', 'present', 'absent', 'online'], 'Attendance');
    if ('interview_status' in d) patch.interview_status = coerce(d.interview_status, ['scheduled', 'done', 'not_done', 'rescheduled'], 'Interview status');
    if ('absent_reason' in d) patch.absent_reason = clean(d.absent_reason, 200);
    if ('remarks' in d) patch.remarks = clean(d.remarks, 300);
    P.db.update('Invitations', inv.id, patch);
    return { ok: true };
  }),
};

// Everyone who did not check in, with the reason they gave, for a new slot or an online interview.
ACTIONS['event.absentees'] = {
  ...STAFF,
  fn: (ctx, d) => {
    const rows = scopedInvitations(ctx, d.id).filter((r) => !r.checked_in_at && r.attendance !== 'online');
    return { absentees: rows };
  },
};

ACTIONS['event.search'] = {
  ...STAFF,
  fn: (ctx, d) => {
    const q = clean(d.q, 60).toLowerCase();
    if (q.length < 2) return { rows: [] };
    return {
      rows: scopedInvitations(ctx, d.event_id)
        .filter((r) => [r.application_no, r.name, r.phone].some((v) => String(v || '').toLowerCase().includes(q))).slice(0, 25),
    };
  },
};

// ---- applicant side
ACTIONS['invite.mine'] = {
  roles: APPLICANT_ONLY,
  fn: (ctx) => {
    const events = {};
    P.db.all('Events').forEach((e) => { events[e.id] = e; });
    return {
      invitations: P.db.all('Invitations').filter((i) => i.user_id === ctx.user.id)
        .map((i) => Object.assign({}, i, { event: events[i.event_id] || null }))
        .sort((a, b) => ((a.event && a.event.date) < (b.event && b.event.date) ? 1 : -1)),
    };
  },
};

ACTIONS['invite.reply'] = {
  roles: APPLICANT_ONLY,
  fn: (ctx, d) => P.lock(() => {
    const inv = P.db.all('Invitations').find((i) => i.id === d.id && i.user_id === ctx.user.id);
    if (!inv) fail('Invitation not found.', 'NOT_FOUND');
    const event = P.db.all('Events').find((e) => e.id === inv.event_id);
    if (!event || event.status === 'closed') fail('This event is closed.', 'LOCKED');
    const reply = coerce(d.reply, REPLIES.slice(1), 'Reply');
    if (!reply) fail('Please choose a reply.', 'INVALID');
    const patch = { reply, replied_at: isoNow() };
    if (reply === 'attending') {
      patch.arrival_time = clean(d.arrival_time, 10);
      patch.transport = d.transport ? coerce(d.transport, TRANSPORT, 'Transport') : '';
      patch.companions = d.companions === undefined ? 0 : Math.max(0, Math.min(10, Number(d.companions) || 0));
      patch.companion_names = clean(d.companion_names, 200);
      patch.reason = '';
    } else {
      patch.reason = d.reason ? coerce(d.reason, NOT_ATTENDING_REASONS, 'Reason') : '';
      if (reply === 'not_attending' && !patch.reason) fail('Please tell us why you cannot attend.', 'INVALID');
      patch.remarks = clean(d.remarks, 300);
    }
    P.db.update('Invitations', inv.id, patch);
    closePending(inv.application_id, (p) => p.kind === 'meet' && p.title.indexOf(event.name) >= 0);
    return { ok: true };
  }),
};
