/* Single entry point. Body: { action, token, data }. Reply: { ok, data } or { ok:false, error, code }. */

function handle(body) {
  try {
    const def = body && ACTIONS[body.action];
    if (!def) fail('Unknown request.', 'BAD_REQUEST');
    const ctx = { user: null, via: null };
    if (!def.pub) {
      const session = authenticate(body.token);
      ctx.user = session.user;
      ctx.via = session.via;
      if (def.roles && !def.roles.includes(ctx.user.role)) fail('Not allowed.', 'FORBIDDEN');
      if (def.staff && !isStaffCtx(ctx)) fail('Not allowed.', 'FORBIDDEN');
      if (def.master && ctx.user.role !== 'master') fail('Only the master admin can do this.', 'FORBIDDEN');
    }
    return { ok: true, data: def.fn(ctx, body.data || {}) };
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, error: e.message, code: e.code };
    P.log('ERROR', e && e.stack ? e.stack : String(e));
    return { ok: false, error: 'Something went wrong. Please try again.', code: 'SERVER' };
  }
}
