const crypto = require('crypto');
const Project = require('../models/Project');
const { PROJECT_COLORS } = require('../models/Project');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { httpError } = require('../lib/http');
const { cleanString } = require('../lib/text');
const { getProjectForUser, isAdmin, sameId, isValidIdList } = require('../lib/access');
const { computePulse } = require('../lib/pulse');
const { buildStandup } = require('../lib/standup');
const { notify } = require('../lib/notify');

const populateProject = (query) => query.populate('members', 'name email role').populate('createdBy', 'name');

async function validMemberIds(ids) {
  if (!Array.isArray(ids)) return [];
  const unique = [...new Set(ids.map(String))];
  if (!isValidIdList(unique)) throw httpError(400, 'Invalid member id');
  const users = await User.find({ _id: { $in: unique } }).select('_id');
  return users.map((u) => String(u._id));
}

function cleanWip(wip) {
  if (!wip || typeof wip !== 'object') return undefined;
  const out = {};
  for (const key of ['todo', 'inProgress', 'inReview']) {
    const n = parseInt(wip[key], 10);
    out[key] = Number.isFinite(n) ? Math.max(0, Math.min(99, n)) : 0;
  }
  return out;
}

async function projectStats(projectIds) {
  const now = new Date();
  const rows = await Task.aggregate([
    { $match: { projectId: { $in: projectIds } } },
    {
      $group: {
        _id: '$projectId',
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $in: ['$status', ['In Progress', 'In Review']] }, 1, 0] } },
        overdue: {
          $sum: { $cond: [{ $and: [{ $ne: ['$status', 'Completed'] }, { $lt: ['$deadline', now] }] }, 1, 0] }
        }
      }
    }
  ]);
  return new Map(rows.map((r) => [String(r._id), { total: r.total, completed: r.completed, inProgress: r.inProgress, overdue: r.overdue }]));
}

const createProject = async (req, res) => {
  const name = cleanString(req.body?.name, 80);
  const description = cleanString(req.body?.description, 500);
  if (!name || !description) throw httpError(400, 'Project name and description are required');

  const memberIds = await validMemberIds(req.body?.members || []);
  if (!memberIds.includes(String(req.user._id))) memberIds.push(String(req.user._id));

  const color = PROJECT_COLORS.includes(req.body?.color) ? req.body.color : PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];

  const project = await Project.create({
    name,
    description,
    createdBy: req.user._id,
    members: memberIds,
    color,
    wipLimits: cleanWip(req.body?.wipLimits)
  });

  await Activity.create({
    projectId: project._id,
    userId: req.user._id,
    action: 'created_project',
    details: `created project "${project.name}"`
  });

  await notify({
    users: memberIds,
    actor: req.user._id,
    type: 'project',
    message: `${req.user.name} added you to "${project.name}"`,
    project: project._id
  });

  const populated = await populateProject(Project.findById(project._id));
  res.status(201).json(populated);
};

const getProjects = async (req, res) => {
  const filter = isAdmin(req.user) ? {} : { members: req.user._id };
  const projects = await populateProject(Project.find(filter).sort({ createdAt: -1 })).lean();
  const stats = await projectStats(projects.map((p) => p._id));
  res.json(projects.map((p) => ({
    ...p,
    stats: stats.get(String(p._id)) || { total: 0, completed: 0, inProgress: 0, overdue: 0 }
  })));
};

const getProjectById = async (req, res) => {
  const project = await getProjectForUser(req.params.id, req.user, { populate: true });
  res.json(project);
};

const updateProject = async (req, res) => {
  const project = await getProjectForUser(req.params.id, req.user);
  const body = req.body || {};
  const changed = [];

  if (body.name !== undefined) {
    const name = cleanString(body.name, 80);
    if (!name) throw httpError(400, 'Project name cannot be empty');
    if (name !== project.name) { project.name = name; changed.push('name'); }
  }
  if (body.description !== undefined) {
    const description = cleanString(body.description, 500);
    if (!description) throw httpError(400, 'Description cannot be empty');
    if (description !== project.description) { project.description = description; changed.push('description'); }
  }
  if (body.color !== undefined && PROJECT_COLORS.includes(body.color) && body.color !== project.color) {
    project.color = body.color;
    changed.push('color');
  }
  if (body.wipLimits !== undefined) {
    project.wipLimits = cleanWip(body.wipLimits);
    changed.push('WIP limits');
  }

  let added = [];
  let removed = [];
  if (body.members !== undefined) {
    const next = await validMemberIds(body.members);
    const creator = String(project.createdBy);
    if (!next.includes(creator)) next.push(creator);
    const before = project.members.map(String);
    added = next.filter((id) => !before.includes(id));
    removed = before.filter((id) => !next.includes(id));
    project.members = next;
  }

  await project.save();

  if (changed.length) {
    await Activity.create({
      projectId: project._id, userId: req.user._id, action: 'updated_project',
      details: `updated project ${changed.join(', ')}`, meta: { fields: changed }
    });
  }
  if (added.length || removed.length) {
    const users = await User.find({ _id: { $in: [...added, ...removed] } }).select('name');
    const nameOf = (id) => users.find((u) => sameId(u, id))?.name || 'a member';
    const entries = [
      ...added.map((id) => ({ projectId: project._id, userId: req.user._id, action: 'added_member', details: `added ${nameOf(id)} to the project` })),
      ...removed.map((id) => ({ projectId: project._id, userId: req.user._id, action: 'removed_member', details: `removed ${nameOf(id)} from the project` }))
    ];
    await Activity.insertMany(entries);
    await notify({ users: added, actor: req.user._id, type: 'project', message: `${req.user.name} added you to "${project.name}"`, project: project._id });
  }

  const populated = await populateProject(Project.findById(project._id));
  res.json(populated);
};

const deleteProject = async (req, res) => {
  const project = await getProjectForUser(req.params.id, req.user);
  const taskIds = (await Task.find({ projectId: project._id }).select('_id').lean()).map((t) => t._id);
  await Promise.all([
    Comment.deleteMany({ taskId: { $in: taskIds } }),
    Task.deleteMany({ projectId: project._id }),
    Activity.deleteMany({ projectId: project._id }),
    Notification.deleteMany({ project: project._id }),
    User.updateMany({ 'focus.project': project._id }, { $set: { focus: { task: null, project: null, startedAt: null, endsAt: null } } })
  ]);
  await project.deleteOne();
  res.json({ id: String(project._id), message: 'Project deleted' });
};

const generateShareLink = async (req, res) => {
  const project = await getProjectForUser(req.params.id, req.user);
  if (!project.shareId) {
    project.shareId = crypto.randomBytes(16).toString('hex');
    await project.save();
  }
  res.json({ shareId: project.shareId });
};

const revokeShareLink = async (req, res) => {
  const project = await getProjectForUser(req.params.id, req.user);
  project.shareId = undefined;
  await project.save();
  res.json({ shareId: null });
};

const getPublicProject = async (req, res) => {
  const shareId = String(req.params.shareId || '');
  if (!/^[a-f0-9]{32}$/.test(shareId)) throw httpError(404, 'Public project not found');

  const project = await Project.findOne({ shareId })
    .select('name description color members createdBy createdAt')
    .populate('members', 'name')
    .populate('createdBy', 'name')
    .lean();
  if (!project) throw httpError(404, 'Public project not found');

  // Read-only and privacy-safe: no emails, comments, decisions or time logs.
  const tasks = await Task.find({ projectId: project._id })
    .select('title description status priority deadline assignedTo tags estimate subtasks order createdAt')
    .populate('assignedTo', 'name')
    .sort({ order: 1, createdAt: 1 })
    .lean();

  res.json({ project, tasks });
};

const getProjectActivity = async (req, res) => {
  const project = await getProjectForUser(req.params.id, req.user);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 50));
  const activities = await Activity.find({ projectId: project._id })
    .populate('userId', 'name')
    .sort({ createdAt: -1 })
    .limit(limit);
  res.json(activities);
};

const getProjectPulse = async (req, res) => {
  const project = await getProjectForUser(req.params.id, req.user);
  const tasks = await Task.find({ projectId: project._id }).populate('assignedTo', 'name').lean();
  const recentActivityCount = await Activity.countDocuments({
    projectId: project._id,
    createdAt: { $gte: new Date(Date.now() - 7 * 86400000) }
  });
  res.json(computePulse({ tasks, recentActivityCount }));
};

const getPlaybackHighlights = async (req, res) => {
  const project = await getProjectForUser(req.params.id, req.user);
  const [recent, tasks] = await Promise.all([
    Activity.find({ projectId: project._id }).populate('userId', 'name').sort({ createdAt: -1 }).limit(500).lean(),
    Task.find({ projectId: project._id }).lean()
  ]);
  const activities = recent.reverse();

  const dayCounts = {};
  let peakActivityDate = null;
  let maxCount = 0;
  for (const act of activities) {
    const date = new Date(act.createdAt).toDateString();
    dayCounts[date] = (dayCounts[date] || 0) + 1;
    if (dayCounts[date] > maxCount) {
      maxCount = dayCounts[date];
      peakActivityDate = date;
    }
  }

  let largestTaskCompleted = null;
  let biggest = -1;
  for (const task of tasks) {
    if (task.status !== 'Completed') continue;
    const size = (task.estimate || 0) * 10 + (task.subtasks?.length || 0);
    if (size > biggest) {
      biggest = size;
      largestTaskCompleted = task.title;
    }
  }

  const missedDeadlines = tasks.filter((t) => t.status !== 'Completed' && new Date(t.deadline) < new Date()).length;
  const contributors = {};
  for (const act of activities) {
    const name = act.userId?.name;
    if (name) contributors[name] = (contributors[name] || 0) + 1;
  }
  const topContributor = Object.entries(contributors).sort((a, b) => b[1] - a[1])[0] || null;

  res.json({
    activities,
    highlights: {
      peakActivityDate,
      maxCount,
      largestTaskCompleted: largestTaskCompleted || 'None yet',
      missedDeadlines,
      topContributor: topContributor ? { name: topContributor[0], count: topContributor[1] } : null
    }
  });
};

const getStandup = async (req, res) => {
  const project = await getProjectForUser(req.params.id, req.user, { populate: true });
  const hours = Math.max(1, Math.min(168, parseInt(req.query.hours, 10) || 24));
  const since = new Date(Date.now() - hours * 3600000);
  const [tasks, activities] = await Promise.all([
    Task.find({ projectId: project._id }).select('title status assignedTo deadline blockedBy completedAt').lean(),
    Activity.find({ projectId: project._id, createdAt: { $gte: since } }).lean()
  ]);
  res.json(buildStandup({ project, members: project.members, tasks, activities, hours }));
};

module.exports = {
  createProject, getProjects, getProjectById, updateProject, deleteProject,
  generateShareLink, revokeShareLink, getPublicProject, getProjectActivity,
  getProjectPulse, getPlaybackHighlights, getStandup
};
