// End-to-end API test. Needs a throwaway MongoDB:
//   TEST_MONGO_URI=mongodb://127.0.0.1:27017/taskflow_test npm test
// Skipped when TEST_MONGO_URI is not set. The database is dropped at the end.
const test = require('node:test');
const assert = require('node:assert/strict');

const URI = process.env.TEST_MONGO_URI;

test('API end to end', { skip: !URI && 'set TEST_MONGO_URI to run' }, async (t) => {
  process.env.MONGO_URI = URI;
  process.env.JWT_SECRET = 'test-secret';
  const mongoose = require('mongoose');
  const app = require('../server');
  const User = require('../models/User');

  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  t.after(async () => {
    server.close();
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  const call = async (method, path, token, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
  const ok = (r, status = 200) => {
    assert.equal(r.status, status, JSON.stringify(r.body));
    return r.body;
  };
  const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString();

  // Health reports database and secret status
  const health = ok(await call('GET', '/health'));
  assert.deepEqual(health.checks, { api: 'ok', jwtSecret: 'set', database: 'connected' });

  // ---------- auth
  const admin = ok(await call('POST', '/auth/signup', null, { name: 'Aarav Admin', email: 'admin@test.dev', password: 'secret12', role: 'Admin' }), 201);
  const mem = ok(await call('POST', '/auth/signup', null, { name: 'Mira Member', email: 'mira@test.dev', password: 'secret12' }), 201);
  const out = ok(await call('POST', '/auth/signup', null, { name: 'Omar Outsider', email: 'omar@test.dev', password: 'secret12' }), 201);
  assert.equal(mem.role, 'Member');
  assert.equal((await call('POST', '/auth/signup', null, { name: 'Dup', email: 'MIRA@test.dev', password: 'secret12' })).status, 400);
  assert.equal((await call('POST', '/auth/login', null, { email: 'mira@test.dev', password: 'wrong' })).status, 401);
  assert.equal((await call('POST', '/auth/login', null, { email: { $ne: 1 }, password: 'x' })).status, 400);
  ok(await call('POST', '/auth/login', null, { email: 'mira@test.dev', password: 'secret12' }));
  assert.equal(ok(await call('GET', '/auth/me', mem.token)).email, 'mira@test.dev');
  assert.equal((await call('GET', '/auth/me', 'garbage')).status, 401);

  // ---------- projects & access control
  assert.equal((await call('POST', '/projects', mem.token, { name: 'X', description: 'Y' })).status, 403);
  const project = ok(await call('POST', '/projects', admin.token, { name: 'Website', description: 'Relaunch', members: [mem._id], wipLimits: { inProgress: 2 } }), 201);
  assert.equal(project.members.length, 2);
  assert.equal(project.wipLimits.inProgress, 2);
  const pid = project._id;

  assert.equal((await call('GET', `/projects/${pid}`, out.token)).status, 403);
  assert.equal((await call('GET', `/tasks?projectId=${pid}`, out.token)).status, 403);
  assert.equal((await call('GET', `/projects/${pid}/activity`, out.token)).status, 403);
  assert.equal((await call('GET', `/projects/${pid}/pulse`, out.token)).status, 403);
  assert.equal((await call('GET', '/projects/not-an-id', admin.token)).status, 400);
  assert.equal(ok(await call('GET', '/projects', out.token)).length, 0);
  const listed = ok(await call('GET', '/projects', mem.token));
  assert.equal(listed.length, 1);
  assert.deepEqual(listed[0].stats, { total: 0, completed: 0, inProgress: 0, overdue: 0 });

  // Mass assignment is ignored
  const updated = ok(await call('PUT', `/projects/${pid}`, admin.token, { name: 'Website v2', createdBy: out._id, shareId: 'hack' }));
  assert.equal(updated.name, 'Website v2');
  assert.equal(updated.createdBy._id, admin._id);
  assert.equal(updated.shareId, undefined);

  // ---------- tasks
  const a = ok(await call('POST', '/tasks', admin.token, { title: 'Design API', projectId: pid, deadline: inDays(3), assignedTo: mem._id, tags: ['#Backend'], estimate: 5 }), 201);
  assert.deepEqual(a.tags, ['backend']);
  assert.equal(a.description, '');
  const b = ok(await call('POST', '/tasks', admin.token, { title: 'Build UI', description: 'Screens', projectId: pid, deadline: inDays(5), blockedBy: [a._id] }), 201);
  assert.equal((await call('POST', '/tasks', admin.token, { title: 'Bad', projectId: pid, deadline: inDays(1), assignedTo: out._id })).status, 400);
  assert.equal((await call('POST', '/tasks', admin.token, { title: 'Past', projectId: pid, deadline: inDays(-3) })).status, 400);
  assert.equal((await call('POST', '/tasks', mem.token, { title: 'Nope', projectId: pid, deadline: inDays(1) })).status, 403);

  // Members can move tasks but not edit details; outsiders can do neither
  assert.equal((await call('PUT', `/tasks/${a._id}`, mem.token, { title: 'Renamed' })).status, 403);
  assert.equal((await call('PUT', `/tasks/${a._id}`, out.token, { status: 'In Progress' })).status, 403);
  assert.equal(ok(await call('PUT', `/tasks/${a._id}`, mem.token, { status: 'In Progress', order: 5 })).status, 'In Progress');

  // Blockers: cannot complete B while A is open; cycles rejected
  const blocked = await call('PUT', `/tasks/${b._id}`, admin.token, { status: 'Completed' });
  assert.equal(blocked.status, 409);
  assert.match(blocked.body.message, /Design API/);
  assert.equal((await call('PUT', `/tasks/${a._id}`, admin.token, { blockedBy: [b._id] })).status, 400);
  const doneA = ok(await call('PUT', `/tasks/${a._id}`, mem.token, { status: 'Completed' }));
  assert.ok(doneA.completedAt);
  assert.equal(ok(await call('PUT', `/tasks/${b._id}`, admin.token, { status: 'In Review' })).status, 'In Review');

  // Unchanged past deadline does not block other edits; reopening clears completedAt
  const reopened = ok(await call('PUT', `/tasks/${a._id}`, admin.token, { status: 'In Progress', deadline: doneA.deadline, priority: 'High' }));
  assert.equal(reopened.completedAt, null);
  ok(await call('PUT', `/tasks/${a._id}`, mem.token, { status: 'Completed' }));

  // Search with regex metacharacters is safe
  assert.equal(ok(await call('GET', `/tasks?projectId=${pid}&search=${encodeURIComponent('(.*')}`, mem.token)).length, 0);
  assert.equal(ok(await call('GET', `/tasks?projectId=${pid}&search=design`, mem.token)).length, 1);
  assert.equal(ok(await call('GET', '/tasks?assignee=me', mem.token)).length, 1);

  // ---------- comments, mentions, decisions
  ok(await call('POST', `/tasks/${b._id}/comments`, admin.token, { text: 'Can you review this @mira?' }), 201);
  const c2 = ok(await call('POST', `/tasks/${b._id}/comments`, mem.token, { text: 'Decision: ship on Friday' }), 201);
  assert.equal((await call('PUT', `/tasks/${b._id}/comments/${c2._id}/decision`, mem.token)).status, 403);
  assert.equal(ok(await call('PUT', `/tasks/${b._id}/comments/${c2._id}/decision`, admin.token)).decisionLog.length, 1);
  assert.equal((await call('GET', `/tasks/${b._id}/comments`, out.token)).status, 403);
  assert.equal(ok(await call('GET', `/tasks/${b._id}/comments`, mem.token)).length, 2);
  assert.equal(ok(await call('DELETE', `/tasks/${b._id}/comments/${c2._id}`, mem.token)).decisionLog.length, 0);

  // ---------- kudos
  assert.equal((await call('POST', `/tasks/${a._id}/kudos`, mem.token)).status, 400);
  assert.equal(ok(await call('POST', `/tasks/${a._id}/kudos`, admin.token)).kudos.length, 1);

  // ---------- notifications (assignment + mention + kudos)
  const inbox = ok(await call('GET', '/notifications', mem.token));
  const types = inbox.items.map((n) => n.type).sort();
  assert.ok(types.includes('assigned') && types.includes('mentioned') && types.includes('kudos') && types.includes('project'), types.join());
  assert.ok(inbox.unread >= 4);
  ok(await call('PUT', `/notifications/${inbox.items[0]._id}/read`, mem.token));
  assert.equal((await call('PUT', `/notifications/${inbox.items[0]._id}/read`, out.token)).status, 404);
  ok(await call('PUT', '/notifications/read-all', mem.token));
  assert.equal(ok(await call('GET', '/notifications', mem.token)).unread, 0);

  // ---------- focus mode
  const c = ok(await call('POST', '/tasks', admin.token, { title: 'Write tests', projectId: pid, deadline: inDays(2), assignedTo: mem._id }), 201);
  const focus = ok(await call('POST', `/tasks/${c._id}/focus`, mem.token, { minutes: 25 }));
  assert.equal(focus.task.status, 'In Progress');
  assert.equal(focus.focus.task.title, 'Write tests');
  assert.equal(ok(await call('GET', '/auth/me', mem.token)).focus.task.title, 'Write tests');
  await User.updateOne({ _id: mem._id }, { $set: { 'focus.startedAt': new Date(Date.now() - 10 * 60000) } });
  const live = ok(await call('GET', `/team/workload?projectId=${pid}`, admin.token));
  assert.equal(live.totals.focusingNow, 1);
  const stopped = ok(await call('POST', '/tasks/focus/stop', mem.token));
  assert.equal(stopped.minutes, 10);
  assert.equal(stopped.timeSpent, 600);
  assert.equal(ok(await call('GET', '/auth/me', mem.token)).focus, null);

  // ---------- team, standup, pulse, dashboard
  const team = ok(await call('GET', '/team/workload', mem.token));
  const mira = team.members.find((m) => m.name === 'Mira Member');
  assert.equal(mira.completed7d, 1);
  assert.equal(mira.kudos7d, 1);
  assert.equal(mira.focusMinutes7d, 10);
  assert.equal((await call('GET', `/team/workload?projectId=${pid}`, out.token)).status, 403);

  const standup = ok(await call('GET', `/projects/${pid}/standup?hours=24`, mem.token));
  assert.match(standup.markdown, /### Mira Member/);
  assert.ok(standup.members.find((m) => m.name === 'Mira Member').done.includes('Design API'));

  const pulse = ok(await call('GET', `/projects/${pid}/pulse`, mem.token));
  assert.ok(pulse.score >= 0 && pulse.score <= 100);

  const dash = ok(await call('GET', '/tasks/dashboard?tz=-330', mem.token));
  assert.equal(dash.velocity.length, 14);
  assert.equal(dash.statusBreakdown.length, 4);
  assert.ok(dash.velocity.reduce((n, d) => n + d.count, 0) >= 1);
  assert.equal(dash.streak, 1);
  assert.equal(dash.focusMinutesWeek, 10);

  const playback = ok(await call('GET', `/projects/${pid}/playback-highlights`, mem.token));
  assert.ok(playback.activities.length > 5);

  const suggestion = ok(await call('GET', `/tasks/${c._id}/suggest-next-step`, mem.token));
  assert.ok(suggestion.suggestion && suggestion.suggestions.length >= 1);

  // ---------- quick add (no AI keys -> parser) and planner
  delete process.env.GROQ_API_KEY; delete process.env.GEMINI_API_KEY; delete process.env.OPENROUTER_API_KEY;
  const quick = ok(await call('POST', '/tasks/ai-create', admin.token, { prompt: 'Write launch docs tomorrow assign to Mira #docs 3pts urgent', projectId: pid, tzOffset: -330 }), 201);
  assert.equal(quick.task.title, 'Write launch docs');
  assert.equal(quick.task.assignedTo.name, 'Mira Member');
  assert.equal(quick.task.priority, 'High');
  assert.deepEqual(quick.task.tags, ['docs']);
  assert.equal(quick.summary.source, 'parser');
  assert.equal((await call('POST', '/tasks/ai-create', mem.token, { prompt: 'x', projectId: pid })).status, 403);

  const plan = ok(await call('POST', '/tasks/ai-plan', admin.token, { prompt: 'Launch a marketing campaign', projectId: pid }));
  assert.equal(plan.source, 'templates');
  const bulk = ok(await call('POST', '/tasks/bulk', admin.token, { projectId: pid, tasks: plan.tasks.slice(0, 3), tzOffset: -330 }), 201);
  assert.equal(bulk.created, 3);

  // ---------- sharing (privacy-safe, revocable)
  assert.equal((await call('POST', `/projects/${pid}/share`, mem.token)).status, 403);
  const { shareId } = ok(await call('POST', `/projects/${pid}/share`, admin.token));
  const pub = ok(await call('GET', `/projects/public/${shareId}`));
  assert.equal(pub.tasks.length, 7);
  const raw = JSON.stringify(pub);
  assert.ok(!raw.includes('@test.dev'), 'public view must not leak emails');
  assert.ok(!raw.includes('timeSpent') && !raw.includes('decisionLog'));
  ok(await call('DELETE', `/projects/${pid}/share`, admin.token));
  assert.equal((await call('GET', `/projects/public/${shareId}`)).status, 404);

  // ---------- member removal and deletes
  const removed = ok(await call('PUT', `/projects/${pid}`, admin.token, { members: [] }));
  assert.equal(removed.members.length, 1, 'creator always stays');
  assert.equal((await call('GET', `/projects/${pid}`, mem.token)).status, 403);
  ok(await call('PUT', `/projects/${pid}`, admin.token, { members: [mem._id] }));

  ok(await call('DELETE', `/tasks/${a._id}`, admin.token));
  const bAfter = ok(await call('GET', `/tasks?projectId=${pid}&search=Build`, admin.token))[0];
  assert.deepEqual(bAfter.blockedBy, [], 'deleted task is removed from blockers');

  ok(await call('DELETE', `/projects/${pid}`, admin.token));
  assert.equal((await call('GET', `/projects/${pid}`, admin.token)).status, 404);
  assert.equal(ok(await call('GET', '/tasks', admin.token)).length, 0);

  assert.equal((await call('GET', '/nope', admin.token)).status, 404);

  // Rate limiting only counts failures: many correct sign-ins from one IP (an office,
  // a classroom) never lock anyone out, but repeated wrong passwords do.
  for (let i = 0; i < 25; i++) {
    assert.equal((await call('POST', '/auth/login', null, { email: 'mira@test.dev', password: 'secret12' })).status, 200);
  }
  let blockedAt = null;
  for (let i = 0; i < 25 && blockedAt === null; i++) {
    const r = await call('POST', '/auth/login', null, { email: 'mira@test.dev', password: 'nope' });
    if (r.status === 429) blockedAt = i;
  }
  assert.ok(blockedAt !== null && blockedAt < 20, `wrong passwords get rate limited (blocked at ${blockedAt})`);
});
