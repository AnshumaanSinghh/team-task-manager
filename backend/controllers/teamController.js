const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const User = require('../models/User');
const { getProjectForUser, isAdmin } = require('../lib/access');

const DAY = 86400000;

function loadLevel({ open, overdue, openPoints }) {
  const load = open + overdue + openPoints / 3;
  if (load >= 9) return 'heavy';
  if (load >= 4) return 'balanced';
  return 'light';
}

// Team workload: open work, overdue, points, weekly output and who is focusing right now.
const getWorkload = async (req, res) => {
  let projectIds;
  let memberIds;

  if (req.query.projectId) {
    const project = await getProjectForUser(req.query.projectId, req.user);
    projectIds = [project._id];
    memberIds = project.members.map(String);
  } else {
    const projects = await Project.find(isAdmin(req.user) ? {} : { members: req.user._id }).select('members').lean();
    projectIds = projects.map((p) => p._id);
    memberIds = [...new Set(projects.flatMap((p) => p.members.map(String)))];
    if (!memberIds.includes(String(req.user._id))) memberIds.push(String(req.user._id));
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * DAY);

  const [users, tasks, focusAgg] = await Promise.all([
    User.find({ _id: { $in: memberIds } }).select('name email role focus').populate('focus.task', 'title').lean(),
    Task.find({ projectId: { $in: projectIds } }).select('status assignedTo deadline estimate completedAt kudos').lean(),
    Activity.aggregate([
      { $match: { action: 'focus_session', userId: { $in: memberIds.map((id) => new mongoose.Types.ObjectId(id)) }, projectId: { $in: projectIds }, createdAt: { $gte: weekAgo } } },
      { $group: { _id: '$userId', minutes: { $sum: '$meta.minutes' } } }
    ])
  ]);

  const focusByUser = new Map(focusAgg.map((f) => [String(f._id), Math.round(f.minutes || 0)]));

  const members = users.map((u) => {
    const id = String(u._id);
    const mine = tasks.filter((t) => String(t.assignedTo) === id);
    const open = mine.filter((t) => t.status !== 'Completed');
    const stats = {
      open: open.length,
      todo: open.filter((t) => t.status === 'To Do').length,
      active: open.filter((t) => t.status === 'In Progress' || t.status === 'In Review').length,
      overdue: open.filter((t) => new Date(t.deadline) < now).length,
      openPoints: open.reduce((n, t) => n + (t.estimate || 0), 0),
      completed7d: mine.filter((t) => t.completedAt && new Date(t.completedAt) >= weekAgo).length,
      kudos7d: mine.reduce((n, t) => n + (t.kudos || []).filter((k) => new Date(k.at) >= weekAgo).length, 0),
      focusMinutes7d: focusByUser.get(id) || 0
    };
    const live = u.focus?.task && u.focus.endsAt && new Date(u.focus.endsAt) > now;
    return {
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      ...stats,
      load: loadLevel(stats),
      focus: live ? { task: u.focus.task, startedAt: u.focus.startedAt, endsAt: u.focus.endsAt } : null
    };
  }).sort((a, b) => (b.focus ? 1 : 0) - (a.focus ? 1 : 0) || b.open + b.overdue - (a.open + a.overdue) || a.name.localeCompare(b.name));

  res.json({
    members,
    totals: {
      members: members.length,
      open: members.reduce((n, m) => n + m.open, 0),
      overdue: members.reduce((n, m) => n + m.overdue, 0),
      focusingNow: members.filter((m) => m.focus).length,
      completed7d: members.reduce((n, m) => n + m.completed7d, 0)
    }
  });
};

module.exports = { getWorkload };
