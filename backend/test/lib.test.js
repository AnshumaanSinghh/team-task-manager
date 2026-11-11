const test = require('node:test');
const assert = require('node:assert/strict');
const { parseQuickTask } = require('../lib/nlp');
const { extractMentions } = require('../lib/mentions');
const { computePulse } = require('../lib/pulse');
const { buildStandup } = require('../lib/standup');
const { planFromTemplates, sanitisePlan } = require('../lib/planner');
const { parseJsonLoose } = require('../lib/ai');
const { escapeRegex, cleanTags } = require('../lib/text');

// Wednesday 11 Nov 2026, 11:30 in India (UTC+5:30 -> getTimezoneOffset() = -330)
const NOW = new Date('2026-11-11T06:00:00Z');
const IST = -330;
const members = [
  { _id: 'raj', name: 'Raj Patel', email: 'raj@example.com' },
  { _id: 'riya', name: 'Riya Sharma', email: 'rsharma@example.com' },
  { _id: 'raj2', name: 'Raj Malhotra', email: 'rajm@example.com' }
];
const parse = (p) => parseQuickTask(p, { now: NOW, tzOffset: IST, members });
const localDate = (d) => new Date(d.getTime() - IST * 60000).toISOString().slice(0, 10);

test('quick add: weekday deadline and assignee', () => {
  const r = parse('Build login page by Friday, assign to Raj Patel');
  assert.equal(r.title, 'Build login page');
  assert.equal(localDate(r.deadline), '2026-11-13');
  assert.equal(r.assigneeId, 'raj');
  assert.equal(r.priority, 'Medium');
});

test('quick add: two people with the same first name resolve by full name', () => {
  assert.equal(parse('Fix footer assign to Raj Malhotra').assigneeId, 'raj2');
});

test('quick add: mention, tag, points, tomorrow and soft priority', () => {
  const r = parse('Fix critical checkout bug tomorrow @riya #payments 5pts');
  assert.equal(r.title, 'Fix critical checkout bug');
  assert.equal(r.priority, 'High');
  assert.equal(localDate(r.deadline), '2026-11-12');
  assert.equal(r.assigneeId, 'riya');
  assert.deepEqual(r.tags, ['payments']);
  assert.equal(r.estimate, 5);
});

test('quick add: relative and absolute dates', () => {
  assert.equal(localDate(parse('Write notes in 2 weeks').deadline), '2026-11-25');
  assert.equal(localDate(parse('Plan offsite end of month').deadline), '2026-11-30');
  assert.equal(localDate(parse('Ship v2 on 2026-12-01').deadline), '2026-12-01');
  assert.equal(localDate(parse('Kickoff by Nov 20').deadline), '2026-11-20');
  assert.equal(localDate(parse('Retro by 5 Jan').deadline), '2027-01-05');
  assert.equal(localDate(parse('Demo next friday').deadline), '2026-11-20');
  assert.equal(localDate(parse('Send invoice today').deadline), '2026-11-11');
});

test('quick add: deadline is end of the local day', () => {
  const r = parse('Send invoice today');
  assert.equal(r.deadline.toISOString(), '2026-11-11T18:29:00.000Z');
});

test('quick add: no date falls back to three days and is flagged', () => {
  const r = parse('Refactor API client');
  assert.equal(r.deadlineParsed, false);
  assert.equal(localDate(r.deadline), '2026-11-14');
});

test('quick add: priority words need word boundaries', () => {
  assert.equal(parse('Update highlight colors').priority, 'Medium');
  assert.equal(parse('Rotate keys asap').priority, 'High');
  assert.equal(parse('Tidy docs priority low').priority, 'Low');
  assert.equal(parse('Tidy docs priority low').title, 'Tidy docs');
});

test('quick add: abbreviations need a preposition', () => {
  assert.equal(parse('Sat down with design').deadlineParsed, false);
  assert.equal(localDate(parse('Review copy by fri').deadline), '2026-11-13');
});

test('mentions resolve by first name, full name and email local part', () => {
  assert.deepEqual(extractMentions('thanks @riya and @RajPatel', members).sort(), ['raj', 'riya']);
  assert.deepEqual(extractMentions('ping @rsharma', members), ['riya']);
  assert.deepEqual(extractMentions('mail me at a@riya.com', members), []);
  assert.deepEqual(extractMentions('no mentions here', members), []);
});

test('pulse: empty project is neutral', () => {
  const p = computePulse({ tasks: [], recentActivityCount: 0, now: NOW });
  assert.equal(p.score, 60);
  assert.equal(p.status, 'warning');
});

test('pulse: completed active project is healthy, overdue + blocked project is critical', () => {
  const done = Array.from({ length: 5 }, (_, i) => ({ _id: `d${i}`, status: 'Completed', deadline: NOW, updatedAt: NOW }));
  assert.equal(computePulse({ tasks: done, recentActivityCount: 25, now: NOW }).status, 'healthy');

  const past = new Date(NOW.getTime() - 5 * 86400000);
  const bad = [
    { _id: 'a', status: 'To Do', deadline: past, updatedAt: past, blockedBy: ['b'] },
    { _id: 'b', status: 'To Do', deadline: past, updatedAt: past }
  ];
  const p = computePulse({ tasks: bad, recentActivityCount: 0, now: NOW });
  assert.equal(p.status, 'critical');
  assert.equal(p.metrics.blocked, 1);
  assert.equal(p.metrics.overdue, 2);
});

test('standup: done, doing and blockers per member', () => {
  const tasks = [
    { _id: 't1', title: 'API schema', status: 'Completed', assignedTo: 'raj', deadline: NOW, completedAt: new Date(NOW.getTime() - 3600000) },
    { _id: 't2', title: 'Login UI', status: 'In Progress', assignedTo: 'raj', deadline: new Date(NOW.getTime() + 86400000), blockedBy: ['t3'] },
    { _id: 't3', title: 'Auth service', status: 'To Do', assignedTo: 'riya', deadline: new Date(NOW.getTime() - 86400000), blockedBy: [] }
  ];
  const s = buildStandup({ project: { name: 'Web' }, members: members.slice(0, 2), tasks, activities: [], now: NOW });
  const raj = s.members.find((m) => m.id === 'raj');
  const riya = s.members.find((m) => m.id === 'riya');
  assert.deepEqual(raj.done, ['API schema']);
  assert.deepEqual(raj.doing, ['Login UI']);
  assert.match(raj.blockers[0], /waiting on "Auth service"/);
  assert.match(riya.blockers[0], /overdue since/);
  assert.match(s.markdown, /### Raj Patel/);
});

test('planner: picks a playbook by keywords and sanitises AI output', () => {
  const web = planFromTemplates('Relaunch our marketing website before the holiday sale');
  assert.ok(web.length >= 5);
  assert.match(web[1].title, /wireframes/i, 'website playbook wins over "relaunch" matching "launch"');
  assert.match(planFromTemplates('Plan the product launch campaign')[0].title, /audience/i);
  assert.match(planFromTemplates('Build the dashboard')[0].title, /scope/i, '"build" is not "ui"');
  assert.ok(web.every((t) => t.title && t.dueInDays > 0));
  const clean = sanitisePlan({ tasks: [{ title: 'X', priority: 'Urgent', estimate: '99', dueInDays: -4 }, { title: '' }] });
  assert.equal(clean.length, 1);
  assert.equal(clean[0].priority, 'Medium');
  assert.equal(clean[0].estimate, 21);
  assert.equal(clean[0].dueInDays, 7);
});

test('helpers: loose JSON, regex escaping and tag cleaning', () => {
  assert.deepEqual(parseJsonLoose('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJsonLoose('Sure! {"a":2} hope that helps'), { a: 2 });
  assert.equal(parseJsonLoose('nope'), null);
  assert.ok(new RegExp(escapeRegex('a.*(b')).test('xa.*(b'));
  assert.deepEqual(cleanTags(['#Front End', 'front-end', 'API', '', 7]), ['front-end', 'api']);
});

test('database errors are explained without leaking the connection string', () => {
  const { explain } = require('../config/db');
  assert.match(explain(new Error('querySrv ENOTFOUND _mongodb._tcp.cluster0.abc.mongodb.net')), /host not found/);
  assert.match(explain(new Error('bad auth : Authentication failed.')), /username or password/);
  assert.match(explain(new Error('connect ECONNREFUSED 127.0.0.1:27017')), /Start MongoDB locally/);
  assert.match(explain(new Error('Server selection timed out after 8000 ms')), /0\.0\.0\.0\/0/);
  assert.doesNotMatch(explain(new Error('bad auth mongodb+srv://u:secret@x')), /secret/);
});

test('rate limiter: successful requests do not count when skipSuccessful is on', () => {
  const { EventEmitter } = require('node:events');
  const { rateLimit } = require('../lib/rateLimit');
  const limiter = rateLimit({ windowMs: 60000, max: 2, skipSuccessful: true });
  const run = (status) => {
    const res = Object.assign(new EventEmitter(), {
      statusCode: 200,
      set() { return this; },
      status(code) { this.statusCode = code; return this; },
      json() { this.blocked = true; return this; }
    });
    let passed = false;
    limiter({ ip: '1.2.3.4' }, res, () => { passed = true; });
    if (passed) { res.statusCode = status; res.emit('finish'); }
    return passed;
  };
  for (let i = 0; i < 10; i++) assert.equal(run(200), true, 'successes never block');
  assert.equal(run(401), true);
  assert.equal(run(401), true);
  assert.equal(run(401), false, 'third failure is blocked');
});
