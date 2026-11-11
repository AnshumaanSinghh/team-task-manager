// Demo data for local development and screenshots.
//   npm run seed            -> adds demo users + a demo project (skips if they exist)
// Refuses to run with NODE_ENV=production unless --yes is passed.
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const Comment = require('../models/Comment');

const DAY = 86400000;
const PASSWORD = 'demo1234';

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--yes')) {
    console.error('Refusing to seed a production database. Pass --yes if you really mean it.');
    process.exit(1);
  }
  if (!process.env.MONGO_URI) {
    console.error('Set MONGO_URI first (see backend/.env.example).');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);

  if (await User.exists({ email: 'admin@taskflow.demo' })) {
    console.log('Demo data already present. Sign in as admin@taskflow.demo / demo1234');
    await mongoose.disconnect();
    return;
  }

  const people = [
    { name: 'Aarav Mehta', email: 'admin@taskflow.demo', role: 'Admin' },
    { name: 'Riya Sharma', email: 'riya@taskflow.demo', role: 'Member' },
    { name: 'Kabir Khan', email: 'kabir@taskflow.demo', role: 'Member' },
    { name: 'Zoya Ali', email: 'zoya@taskflow.demo', role: 'Member' }
  ];
  const users = [];
  for (const p of people) users.push(await User.create({ ...p, password: PASSWORD }));
  const [aarav, riya, kabir, zoya] = users;

  const now = Date.now();
  const ago = (d, h = 0) => new Date(now - d * DAY - h * 3600000);
  const ahead = (d) => new Date(now + d * DAY);

  const project = await Project.create({
    name: 'Website Relaunch',
    description: 'Ship the new marketing site with faster pages, a fresh brand and a self-serve signup flow.',
    createdBy: aarav._id,
    members: users.map((u) => u._id),
    color: 'emerald',
    wipLimits: { todo: 0, inProgress: 4, inReview: 2 }
  });
  const mobile = await Project.create({
    name: 'Mobile App MVP',
    description: 'First iOS and Android release: onboarding, tasks and push reminders.',
    createdBy: aarav._id,
    members: [aarav._id, kabir._id, zoya._id],
    color: 'forest'
  });

  const T = (title, extra) => ({ title, projectId: project._id, createdBy: aarav._id, description: '', ...extra });
  const rows = [
    T('Audit current site and analytics', { status: 'Completed', assignedTo: riya._id, priority: 'High', estimate: 3, tags: ['research'], deadline: ago(9), completedAt: ago(10), createdAt: ago(14), description: 'Baseline Core Web Vitals, top landing pages and drop-off points.' }),
    T('Define brand tokens and type scale', { status: 'Completed', assignedTo: zoya._id, priority: 'Medium', estimate: 3, tags: ['design'], deadline: ago(6), completedAt: ago(7), createdAt: ago(13) }),
    T('Wireframes for home and pricing', { status: 'Completed', assignedTo: zoya._id, priority: 'High', estimate: 5, tags: ['design'], deadline: ago(4), completedAt: ago(5), createdAt: ago(12), subtasks: [{ title: 'Home', isCompleted: true }, { title: 'Pricing', isCompleted: true }, { title: 'Review with team', isCompleted: true }] }),
    T('Set up repo, CI and preview deploys', { status: 'Completed', assignedTo: kabir._id, priority: 'Medium', estimate: 2, tags: ['setup'], deadline: ago(3), completedAt: ago(3), createdAt: ago(11) }),
    T('Build responsive navigation', { status: 'Completed', assignedTo: kabir._id, priority: 'Medium', estimate: 3, tags: ['frontend'], deadline: ago(1), completedAt: ago(1), createdAt: ago(8) }),
    T('Implement pricing page', { status: 'In Review', assignedTo: kabir._id, priority: 'High', estimate: 5, tags: ['frontend'], deadline: ahead(1), createdAt: ago(6), description: 'Three plans, monthly/yearly toggle and FAQ accordion.', subtasks: [{ title: 'Plan cards', isCompleted: true }, { title: 'Billing toggle', isCompleted: true }, { title: 'FAQ', isCompleted: false }] }),
    T('Write homepage copy', { status: 'In Progress', assignedTo: riya._id, priority: 'High', estimate: 3, tags: ['content'], deadline: ahead(2), createdAt: ago(5) }),
    T('Signup flow with email verification', { status: 'In Progress', assignedTo: kabir._id, priority: 'High', estimate: 8, tags: ['frontend', 'auth'], deadline: ahead(4), createdAt: ago(4), description: 'Self-serve signup, verification email and first-run checklist.' }),
    T('Hero illustration set', { status: 'In Progress', assignedTo: zoya._id, priority: 'Medium', estimate: 3, tags: ['design'], deadline: ago(1), createdAt: ago(6) }),
    T('SEO meta and Open Graph images', { status: 'To Do', assignedTo: riya._id, priority: 'Medium', estimate: 2, tags: ['seo'], deadline: ahead(5), createdAt: ago(3) }),
    T('Accessibility and Lighthouse pass', { status: 'To Do', assignedTo: zoya._id, priority: 'Medium', estimate: 3, tags: ['qa'], deadline: ahead(6), createdAt: ago(2) }),
    T('Launch checklist and redirects', { status: 'To Do', priority: 'High', estimate: 2, tags: ['launch'], deadline: ahead(8), createdAt: ago(1) }),
    T('Customer stories section', { status: 'To Do', assignedTo: riya._id, priority: 'Low', estimate: 2, tags: ['content'], deadline: ahead(10), createdAt: ago(1) })
  ].map((t, i) => ({ ...t, order: i * 1000, updatedAt: t.completedAt || t.createdAt }));

  const tasks = await Task.insertMany(rows, { timestamps: false });
  const byTitle = (s) => tasks.find((t) => t.title.startsWith(s));
  await Task.updateOne({ _id: byTitle('Accessibility')._id }, { $set: { blockedBy: [byTitle('Implement pricing')._id, byTitle('Signup flow')._id] } });
  await Task.updateOne({ _id: byTitle('Launch checklist')._id }, { $set: { blockedBy: [byTitle('Accessibility')._id] } });
  await Task.updateOne({ _id: byTitle('Build responsive')._id }, { $set: { kudos: [{ user: aarav._id, at: ago(1) }, { user: riya._id, at: ago(1) }] } });
  await Task.updateOne({ _id: byTitle('Signup flow')._id }, { $set: { timeSpent: 2 * 3600 + 25 * 60 } });

  await Task.insertMany([
    { title: 'Onboarding screens', projectId: mobile._id, createdBy: aarav._id, assignedTo: zoya._id, status: 'In Progress', priority: 'High', estimate: 5, deadline: ahead(3), tags: ['design'], order: 1 },
    { title: 'Push reminder service', projectId: mobile._id, createdBy: aarav._id, assignedTo: kabir._id, status: 'To Do', priority: 'Medium', estimate: 5, deadline: ahead(9), tags: ['backend'], order: 2 },
    { title: 'App store listing', projectId: mobile._id, createdBy: aarav._id, status: 'To Do', priority: 'Low', estimate: 1, deadline: ahead(20), tags: ['launch'], order: 3 }
  ]);

  const acts = [];
  const act = (userId, action, details, createdAt, extra = {}) => acts.push({ projectId: project._id, userId, action, details, createdAt, updatedAt: createdAt, ...extra });
  act(aarav._id, 'created_project', 'created project "Website Relaunch"', ago(14, 2));
  for (const t of tasks) act(aarav._id, 'created_task', `created task "${t.title}"`, new Date(t.createdAt.getTime() + 60000), { taskId: t._id });
  for (const t of tasks.filter((x) => x.completedAt)) {
    act(t.assignedTo, 'status_change', `moved "${t.title}" from In Progress to Completed`, t.completedAt, { taskId: t._id, meta: { from: 'In Progress', to: 'Completed' } });
  }
  act(kabir._id, 'status_change', 'moved "Implement pricing page" from In Progress to In Review', ago(0, 5), { taskId: byTitle('Implement pricing')._id, meta: { from: 'In Progress', to: 'In Review' } });
  act(kabir._id, 'focus_session', 'focused 50 min on "Signup flow with email verification"', ago(0, 3), { taskId: byTitle('Signup flow')._id, meta: { minutes: 50 } });
  act(riya._id, 'focus_session', 'focused 25 min on "Write homepage copy"', ago(0, 2), { taskId: byTitle('Write homepage copy')._id, meta: { minutes: 25 } });
  act(aarav._id, 'kudos', 'sent kudos for "Build responsive navigation"', ago(1), { taskId: byTitle('Build responsive')._id });
  await Activity.insertMany(acts, { timestamps: false });

  const pricing = byTitle('Implement pricing');
  const c1 = await Comment.create({ taskId: pricing._id, userId: kabir._id, text: 'Pricing cards are up on the preview. @zoya can you check spacing on mobile?', mentions: [zoya._id] });
  await Comment.create({ taskId: pricing._id, userId: zoya._id, text: 'Looks great. Bump the card gap to **24px** below 640px.' });
  const decision = await Comment.create({ taskId: pricing._id, userId: aarav._id, text: 'Decision: yearly plans show the monthly equivalent price with a "2 months free" badge.' });
  await Task.updateOne({ _id: pricing._id }, { $set: { decisionLog: [{ commentId: decision._id, text: decision.text, markedBy: aarav._id, markedAt: new Date() }] } });
  void c1;

  console.log('Seeded demo data. Sign in with any of:');
  for (const p of people) console.log(`  ${p.email.padEnd(24)} ${PASSWORD}  (${p.role})`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
