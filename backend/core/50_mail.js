/* Email. Sign-in codes go out immediately. Everything else is queued in the Outbox and sent in
   batches within the daily limit and only between 07:00 and 21:00 India time. */

const MAIL_RESERVE = 10; // keep some of the daily limit for sign-in codes

function mailText(lines) {
  return lines.join('\n\n') + '\n\nWISDOM Students VIDYANIDHI Scholarship Programme\nKerala State Committee';
}

function sendNow(to, subject, body) {
  if (P.mail.quota() < 1) fail('The daily email limit has been reached. Please try again tomorrow.', 'QUOTA');
  P.mail.send(to, subject, body);
}

function queueMail(userId, kind, subject, body) {
  const u = findUserById(userId);
  if (!u) return;
  // Guests have no account email; they may have given a contact email on the form.
  const ap = u.email ? null : P.db.all('Applicants').find((a) => a.id === userId);
  const to = u.email || (ap && validEmail(String(ap.email || '').toLowerCase()) ? String(ap.email).toLowerCase() : '');
  if (!to) return;
  P.db.insert('Outbox', {
    id: P.uuid(), user_id: userId, to, kind, subject, body, status: 'queued', error: '',
    created_at: isoNow(), sent_at: '',
  });
}

function jobFlushOutbox() {
  const hour = istHour();
  if (hour < 7 || hour >= 21) return { sent: 0, skipped: 'night' };
  return P.lock(() => {
    let room = P.mail.quota() - MAIL_RESERVE;
    let sent = 0;
    const queued = P.db.all('Outbox').filter((r) => r.status === 'queued')
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    for (const row of queued) {
      if (room <= 0) break;
      try {
        P.mail.send(row.to, row.subject, row.body);
        P.db.update('Outbox', row.id, { status: 'sent', sent_at: isoNow(), error: '' });
        sent++;
        room--;
      } catch (e) {
        P.db.update('Outbox', row.id, { status: 'failed', error: clean(e && e.message, 200) });
      }
    }
    return { sent };
  });
}

// Reminders: 3 days before, on the due date, then every 3 days when overdue (up to 3 times).
// After the last reminder the item is flagged so an admin can phone the applicant.
function jobReminders() {
  const today = istDate();
  const apps = {};
  P.db.all('Applications').forEach((a) => { apps[a.id] = a; });
  let queued = 0;
  P.lock(() => {
    P.db.all('Pending').filter((p) => p.status === 'open' && p.due_on && p.last_reminder !== today).forEach((p) => {
      const days = daysBetween(today, p.due_on);
      const patch = {};
      let send = false;
      if (days === 3 || days === 0) send = true;
      else if (days < 0 && p.reminders < 3 && (-days) % 3 === 0) {
        send = true;
        patch.reminders = p.reminders + 1;
        if (patch.reminders >= 3) patch.flag = 'call';
      }
      if (!send) return;
      const app = apps[p.application_id];
      if (!app) return;
      const when = days > 0 ? 'is due in ' + days + ' days' : days === 0 ? 'is due today' : 'is overdue';
      queueMail(app.applicant_id, 'reminder', 'Reminder: ' + p.title,
        mailText(['This is a reminder that "' + p.title + '" ' + when + ' (due ' + p.due_on + ').',
          'Please sign in to the portal to complete it.']));
      patch.last_reminder = today;
      P.db.update('Pending', p.id, patch);
      queued++;
    });
  });
  return { queued };
}
