/* Reports: the district-by-scheme table the committee already keeps, plus course, stream, status and payment totals. */

const SCHOLAR_STATUSES = ['selected', 'active', 'renewal_due', 'renewal_review', 'on_hold'];

function tally(items, keyFn) {
  const out = {};
  items.forEach((x) => {
    const k = keyFn(x) || '(not set)';
    out[k] = (out[k] || 0) + 1;
  });
  return Object.keys(out).sort((a, b) => out[b] - out[a]).map((k) => ({ key: k, count: out[k] }));
}

ACTIONS['report.summary'] = {
  ...STAFF,
  fn: (ctx) => {
    const rows = visibleApplications(ctx);
    const scholars = rows.filter(({ app }) => SCHOLAR_STATUSES.includes(app.status));
    const years = [...new Set(scholars.map(({ app }) => app.scheme_year).filter(Boolean))].sort();
    const byDistrict = {};
    scholars.forEach(({ app, ap }) => {
      const d = ap.district || '(not set)';
      byDistrict[d] = byDistrict[d] || { district: d, total: 0 };
      byDistrict[d][app.scheme_year || '?'] = (byDistrict[d][app.scheme_year || '?'] || 0) + 1;
      byDistrict[d].total++;
    });
    const money = { scholars: scholars.length, per_month: scholars.reduce((s, { app }) => s + (app.monthly_amount || 0), 0), by_fund: {} };
    FUND_TYPES.forEach((f) => {
      const g = scholars.filter(({ app }) => app.fund_type === f);
      money.by_fund[f] = { scholars: g.length, per_month: g.reduce((s, { app }) => s + (app.monthly_amount || 0), 0) };
    });
    const ids = new Set(rows.map(({ app }) => app.id));
    const pays = P.db.all('Payments').filter((p) => ids.has(p.application_id));
    return {
      years,
      by_district: Object.values(byDistrict).sort((a, b) => b.total - a.total),
      by_status: tally(rows, ({ app }) => app.status),
      by_stream: tally(scholars, ({ app }) => app.stream),
      by_category: tally(scholars, ({ app }) => app.category),
      by_course: tally(scholars, ({ app }) => (app.course || '').trim()).slice(0, 40),
      by_gender: tally(scholars, ({ ap }) => ap.gender),
      by_grade: tally(rows.filter(({ app }) => app.grade), ({ app }) => app.grade),
      money,
      payments: {
        paid: pays.filter((p) => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0),
        pending: pays.filter((p) => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0),
        failed: pays.filter((p) => p.status === 'failed').length,
      },
    };
  },
};
