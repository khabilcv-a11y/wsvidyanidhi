/* Applying without an account. A first-time applicant gives a name and mobile number, fills the form and
   gets an application number. They come back with "mobile number + application number (or date of birth)".
   A guest is a Users row with no email and no password; the session token is the only key to the draft. */

const GUEST_DAYS = 30;
const GUEST_BLOCKED = ['selected', 'active', 'renewal_due', 'renewal_review', 'on_hold', 'completed']; // scholars sign in instead


function normPhone(p) {
  const digits = String(p || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
}

const isGuest = (u) => Boolean(u) && u.role === 'applicant' && !u.email && !u.password_hash;

function guestSession(u) {
  const payload = P.b64e(JSON.stringify({ u: u.id, via: 'guest', exp: Math.floor(P.now().getTime() / 1000 + GUEST_DAYS * 86400) }));
  return { token: payload + '.' + P.hmacB64(P.secret('SESSION_SECRET'), payload), user: publicUser(u), via: 'guest' };
}

ACTIONS['apply.begin'] = {
  pub: true,
  fn: (ctx, d) => {
    const name = clean(d.name, 100);
    const phone = normPhone(d.phone);
    if (name.length < 2) fail('Please enter your full name.', 'INVALID');
    if (!/^[6-9]\d{9}$/.test(phone)) fail('Please enter a valid 10-digit mobile number.', 'INVALID');
    const email = normEmail(d.email);
    if (email && !validEmail(email)) fail('That email address does not look right. You can leave it empty.', 'INVALID');
    const minor = Boolean(d.is_minor);
    const guardian = clean(d.guardian_name, 100);
    if (minor && !guardian) fail('Please enter the parent or guardian name.', 'INVALID');
    throttle('begin', 200, 3600);
    throttle('begin:' + phone, 5, 3600);
    return P.lock(() => {
      const cycle = openCycle();
      if (!cycle) fail('Applications are not open right now.', 'CLOSED');
      const taken = P.db.all('Applicants').some((a) => normPhone(a.phone) === phone)
        || P.db.all('Users').some((u) => normPhone(u.phone) === phone);
      if (taken) {
        fail('An application with this mobile number already exists. Please use "Continue or check status" instead.', 'EXISTS');
      }
      const user = newUser('', name, { phone, email_verified: false, last_login: isoNow() });
      P.db.insert('Users', user);
      P.db.insert('Consents', {
        id: P.uuid(), user_id: user.id, kind: 'privacy', version: 'none-asked',
        is_minor: minor, guardian_name: minor ? guardian : '', given_at: isoNow(),
      });
      P.db.insert('Applicants', { id: user.id, full_name: name, phone, whatsapp: '', email, updated_at: isoNow() });
      // The application number is given at the start, so a draft can be found again before it is submitted.
      const number = cycle.code + String(cycle.next_serial).padStart(4, '0');
      P.db.update('Cycles', cycle.id, { next_serial: cycle.next_serial + 1 });
      P.db.insert('Applications', {
        id: P.uuid(), applicant_id: user.id, cycle_id: cycle.id, scheme_year: String(cycle.year || ''), application_no: number,
        status: 'draft', created_at: isoNow(), updated_at: isoNow(),
      });
      const session = guestSession(user);
      // The details to keep, sent at once so a family has them in writing from the first minute.
      if (email) {
        try {
          sendNow(email, 'Your Vidyanidhi application number ' + number, accessMail(name, number, phone, email, false));
        } catch (e) {
          P.log('WARN', 'start email not sent: ' + (e && e.message));
        }
      }
      return session;
    });
  },
};

// The text shared by the "application started" and "application received" emails.
function accessMail(name, number, phone, email, submitted) {
  const lines = [
    'Dear ' + name + ',',
    submitted
      ? 'Your application to the WISDOM Students VIDYANIDHI Scholarship Programme has been received.'
      : 'You have started an application to the WISDOM Students VIDYANIDHI Scholarship Programme. Everything you enter is saved, so you can stop and continue later.',
    'APPLICATION NUMBER: ' + number,
    ['Details you gave us for communication:', 'Mobile number: ' + phone, 'Email: ' + (email || 'not given')].join('\n'),
    ['TO SEE YOUR APPLICATION AGAIN (there is no password):',
      '1. Open the scholarship website and choose "Check status".',
      '2. Enter your mobile number ' + phone + ' as your user name.',
      '3. Enter your application number ' + number + ' (or your date of birth).'].join('\n'),
    'Please keep this email. Scholarship holders receive a separate login later, for renewals and bank details.',
  ];
  return mailText(lines);
}

// Come back to an application. The mobile number is needed; the application number and the date of birth are optional.
// With either of them the application opens. With the mobile number alone, only a short status line is shown (masked),
// because the full application holds personal documents.
const maskName = (n) => String(n || '').trim().split(/\s+/).map((w) => w.charAt(0) + '***').join(' ');
const maskNo = (n) => (String(n || '').length > 4 ? String(n).slice(0, 2) + '***' + String(n).slice(-2) : String(n || ''));

ACTIONS['apply.lookup'] = {
  pub: true,
  fn: (ctx, d) => {
    const phone = normPhone(d.phone);
    const no = clean(d.application_no, 20).toUpperCase();
    const dob = clean(d.dob, 10);
    const notFound = () => fail('We could not find an application with these details. Please check them and try again.', 'NOT_FOUND');
    if (!phone) fail('Please enter your 10-digit mobile number.', 'INVALID');
    throttle('look', 400, 3600);
    throttle('look:' + phone, 6, 3600);
    const found = [];
    for (const ap of P.db.all('Applicants').filter((a) => normPhone(a.phone) === phone)) {
      const user = findUserById(ap.id);
      if (!isGuest(user) || !user.active) continue;
      const apps = P.db.all('Applications').filter((x) => x.applicant_id === ap.id);
      if (apps.some((x) => GUEST_BLOCKED.includes(x.status))) continue; // scholars sign in instead
      const byNo = no && apps.some((x) => String(x.application_no || '').toUpperCase() === no);
      const byDob = dob && ap.dob && ap.dob === dob;
      if (byNo || byDob) {
        P.db.update('Users', user.id, { last_login: isoNow() });
        return guestSession(user);
      }
      if (!no && !dob) found.push({ name: maskName(ap.full_name), application_no: maskNo((apps[0] || {}).application_no), status: (apps[0] || {}).status || 'draft' });
    }
    if (found.length) return { limited: true, items: found };
    return notFound();
  },
};
