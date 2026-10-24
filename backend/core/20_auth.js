/* Sign-in: Google, or email + password with emailed codes for sign-up and reset.
   Sessions are signed tokens; every request re-checks the user row, so deactivation is immediate. */

const findUserByEmail = (email) => (email ? P.db.all('Users').find((u) => u.email === email) || null : null);
const findUserById = (id) => P.db.all('Users').find((u) => u.id === id) || null;

function hashPassword(password, salt) {
  const pepper = P.secret('PEPPER');
  let h = salt + '|' + password;
  for (let i = 0; i < 2000; i++) h = P.hmacB64(pepper, h);
  return h;
}

function publicUser(u) {
  return {
    id: u.id, email: u.email, name: u.name, role: u.role, district_scope: splitScope(u.district_scope),
    finance: u.finance, language: u.language,
  };
}

function makeSession(u, via) {
  const days = STAFF_ROLES.includes(u.role) ? 0.33 : 7;
  const payload = P.b64e(JSON.stringify({ u: u.id, via, exp: Math.floor(P.now().getTime() / 1000 + days * 86400) }));
  return { token: payload + '.' + P.hmacB64(P.secret('SESSION_SECRET'), payload), user: publicUser(u), via };
}

function authenticate(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 2 || parts[1] !== P.hmacB64(P.secret('SESSION_SECRET'), parts[0])) {
    fail('Please sign in.', 'AUTH');
  }
  let payload;
  try {
    payload = JSON.parse(P.b64d(parts[0]));
  } catch (e) {
    fail('Please sign in.', 'AUTH');
  }
  if (!payload || payload.exp < P.now().getTime() / 1000) fail('Your session has expired. Please sign in again.', 'AUTH');
  const user = findUserById(payload.u);
  if (!user || !user.active) fail('This account is not active.', 'AUTH');
  return { user, via: payload.via };
}

// Staff must use Google unless the master allowed password sign-in for that person.
const isStaffCtx = (ctx) =>
  STAFF_ROLES.includes(ctx.user.role) && (ctx.via === 'google' || ctx.user.allow_password);

function throttle(key, max, seconds) {
  const k = 'rl:' + key;
  const n = Number(P.cache.get(k) || 0);
  if (n >= max) fail('Too many attempts. Please try again in a few minutes.', 'RATE');
  P.cache.put(k, String(n + 1), seconds);
}

// Roles are granted only to verified emails, so nobody can claim an invite with someone else's address.
function claimInvite(user) {
  if (!user.email_verified) return user;
  const inv = P.db.all('StaffInvites').find((i) => i.email === user.email);
  if (!inv) return user;
  P.db.update('Users', user.id, { role: inv.role, district_scope: inv.district_scope, finance: inv.finance });
  P.db.remove('StaffInvites', inv.id);
  audit(user, 'staff.claimed', 'user', user.id, { role: inv.role });
  return findUserById(user.id);
}

function newUser(email, name, extra) {
  return Object.assign({
    id: P.uuid(), email, name: clean(name, 100), phone: '', password_hash: '', salt: '', role: 'applicant',
    district_scope: '', finance: false, allow_password: false, language: 'en', active: true,
    email_verified: false, created_at: isoNow(), last_login: '',
  }, extra || {});
}

function issueCode(email, purpose, payload) {
  const code = P.randomCode(6);
  const row = {
    id: email + '|' + purpose, email, purpose, code_hash: P.sha256B64(code + '|' + email + '|' + purpose),
    payload: payload || '', expires: new Date(P.now().getTime() + 15 * 60000).toISOString(), attempts: 0,
  };
  P.lock(() => {
    if (P.db.all('Codes').some((c) => c.id === row.id)) P.db.update('Codes', row.id, row);
    else P.db.insert('Codes', row);
  });
  return code;
}

function consumeCode(email, purpose, code) {
  const id = email + '|' + purpose;
  const row = P.db.all('Codes').find((c) => c.id === id);
  if (!row || row.expires < isoNow() || row.attempts >= 5) fail('That code is not valid or has expired. Please request a new one.', 'CODE');
  if (row.code_hash !== P.sha256B64(clean(code, 12) + '|' + email + '|' + purpose)) {
    P.db.update('Codes', id, { attempts: row.attempts + 1 });
    fail('That code is not valid or has expired. Please request a new one.', 'CODE');
  }
  P.db.remove('Codes', id);
  return row;
}

const ACTIONS = {};

ACTIONS['public.info'] = {
  pub: true,
  fn: () => {
    migrateCycles();
    const open = P.db.all('Cycles').find((c) => c.is_open);
    const docs = P.db.all('DocTypes').filter((t) => t.active && t.stage !== 'renewal').sort((a, b) => a.sort - b.sort)
      .map((t) => ({ label: t.label_en, required: t.required }));
    return {
      open: Boolean(open), name: open ? open.name : '', closes_on: open ? open.closes_on : '', doc_types: docs,
      limits: { max_bytes: MAX_FILE_BYTES, max_files: MAX_FILES_PER_DOC },
    };
  },
};

ACTIONS['auth.google'] = {
  pub: true,
  fn: (ctx, d) => {
    let g;
    try {
      g = P.verifyGoogleIdToken(d.credential);
    } catch (e) {
      fail('Google sign-in could not be verified. Please try again.', 'AUTH');
    }
    const email = normEmail(g.email);
    let user = P.lock(() => {
      let u = findUserByEmail(email);
      if (!u) {
        u = newUser(email, g.name, { email_verified: true });
        P.db.insert('Users', u);
      } else if (!u.email_verified) {
        P.db.update('Users', u.id, { email_verified: true });
      }
      return findUserByEmail(email);
    });
    user = linkLegacy(claimInvite(user));
    if (!user.active) fail('This account is not active.', 'INACTIVE');
    P.db.update('Users', user.id, { last_login: isoNow() });
    return makeSession(user, 'google');
  },
};

ACTIONS['auth.register'] = {
  pub: true,
  fn: (ctx, d) => {
    const email = normEmail(d.email);
    if (!validEmail(email)) fail('Please enter a valid email address.', 'INVALID');
    if (typeof d.password !== 'string' || d.password.length < 8 || d.password.length > 100) {
      fail('Password must be 8 to 100 characters.', 'INVALID');
    }
    throttle('reg:' + email, 5, 900);
    const salt = P.uuid();
    // The password only takes effect after the emailed code proves the address is theirs.
    const payload = JSON.stringify({ salt, hash: hashPassword(d.password, salt), name: clean(d.name, 100) });
    const code = issueCode(email, 'register', payload);
    sendNow(email, 'Your Vidyanidhi verification code',
      mailText(['Your verification code is ' + code + '.', 'It is valid for 15 minutes. If you did not ask for it, ignore this email.']));
    return P.isDev ? { sent: true, dev_code: code } : { sent: true };
  },
};

ACTIONS['auth.verify'] = {
  pub: true,
  fn: (ctx, d) => {
    const email = normEmail(d.email);
    throttle('ver:' + email, 10, 900);
    const row = consumeCode(email, 'register', d.code);
    const p = JSON.parse(row.payload);
    let user = P.lock(() => {
      const u = findUserByEmail(email);
      if (!u) {
        P.db.insert('Users', newUser(email, p.name, { password_hash: p.hash, salt: p.salt, email_verified: true }));
      } else {
        P.db.update('Users', u.id, { password_hash: p.hash, salt: p.salt, email_verified: true, name: u.name || p.name });
      }
      return findUserByEmail(email);
    });
    user = linkLegacy(claimInvite(user));
    if (!user.active) fail('This account is not active.', 'INACTIVE');
    P.db.update('Users', user.id, { last_login: isoNow() });
    return makeSession(user, 'password');
  },
};

ACTIONS['auth.login'] = {
  pub: true,
  fn: (ctx, d) => {
    const email = normEmail(d.email);
    throttle('login:' + email, 8, 900);
    const u = findUserByEmail(email);
    const bad = () => fail('Incorrect email or password.', 'LOGIN');
    if (!u || !u.password_hash || typeof d.password !== 'string') bad();
    if (hashPassword(d.password, u.salt) !== u.password_hash) bad();
    if (!u.email_verified) fail('Please verify your email first. Use "Forgot password" to get a new code.', 'LOGIN');
    if (!u.active) fail('This account is not active.', 'INACTIVE');
    if (STAFF_ROLES.includes(u.role) && !u.allow_password) fail('Committee members sign in with Google.', 'LOGIN');
    P.db.update('Users', u.id, { last_login: isoNow() });
    return makeSession(u, 'password');
  },
};

ACTIONS['auth.forgot'] = {
  pub: true,
  fn: (ctx, d) => {
    const email = normEmail(d.email);
    if (!validEmail(email)) fail('Please enter a valid email address.', 'INVALID');
    throttle('forgot:' + email, 3, 900);
    const u = findUserByEmail(email);
    let devCode;
    if (u && u.active) {
      const code = issueCode(email, 'reset', '');
      devCode = code;
      sendNow(email, 'Reset your Vidyanidhi password',
        mailText(['Your password reset code is ' + code + '.', 'It is valid for 15 minutes. If you did not ask for it, ignore this email.']));
    }
    // Same answer whether or not the account exists.
    return P.isDev && devCode ? { sent: true, dev_code: devCode } : { sent: true };
  },
};

ACTIONS['auth.reset'] = {
  pub: true,
  fn: (ctx, d) => {
    const email = normEmail(d.email);
    if (typeof d.password !== 'string' || d.password.length < 8 || d.password.length > 100) {
      fail('Password must be 8 to 100 characters.', 'INVALID');
    }
    throttle('reset:' + email, 10, 900);
    consumeCode(email, 'reset', d.code);
    const u = findUserByEmail(email);
    if (!u || !u.active) fail('That code is not valid or has expired. Please request a new one.', 'CODE');
    const salt = P.uuid();
    P.db.update('Users', u.id, { password_hash: hashPassword(d.password, salt), salt, email_verified: true });
    audit(u, 'password.reset', 'user', u.id);
    const fresh = linkLegacy(claimInvite(findUserById(u.id)));
    return makeSession(fresh, 'password');
  },
};

ACTIONS.me = { fn: (ctx) => ({ user: publicUser(ctx.user), via: ctx.via }) };

ACTIONS['me.language'] = {
  fn: (ctx, d) => {
    const language = d.language === 'ml' ? 'ml' : 'en';
    P.db.update('Users', ctx.user.id, { language });
    return { language };
  },
};
