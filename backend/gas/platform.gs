/* Google Apps Script platform: Sheets = database, Drive = documents, Gmail = email.
   This file is appended after backend/core/*.js by `npm run backend:bundle`. */

const P = (() => {
  const props = PropertiesService.getScriptProperties();
  const cache = CacheService.getScriptCache();
  const tables = {}; // per-request copy of each sheet
  let spreadsheet = null;
  let lockDepth = 0;

  const sheetOf = (name) => {
    spreadsheet = spreadsheet || SpreadsheetApp.openById(props.getProperty('SHEET_ID'));
    const sh = spreadsheet.getSheetByName(name);
    if (!sh) throw new Error('Missing sheet ' + name + '. Run setup() once.');
    return sh;
  };

  const fromCell = (v, type) => {
    if (v instanceof Date) v = v.toISOString();
    if (type === 'b') return v === true || String(v).toUpperCase() === 'TRUE';
    if (type === 'n') {
      if (v === '' || v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    return v === null || v === undefined ? '' : String(v);
  };
  const toCell = (v, type) => {
    if (type === 'b') return v ? 'TRUE' : 'FALSE';
    if (v === null || v === undefined || v === '') return '';
    return String(v);
  };

  // Columns are matched by header name, so the sheet can be reordered or extended safely.
  const load = (name) => {
    if (tables[name]) return tables[name];
    const sh = sheetOf(name);
    const schema = SCHEMA[name];
    const width = sh.getLastColumn();
    const headers = sh.getRange(1, 1, 1, width).getValues()[0].map(String);
    const last = sh.getLastRow();
    const values = last > 1 ? sh.getRange(2, 1, last - 1, width).getValues() : [];
    const rows = values.map((r) => {
      const o = {};
      Object.keys(schema).forEach((c) => {
        const i = headers.indexOf(c);
        o[c] = fromCell(i < 0 ? '' : r[i], schema[c]);
      });
      return o;
    });
    return (tables[name] = { sh, schema, headers, rows });
  };

  const rowValues = (t, obj) => t.headers.map((h) => (t.schema[h] ? toCell(obj[h], t.schema[h]) : ''));
  const writeRow = (t, index, obj) => {
    const range = t.sh.getRange(index + 2, 1, 1, t.headers.length);
    range.setNumberFormat('@'); // keep every value as text so Sheets never reinterprets dates
    range.setValues([rowValues(t, obj)]);
  };

  const lock = (fn) => {
    if (lockDepth > 0) return fn();
    const l = LockService.getScriptLock();
    l.waitLock(25000);
    lockDepth = 1;
    Object.keys(tables).forEach((k) => delete tables[k]); // another request may have written meanwhile
    try {
      return fn();
    } finally {
      lockDepth = 0;
      l.releaseLock();
    }
  };

  return {
    isDev: false,
    now: () => new Date(),
    uuid: () => Utilities.getUuid(),
    secret: (k) => props.getProperty(k),
    b64e: (s) => Utilities.base64Encode(s, Utilities.Charset.UTF_8),
    b64d: (s) => Utilities.newBlob(Utilities.base64Decode(s)).getDataAsString(),
    hmacB64: (key, msg) => Utilities.base64Encode(Utilities.computeHmacSha256Signature(msg, key)),
    sha256B64: (s) => Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s)),
    randomCode: (n) => {
      const hex = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 12);
      return String(parseInt(hex, 16) % Math.pow(10, n)).padStart(n, '0');
    },
    log: (...a) => console.error(a.join(' ')),
    lock,
    cache: {
      get: (k) => cache.get(k),
      put: (k, v, s) => cache.put(k, v, Math.min(s || 600, 21600)),
    },
    db: {
      all: (name) => load(name).rows.map((r) => Object.assign({}, r)),
      insert: (name, obj) => lock(() => {
        const t = load(name);
        const row = {};
        Object.keys(t.schema).forEach((c) => { row[c] = obj[c] === undefined ? fromCell('', t.schema[c]) : obj[c]; });
        writeRow(t, t.rows.length, row);
        t.rows.push(row);
      }),
      // One range write for many rows (imports); far faster than inserting one by one.
      insertMany: (name, objs) => lock(() => {
        if (objs.length === 0) return;
        const t = load(name);
        const rows = objs.map((obj) => {
          const row = {};
          Object.keys(t.schema).forEach((c) => { row[c] = obj[c] === undefined ? fromCell('', t.schema[c]) : obj[c]; });
          return row;
        });
        const range = t.sh.getRange(t.rows.length + 2, 1, rows.length, t.headers.length);
        range.setNumberFormat('@');
        range.setValues(rows.map((r) => rowValues(t, r)));
        rows.forEach((r) => t.rows.push(r));
      }),
      update: (name, id, patch) => lock(() => {
        const t = load(name);
        const i = t.rows.findIndex((r) => r.id === id);
        if (i < 0) throw new Error('No ' + name + ' row ' + id);
        Object.keys(patch).forEach((c) => { if (t.schema[c]) t.rows[i][c] = patch[c]; });
        writeRow(t, i, t.rows[i]);
      }),
      remove: (name, id) => lock(() => {
        const t = load(name);
        const i = t.rows.findIndex((r) => r.id === id);
        if (i < 0) return;
        t.sh.deleteRow(i + 2);
        delete tables[name];
      }),
    },
    mail: {
      quota: () => MailApp.getRemainingDailyQuota(),
      send: (to, subject, body) => MailApp.sendEmail({ to, subject, body, name: 'Wisdom Students Vidyanidhi' }),
    },
    files: {
      save: (owner, name, mime, b64) => {
        const root = DriveApp.getFolderById(props.getProperty('FOLDER_ID'));
        const found = root.getFoldersByName(owner);
        const folder = found.hasNext() ? found.next() : root.createFolder(owner);
        const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(b64), mime, name));
        file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
        return file.getId();
      },
      read: (id, name, mime) => {
        const blob = DriveApp.getFileById(id).getBlob();
        return { name, mime, data: Utilities.base64Encode(blob.getBytes()) };
      },
    },
    // Checks the Google sign-in token with Google and confirms it was issued for our client ID.
    verifyGoogleIdToken: (credential) => {
      const clientId = props.getProperty('GOOGLE_CLIENT_ID');
      if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not set');
      const res = UrlFetchApp.fetch(
        'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential),
        { muteHttpExceptions: true });
      if (res.getResponseCode() !== 200) throw new Error('token rejected');
      const t = JSON.parse(res.getContentText());
      const issuers = ['accounts.google.com', 'https://accounts.google.com'];
      if (t.aud !== clientId || issuers.indexOf(t.iss) < 0 || String(t.email_verified) !== 'true' || Number(t.exp) < Date.now() / 1000) {
        throw new Error('token not valid for this app');
      }
      return { email: t.email, name: t.name || '' };
    },
  };
})();
