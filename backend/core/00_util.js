/* Vidyanidhi backend core.
   Plain JavaScript that runs unchanged in Google Apps Script (V8) and in Node.
   No import/export. The platform object `P` is supplied by gas/platform.gs or node/platform.mjs. */

class ApiError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code || 'ERROR';
  }
}
const fail = (message, code) => {
  throw new ApiError(message, code);
};

const STATUSES = [
  'draft', 'submitted', 'documents_requested', 'under_verification', 'interview_scheduled',
  'decision_pending', 'selected', 'active', 'renewal_due', 'renewal_review', 'not_selected',
  'waitlisted', 'on_hold', 'discontinued', 'completed',
];
const EDITABLE = ['draft', 'documents_requested'];
const STAFF_ROLES = ['admin', 'master'];
const ROLES = ['applicant', 'verifier', 'admin', 'master'];
const GENDERS = ['male', 'female', 'other'];
const COURSE_TYPES = ['self_financing', 'aided', 'government'];
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_FILES_PER_DOC = 3; // files kept at the same time for one document (for example front and back)
const MAX_VERSIONS_PER_DOC = 8; // all uploads ever made for one document, including removed and replaced ones
const MAX_DOCS_PER_APPLICATION = 30;

const isoNow = () => P.now().toISOString();
// Calendar date in India (UTC+5:30), used for due dates and reminders.
const istDate = (offsetDays) =>
  new Date(P.now().getTime() + 330 * 60000 + (offsetDays || 0) * 86400000).toISOString().slice(0, 10);
const istHour = () => new Date(P.now().getTime() + 330 * 60000).getUTCHours();
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

const clean = (v, max) => (v === null || v === undefined ? '' : String(v).trim().slice(0, max || 500));

// Convert one incoming value to the type named in a field map; invalid input throws.
function coerce(value, type, label) {
  if (type === 'bool') return value === true || value === 'true' || value === 'yes' || value === 1;
  if (value === null || value === undefined || value === '') return type === 'n' ? null : '';
  if (type === 'n') {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) fail(`${label || 'A number'} is not valid.`, 'INVALID');
    return n;
  }
  if (type === 'date') {
    const s = clean(value, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) fail(`${label || 'Date'} is not valid.`, 'INVALID');
    return s;
  }
  if (type === 'month') {
    const s = clean(value, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(s)) fail(`${label || 'Month'} is not valid.`, 'INVALID');
    return s;
  }
  if (Array.isArray(type)) {
    const s = clean(value, 40);
    if (!type.includes(s)) fail(`${label || 'Value'} is not valid.`, 'INVALID');
    return s;
  }
  return clean(value, type === 'long' ? 1000 : 200);
}

// Keep only the whitelisted fields of `src`, validated.
function pickFields(src, fields) {
  const out = {};
  for (const key of Object.keys(fields)) {
    if (src && Object.prototype.hasOwnProperty.call(src, key)) out[key] = coerce(src[key], fields[key], key.replace(/_/g, ' '));
  }
  return out;
}

const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 120;
const normEmail = (e) => clean(e, 120).toLowerCase();
const splitScope = (s) => (s ? String(s).split('|').filter(Boolean) : []);
const joinScope = (a) => (Array.isArray(a) ? a.map((x) => clean(x, 60)).filter(Boolean).join('|') : '');

function audit(actor, action, entity, entityId, detail) {
  P.db.insert('Audit', {
    id: P.uuid(), at: isoNow(), actor: actor ? actor.id : '', action, entity: entity || '',
    entity_id: entityId || '', detail: detail ? clean(JSON.stringify(detail), 1500) : '',
  });
}
