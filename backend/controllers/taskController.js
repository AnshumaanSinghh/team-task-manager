const Task = require('../models/Task');
const { STATUSES, PRIORITIES } = require('../models/Task');
const Activity = require('../models/Activity');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { httpError } = require('../lib/http');
const { escapeRegex, cleanString, cleanTags, cleanSubtasks } = require('../lib/text');
const { getProjectForUser, getTaskForUser, visibleProjectIds, isAdmin, sameId, isValidId } = require('../lib/access');
const { extractMentions } = require('../lib/mentions');
const { notify } = require('../lib/notify');
const { parseQuickTask, localDay, addDays, endOfDay } = require('../lib/nlp');
const { completeJson, aiConfigured } = require('../lib/ai');
const { planFromTemplates, sanitisePlan } = require('../lib/planner');
const { serializeFocus } = require('./authController');

const DAY = 86400000;
const ADMIN_FIELDS = ['title', 'description', 'assignedTo', 'deadline', 'priority', 'status', 'order', 'subtasks', 'tags', 'estimate', 'blockedBy'];
const MEMBER_FIELDS = ['status', 'order', 'subtasks'];
const FIELD_LABELS = { title: 'title', description: 'description', assignedTo: 'assignee', deadline: 'deadline', priority: 'priority', tags: 'tags', estimate: 'estimate', blockedBy: 'blockers' };

const populateTask = (query) => query
  .populate('assignedTo', 'name email')
  .populate('createdBy', 'name')
  .populate('decisionLog.markedBy', 'name')
  .populate('kudos.user', 'name');

const clampTz = (value) => Math.max(-840, Math.min(840, parseInt(value, 10) || 0));

function parseDeadline(value, { allowPast = false } = {}) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw httpError(400, 'A valid deadline is required');
  // One day of slack so "today" works in every timezone.
  if (!allowPast && date.getTime() < Date.now() - DAY) throw httpError(400, 'Deadline cannot be in the past');
  return date;
}

function resolveAssignee(project, value) {
  if (value === null || value === undefined || value === '') return null;
  const id = String(value._id || value);
  if (!isValidId(id)) throw httpError(400, 'Invalid assignee');
  if (!project.members.some((m) => sameId(m, id))) throw httpError(400, 'Assignee must be a member of this project');
  return id;
}

async function resolveBlockers(project, ids, taskId) {
  if (!Array.isArray(ids)) return [];
  const unique = [...new Set(ids.map((id) => String(id._id || id)))].filter((id) => id !== String(taskId));
  if (!unique.every(isValidId)) throw httpError(400, 'Invalid blocker id');
  if (unique.length > 10) throw httpError(400, 'A task can have at most 10 blockers');
  const found = await Task.find({ _id: { $in: unique }, projectId: project._id }).select('_id');
  if (found.length !== unique.length) throw httpError(400, 'Blockers must be tasks in the same project');

  // Reject dependency cycles (A waits on B while B waits on A).
  if (taskId && unique.length) {
    const all = await Task.find({ projectId: project._id }).select('_id blockedBy').lean();
    const graph = new Map(all.map((t) => [String(t._id), (t.blockedBy || []).map(String)]));
    graph.set(String(taskId), unique);
    const stack = [...unique];
    const seen = new Set();
    while (stack.length) {
      const current = stack.pop();
      if (current === String(taskId)) throw httpError(400, 'That dependency would create a cycle');
      if (seen.has(current)) continue;
      seen.add(current);
      stack.push(...(graph.get(current) || []));
    }
  }
  return unique;
}

async function buildTaskData(body, project, existing) {
  const data = {};
  if (body.title !== undefined) {
    data.title = cleanString(body.title, 200);
    if (!data.title) throw httpError(400, 'Title is required');
  }
  if (body.description !== undefined) data.description = cleanString(body.description, 2000);
  if (body.priority !== undefined) {
    if (!PRIORITIES.includes(body.priority)) throw httpError(400, 'Invalid priority');
    data.priority = body.priority;
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) throw httpError(400, 'Invalid status');
    data.status = body.status;
  }
  if (body.deadline !== undefined) {
    const unchanged = existing && new Date(body.deadline).getTime() === new Date(existing.deadline).getTime();
    if (!unchanged) data.deadline = parseDeadline(body.deadline);
  }
  if (body.assignedTo !== undefined) data.assignedTo = resolveAssignee(project, body.assignedTo);
  if (body.order !== undefined) {
    const order = Number(body.order);
    if (!Number.isFinite(order)) throw httpError(400, 'Invalid order');
    data.order = order;
  }
  if (body.subtasks !== undefined) data.subtasks = cleanSubtasks(body.subtasks);
  if (body.tags !== undefined) data.tags = cleanTags(body.tags);
  if (body.estimate !== undefined) {
    const estimate = parseInt(body.estimate, 10);
    data.estimate = Number.isFinite(estimate) ? Math.max(0, Math.min(100, estimate)) : 0;
  }
  if (body.blockedBy !== undefined) data.blockedBy = await resolveBlockers(project, body.blockedBy, existing?._id);
  return data;
}

// Normalise values so "did this field change?" compares ids, dates and arrays sensibly.
function comparable(value) {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) return value.getTime();
  if (Array.isArray(value)) return value.map((v) => String(v?._id ?? v));
  if (typeof value === 'object') return String(value._id ?? value);
  return value;
}

function pick(body, fields) {
  const out = {};
  for (const f of fields) if (body[f] !== undefined) out[f] = body[f];
  return out;
}

// ---------------------------------------------------------------- CRUD

const createTask = async (req, res) => {
  const body = req.body || {};
  const project = await getProjectForUser(body.projectId, req.user);
  if (body.title === undefined) throw httpError(400, 'Title is required');
  if (body.deadline === undefined) throw httpError(400, 'A valid deadline is required');

  const data = await buildTaskData(pick(body, ADMIN_FIELDS), project, null);
  if (data.status === 'Completed') data.completedAt = new Date();

  const task = await Task.create({ ...data, projectId: project._id, createdBy: req.user._id });

  await Activity.create({
    projectId: project._id, taskId: task._id, userId: req.user._id,
    action: 'created_task', details: `created task "${task.title}"`
  });
  if (task.assignedTo) {
    await notify({ users: [task.assignedTo], actor: req.user._id, type: 'assigned', message: `${req.user.name} assigned you "${task.title}"`, project: project._id, task: task._id });
  }

  res.status(201).json(await populateTask(Task.findById(task._id)));
};

const getTasks = async (req, res) => {
  const { projectId, status, priority, search, assignee, tag } = req.query;
  const filter = {};

  if (projectId) {
    const project = await getProjectForUser(projectId, req.user);
    filter.projectId = project._id;
  } else {
    filter.projectId = { $in: await visibleProjectIds(req.user) };
  }
  if (STATUSES.includes(status)) filter.status = status;
  if (PRIORITIES.includes(priority)) filter.priority = priority;
  if (typeof search === 'string' && search.trim()) filter.title = { $regex: escapeRegex(search.trim().slice(0, 100)), $options: 'i' };
  if (assignee === 'me') filter.assignedTo = req.user._id;
  if (typeof tag === 'string' && tag.trim()) filter.tags = tag.trim().toLowerCase();

  const limit = Math.max(1, Math.min(500, parseInt(req.query.limit, 10) || 500));
  const tasks = await populateTask(Task.find(filter))
    .populate('projectId', 'name color')
    .sort({ order: 1, createdAt: 1 })
    .limit(limit);
  res.json(tasks);
};

const updateTask = async (req, res) => {
  const { task, project } = await getTaskForUser(req.params.id, req.user);
  const admin = isAdmin(req.user);
  const body = req.body || {};

  const forbidden = Object.keys(body).filter((k) => ADMIN_FIELDS.includes(k) && !MEMBER_FIELDS.includes(k));
  if (!admin && forbidden.length) throw httpError(403, 'Only admins can edit task details. Members can change status and checklists.');

  const data = await buildTaskData(pick(body, admin ? ADMIN_FIELDS : MEMBER_FIELDS), project, task);

  if (data.status === 'Completed' && task.status !== 'Completed') {
    const blockerIds = data.blockedBy ?? task.blockedBy;
    const open = await Task.find({ _id: { $in: blockerIds }, status: { $ne: 'Completed' } }).select('title');
    if (open.length) {
      throw httpError(409, `Blocked by ${open.map((t) => `"${t.title}"`).join(', ')}. Complete ${open.length === 1 ? 'it' : 'them'} first.`);
    }
  }
  if (data.status && data.status !== task.status) {
    data.completedAt = data.status === 'Completed' ? new Date() : null;
  }

  const oldStatus = task.status;
  const oldAssignee = task.assignedTo ? String(task.assignedTo) : null;
  const changed = Object.keys(FIELD_LABELS)
    .filter((f) => data[f] !== undefined && JSON.stringify(comparable(data[f])) !== JSON.stringify(comparable(task[f])));

  Object.assign(task, data);
  await task.save();

  const activities = [];
  if (data.status && data.status !== oldStatus) {
    activities.push({
      projectId: task.projectId, taskId: task._id, userId: req.user._id, action: 'status_change',
      details: `moved "${task.title}" from ${oldStatus} to ${data.status}`, meta: { from: oldStatus, to: data.status }
    });
  }
  if (changed.length) {
    activities.push({
      projectId: task.projectId, taskId: task._id, userId: req.user._id, action: 'updated_task',
      details: `updated ${changed.map((f) => FIELD_LABELS[f]).join(', ')} on "${task.title}"`, meta: { fields: changed }
    });
  }
  if (activities.length) await Activity.insertMany(activities);

  const newAssignee = task.assignedTo ? String(task.assignedTo) : null;
  if (newAssignee && newAssignee !== oldAssignee) {
    await notify({ users: [newAssignee], actor: req.user._id, type: 'assigned', message: `${req.user.name} assigned you "${task.title}"`, project: project._id, task: task._id });
  } else if (newAssignee && data.status && data.status !== oldStatus) {
    await notify({ users: [newAssignee], actor: req.user._id, type: 'status', message: `${req.user.name} moved "${task.title}" to ${data.status}`, project: project._id, task: task._id });
  }

  res.json(await populateTask(Task.findById(task._id)));
};

const deleteTask = async (req, res) => {
  const { task } = await getTaskForUser(req.params.id, req.user);

  await Promise.all([
    Task.updateMany({ blockedBy: task._id }, { $pull: { blockedBy: task._id } }),
    Comment.deleteMany({ taskId: task._id }),
    Notification.deleteMany({ task: task._id }),
    User.updateMany({ 'focus.task': task._id }, { $set: { focus: { task: null, project: null, startedAt: null, endsAt: null } } }),
    Activity.create({
      projectId: task.projectId, taskId: task._id, userId: req.user._id,
      action: 'deleted_task', details: `deleted task "${task.title}"`
    })
  ]);
  await task.deleteOne();
  res.json({ id: req.params.id, message: 'Task deleted successfully' });
};

// ---------------------------------------------------------------- Dashboard

const dayKey = (date, tz) => new Date(new Date(date).getTime() - tz * 60000).toISOString().slice(0, 10);

const getDashboardStats = async (req, res) => {
  const tz = clampTz(req.query.tz);
  const projectIds = await visibleProjectIds(req.user);
  const now = new Date();
  const me = String(req.user._id);

  const [tasks, recentActivity, completions, focusAgg] = await Promise.all([
    Task.find({ projectId: { $in: projectIds } }).populate('projectId', 'name color').lean(),
    Activity.find({ projectId: { $in: projectIds } }).populate('userId', 'name').sort({ createdAt: -1 }).limit(12).lean(),
    Activity.find({
      projectId: { $in: projectIds }, action: 'status_change', 'meta.to': 'Completed',
      createdAt: { $gte: new Date(now.getTime() - 60 * DAY) }
    }).select('createdAt userId').lean(),
    Activity.aggregate([
      { $match: { userId: req.user._id, action: 'focus_session', createdAt: { $gte: new Date(now.getTime() - 7 * DAY) } } },
      { $group: { _id: null, minutes: { $sum: '$meta.minutes' } } }
    ])
  ]);

  const isOpen = (t) => t.status !== 'Completed';
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'Completed').length;
  const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
  const inReview = tasks.filter((t) => t.status === 'In Review').length;
  const todo = tasks.filter((t) => t.status === 'To Do').length;
  const overdue = tasks.filter((t) => isOpen(t) && new Date(t.deadline) < now).length;
  const mine = tasks.filter((t) => String(t.assignedTo) === me);

  const projectMap = new Map();
  for (const t of tasks) {
    const key = String(t.projectId?._id || 'unknown');
    const row = projectMap.get(key) || { name: t.projectId?.name || 'Unknown', total: 0, completed: 0 };
    row.total += 1;
    if (t.status === 'Completed') row.completed += 1;
    projectMap.set(key, row);
  }

  // Team velocity for the last 14 local days
  const velocityMap = new Map();
  for (let i = 13; i >= 0; i--) velocityMap.set(dayKey(now.getTime() - i * DAY, tz), 0);
  const myCompletionDays = new Set();
  for (const c of completions) {
    const key = dayKey(c.createdAt, tz);
    if (velocityMap.has(key)) velocityMap.set(key, velocityMap.get(key) + 1);
    if (String(c.userId) === me) myCompletionDays.add(key);
  }

  // Streak: consecutive days with at least one completion, ending today (or yesterday)
  let streak = 0;
  let cursor = now.getTime();
  if (!myCompletionDays.has(dayKey(cursor, tz))) cursor -= DAY;
  while (myCompletionDays.has(dayKey(cursor, tz))) {
    streak += 1;
    cursor -= DAY;
  }

  const upcoming = mine
    .filter(isOpen)
    .filter((t) => new Date(t.deadline) < new Date(now.getTime() + 7 * DAY))
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 6)
    .map((t) => ({ _id: t._id, title: t.title, deadline: t.deadline, status: t.status, priority: t.priority, project: t.projectId }));

  res.json({
    total,
    completed,
    inProgress,
    inReview,
    todo,
    pending: total - completed,
    overdue,
    myTasks: mine.filter(isOpen).length,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    highPriority: tasks.filter((t) => t.priority === 'High' && isOpen(t)).length,
    mediumPriority: tasks.filter((t) => t.priority === 'Medium' && isOpen(t)).length,
    lowPriority: tasks.filter((t) => t.priority === 'Low' && isOpen(t)).length,
    tasksByProject: [...projectMap.values()],
    statusBreakdown: [
      { name: 'To Do', value: todo },
      { name: 'In Progress', value: inProgress },
      { name: 'In Review', value: inReview },
      { name: 'Completed', value: completed }
    ],
    velocity: [...velocityMap.entries()].map(([date, count]) => ({ date, count })),
    upcoming,
    focusMinutesWeek: Math.round(focusAgg[0]?.minutes || 0),
    streak,
    recentActivity
  });
};

// ---------------------------------------------------------------- Comments

const getComments = async (req, res) => {
  const { task } = await getTaskForUser(req.params.id, req.user);
  const comments = await Comment.find({ taskId: task._id })
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .limit(200);
  res.json(comments);
};

const addComment = async (req, res) => {
  const { task, project } = await getTaskForUser(req.params.id, req.user);
  const text = cleanString(req.body?.text, 1000);
  if (!text) throw httpError(400, 'Comment text is required');

  const members = await User.find({ _id: { $in: project.members } }).select('name email');
  const mentions = extractMentions(text, members);

  const comment = await Comment.create({ taskId: task._id, userId: req.user._id, text, mentions });

  await Activity.create({
    projectId: task.projectId, taskId: task._id, userId: req.user._id,
    action: 'commented', details: `commented on "${task.title}"`
  });
  await notify({ users: mentions, actor: req.user._id, type: 'mentioned', message: `${req.user.name} mentioned you on "${task.title}"`, project: project._id, task: task._id });
  if (task.assignedTo && !mentions.includes(String(task.assignedTo))) {
    await notify({ users: [task.assignedTo], actor: req.user._id, type: 'commented', message: `${req.user.name} commented on "${task.title}"`, project: project._id, task: task._id });
  }

  res.status(201).json(await Comment.findById(comment._id).populate('userId', 'name email'));
};

const deleteComment = async (req, res) => {
  const { task } = await getTaskForUser(req.params.id, req.user);
  if (!isValidId(req.params.commentId)) throw httpError(400, 'Invalid comment id');
  const comment = await Comment.findOne({ _id: req.params.commentId, taskId: task._id });
  if (!comment) throw httpError(404, 'Comment not found');
  if (!sameId(comment.userId, req.user) && !isAdmin(req.user)) throw httpError(403, 'You can only delete your own comments');

  task.decisionLog = task.decisionLog.filter((d) => !sameId(d.commentId, comment._id));
  await task.save();
  await comment.deleteOne();
  res.json(await populateTask(Task.findById(task._id)));
};

const toggleDecision = async (req, res) => {
  const { task } = await getTaskForUser(req.params.id, req.user);
  if (!isValidId(req.params.commentId)) throw httpError(400, 'Invalid comment id');
  const comment = await Comment.findOne({ _id: req.params.commentId, taskId: task._id });
  if (!comment) throw httpError(404, 'Comment not found');

  const index = task.decisionLog.findIndex((d) => sameId(d.commentId, comment._id));
  if (index !== -1) {
    task.decisionLog.splice(index, 1);
  } else {
    task.decisionLog.push({ commentId: comment._id, text: comment.text, markedBy: req.user._id, markedAt: new Date() });
  }
  await task.save();
  res.json(await populateTask(Task.findById(task._id)));
};

// ---------------------------------------------------------------- AI

function quickAddPrompt(text, members, now, tz) {
  const today = localDay(now, tz);
  const iso = `${today.y}-${String(today.m + 1).padStart(2, '0')}-${String(today.d).padStart(2, '0')}`;
  const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.dow];
  return `You turn one sentence into a task for a team task manager. Today is ${weekday} ${iso}.
Team members: ${members.map((m) => m.name).join(', ') || 'none'}.
Return ONLY a JSON object with these keys:
- "title": short imperative task title, max 100 chars, without dates, names or priority words
- "description": one or two sentences of useful detail inferred from the request
- "priority": "Low", "Medium" or "High"
- "deadline": "YYYY-MM-DD" or null if no date is mentioned
- "assignee": exact team member name from the list, or null
- "tags": up to 3 short lowercase tags
- "estimate": story points 0-13 (0 if unclear)

Request: ${text}`;
}

const aiCreateTask = async (req, res) => {
  const body = req.body || {};
  const text = cleanString(body.prompt, 500);
  if (!text) throw httpError(400, 'Describe the task first');
  const project = await getProjectForUser(body.projectId, req.user, { populate: true });

  const now = new Date();
  const tz = clampTz(body.tzOffset);
  const parsed = parseQuickTask(text, { now, tzOffset: tz, members: project.members });
  let source = 'parser';

  if (aiConfigured()) {
    const ai = await completeJson(quickAddPrompt(text, project.members, now, tz));
    const d = ai?.data;
    if (d) {
      source = ai.provider;
      if (typeof d.title === 'string' && d.title.trim()) parsed.title = d.title.trim().slice(0, 120);
      if (typeof d.description === 'string' && d.description.trim()) parsed.description = d.description.trim().slice(0, 1000);
      if (!/(urgent|asap|priority|p[0-4]|!!)/i.test(text) && PRIORITIES.includes(d.priority)) parsed.priority = d.priority;
      if (!parsed.deadlineParsed && typeof d.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.deadline)) {
        const [y, m, day] = d.deadline.split('-').map(Number);
        const date = endOfDay({ y, m: m - 1, d: day }, tz);
        if (!Number.isNaN(date.getTime()) && date > now) {
          parsed.deadline = date;
          parsed.deadlineParsed = true;
        }
      }
      if (!parsed.assigneeId && typeof d.assignee === 'string') {
        const hit = project.members.find((m) => m.name.toLowerCase() === d.assignee.trim().toLowerCase());
        if (hit) {
          parsed.assigneeId = hit._id;
          parsed.assigneeName = hit.name;
        }
      }
      if (!parsed.tags.length && Array.isArray(d.tags)) parsed.tags = cleanTags(d.tags.slice(0, 3));
      if (!parsed.estimate && Number.isFinite(Number(d.estimate))) parsed.estimate = Math.max(0, Math.min(13, Math.round(Number(d.estimate))));
    }
  }

  const task = await Task.create({
    title: parsed.title,
    description: parsed.description,
    projectId: project._id,
    createdBy: req.user._id,
    assignedTo: parsed.assigneeId || null,
    deadline: parsed.deadline,
    priority: parsed.priority,
    tags: parsed.tags,
    estimate: parsed.estimate
  });

  await Activity.create({
    projectId: project._id, taskId: task._id, userId: req.user._id,
    action: 'created_task', details: `created "${task.title}" with Quick Add`
  });
  if (task.assignedTo) {
    await notify({ users: [task.assignedTo], actor: req.user._id, type: 'assigned', message: `${req.user.name} assigned you "${task.title}"`, project: project._id, task: task._id });
  }

  const populated = await populateTask(Task.findById(task._id));
  res.status(201).json({
    task: populated,
    summary: {
      source,
      assigneeMatched: Boolean(parsed.assigneeId),
      assigneeName: parsed.assigneeName,
      deadlineParsed: parsed.deadlineParsed
    }
  });
};

function planPrompt(text, project) {
  return `You are a senior project manager. Break the goal below into 4-8 concrete, actionable tasks for the project "${project.name}" (${project.description}).
Return ONLY JSON: {"tasks":[{"title":string (max 90 chars, imperative),"description":string (1-2 sentences),"priority":"Low"|"Medium"|"High","estimate":number (story points 1-13),"tags":[up to 3 short lowercase tags],"subtasks":[2-4 short checklist items],"dueInDays":number (days from today, ordered so dependencies come first)}]}

Goal: ${text}`;
}

const aiPlan = async (req, res) => {
  const body = req.body || {};
  const text = cleanString(body.prompt, 1000);
  if (!text) throw httpError(400, 'Describe the goal first');
  const project = await getProjectForUser(body.projectId, req.user);

  let tasks = null;
  let source = 'templates';
  if (aiConfigured()) {
    const ai = await completeJson(planPrompt(text, project));
    const plan = ai ? sanitisePlan(ai.data) : [];
    if (plan.length) {
      tasks = plan;
      source = ai.provider;
    }
  }
  if (!tasks) tasks = planFromTemplates(text);
  res.json({ tasks, source });
};

const bulkCreateTasks = async (req, res) => {
  const body = req.body || {};
  const project = await getProjectForUser(body.projectId, req.user);
  const items = Array.isArray(body.tasks) ? body.tasks.slice(0, 15) : [];
  if (!items.length) throw httpError(400, 'Nothing to create');

  const tz = clampTz(body.tzOffset);
  const today = localDay(new Date(), tz);
  const base = Date.now();

  const docs = items.map((t, i) => {
    const days = Math.max(0, Math.min(365, parseInt(t?.dueInDays, 10) || 7));
    return {
      title: cleanString(t?.title, 200),
      description: cleanString(t?.description, 2000),
      priority: PRIORITIES.includes(t?.priority) ? t.priority : 'Medium',
      estimate: Math.max(0, Math.min(100, parseInt(t?.estimate, 10) || 0)),
      tags: cleanTags(t?.tags),
      subtasks: cleanSubtasks((Array.isArray(t?.subtasks) ? t.subtasks : []).map((s) => (typeof s === 'string' ? { title: s } : s))),
      deadline: endOfDay(addDays(today, days), tz),
      assignedTo: t?.assignedTo ? resolveAssignee(project, t.assignedTo) : null,
      projectId: project._id,
      createdBy: req.user._id,
      status: 'To Do',
      order: base + i
    };
  }).filter((d) => d.title);
  if (!docs.length) throw httpError(400, 'Every task needs a title');

  const created = await Task.insertMany(docs);
  await Activity.insertMany(created.map((t) => ({
    projectId: project._id, taskId: t._id, userId: req.user._id,
    action: 'created_task', details: `created "${t.title}" with the AI Planner`
  })));
  res.status(201).json({ created: created.length });
};

// ---------------------------------------------------------------- Insights

const suggestNextStep = async (req, res) => {
  const { task } = await getTaskForUser(req.params.id, req.user);
  await task.populate('assignedTo', 'name');
  const now = new Date();
  const suggestions = [];

  if (task.status === 'Completed') {
    suggestions.push(task.assignedTo && !sameId(task.assignedTo, req.user)
      ? `Done. Send ${task.assignedTo.name.split(' ')[0]} some kudos for shipping it.`
      : 'Done. Pin any key decisions from the comments so the next person has context.');
  } else {
    const blockers = await Task.find({ _id: { $in: task.blockedBy }, status: { $ne: 'Completed' } })
      .select('title assignedTo').populate('assignedTo', 'name');
    for (const b of blockers.slice(0, 2)) {
      suggestions.push(`Waiting on "${b.title}"${b.assignedTo ? ` (${b.assignedTo.name})` : ''}. Nudge the owner or pick up other work meanwhile.`);
    }

    const msLeft = new Date(task.deadline) - now;
    if (msLeft < 0) {
      const days = Math.max(1, Math.round(-msLeft / DAY));
      suggestions.push(`Overdue by ${days} day${days === 1 ? '' : 's'}. Agree a realistic new date or cut scope.`);
    } else if (msLeft < 2 * DAY && task.status === 'To Do') {
      suggestions.push('Due within 48 hours and not started. Start a focus session now.');
    }

    if (!task.assignedTo) {
      suggestions.push('Unassigned. Give it an owner so it does not fall through the cracks.');
    } else {
      const pending = await Task.countDocuments({ assignedTo: task.assignedTo._id, status: { $ne: 'Completed' } });
      if (pending > 6) suggestions.push(`${task.assignedTo.name} has ${pending} open tasks. Consider reassigning this one.`);
    }

    if (task.status === 'In Review' && now - task.updatedAt > 2 * DAY) {
      suggestions.push(`Sitting in review for ${Math.round((now - task.updatedAt) / DAY)} days. Ping a reviewer.`);
    }
    if ((task.description.length > 200 || task.estimate >= 8) && task.subtasks.length === 0) {
      suggestions.push('This looks large. Break it into a checklist of smaller steps.');
    }
    if (task.subtasks.length > 0 && task.subtasks.every((s) => s.isCompleted)) {
      suggestions.push('Every checklist item is done. Move it to review or complete it.');
    }
    if (task.status === 'To Do' && suggestions.length === 0) {
      suggestions.push('Ready to go. Move it to In Progress and start a focus session.');
    }
  }

  if (suggestions.length === 0) suggestions.push('On track. Keep the momentum going.');
  res.json({ suggestion: suggestions[0], suggestions: suggestions.slice(0, 3) });
};

const toggleKudos = async (req, res) => {
  const { task, project } = await getTaskForUser(req.params.id, req.user);
  if (task.status !== 'Completed') throw httpError(400, 'Kudos can be given once a task is completed');
  if (!task.assignedTo) throw httpError(400, 'This task has no assignee to thank');
  if (sameId(task.assignedTo, req.user)) throw httpError(400, 'You cannot give kudos to yourself');

  const index = task.kudos.findIndex((k) => sameId(k.user, req.user));
  if (index !== -1) {
    task.kudos.splice(index, 1);
  } else {
    task.kudos.push({ user: req.user._id, at: new Date() });
    await Activity.create({
      projectId: task.projectId, taskId: task._id, userId: req.user._id,
      action: 'kudos', details: `sent kudos for "${task.title}"`
    });
    await notify({ users: [task.assignedTo], actor: req.user._id, type: 'kudos', message: `${req.user.name} sent you kudos for "${task.title}"`, project: project._id, task: task._id });
  }
  await task.save();
  res.json(await populateTask(Task.findById(task._id)));
};

// ---------------------------------------------------------------- Focus Mode

async function closeFocus(user) {
  const focus = user.focus;
  if (!focus?.task || !focus.startedAt) return { minutes: 0 };
  const end = Math.min(Date.now(), new Date(focus.endsAt).getTime());
  const seconds = Math.max(0, Math.round((end - new Date(focus.startedAt).getTime()) / 1000));
  let result = { minutes: Math.round(seconds / 60), taskId: String(focus.task) };

  if (seconds >= 60) {
    const task = await Task.findByIdAndUpdate(focus.task, { $inc: { timeSpent: seconds } }, { returnDocument: 'after' });
    if (task) {
      await Activity.create({
        projectId: task.projectId, taskId: task._id, userId: user._id, action: 'focus_session',
        details: `focused ${result.minutes} min on "${task.title}"`, meta: { minutes: Math.round(seconds / 60) }
      });
      result = { ...result, timeSpent: task.timeSpent };
    }
  }
  user.focus = { task: null, project: null, startedAt: null, endsAt: null };
  return result;
}

const startFocus = async (req, res) => {
  const { task, project } = await getTaskForUser(req.params.id, req.user);
  if (task.status === 'Completed') throw httpError(400, 'This task is already completed');
  const minutes = Math.max(5, Math.min(120, parseInt(req.body?.minutes, 10) || 25));

  const user = await User.findById(req.user._id);
  if (user.focus?.task) await closeFocus(user);

  const now = new Date();
  user.focus = { task: task._id, project: project._id, startedAt: now, endsAt: new Date(now.getTime() + minutes * 60000) };
  await user.save();

  if (task.status === 'To Do') {
    task.status = 'In Progress';
    await task.save();
    await Activity.create({
      projectId: task.projectId, taskId: task._id, userId: req.user._id, action: 'status_change',
      details: `moved "${task.title}" from To Do to In Progress`, meta: { from: 'To Do', to: 'In Progress' }
    });
  }

  await user.populate('focus.task', 'title');
  res.json({ focus: serializeFocus(user.focus), task: await populateTask(Task.findById(task._id)) });
};

const stopFocus = async (req, res) => {
  const user = await User.findById(req.user._id);
  const result = await closeFocus(user);
  await user.save();
  res.json({ focus: null, ...result });
};

module.exports = {
  createTask, getTasks, updateTask, deleteTask, getDashboardStats,
  getComments, addComment, deleteComment, toggleDecision,
  aiCreateTask, aiPlan, bulkCreateTasks, suggestNextStep, toggleKudos,
  startFocus, stopFocus
};
