const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { httpError } = require('./http');

const isAdmin = (user) => user?.role === 'Admin';

const isValidId = (id) => typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id)
  || id instanceof mongoose.Types.ObjectId;

const isValidIdList = (ids) => Array.isArray(ids) && ids.every((id) => isValidId(String(id)));

const assertId = (id, label = 'id') => {
  if (!isValidId(id)) throw httpError(400, `Invalid ${label}`);
};

const sameId = (a, b) => a != null && b != null && String(a._id || a) === String(b._id || b);

const isProjectMember = (project, user) => project.members.some((m) => sameId(m, user));

// Projects a user can see: admins see every project, members only their own.
async function visibleProjectIds(user) {
  const filter = isAdmin(user) ? {} : { members: user._id };
  const projects = await Project.find(filter).select('_id').lean();
  return projects.map((p) => p._id);
}

async function getProjectForUser(projectId, user, { populate = false } = {}) {
  assertId(String(projectId), 'project id');
  let query = Project.findById(projectId);
  if (populate) {
    query = query.populate('members', 'name email role').populate('createdBy', 'name');
  }
  const project = await query;
  if (!project) throw httpError(404, 'Project not found');
  if (!isAdmin(user) && !isProjectMember(project, user)) {
    throw httpError(403, 'You are not a member of this project');
  }
  return project;
}

async function getTaskForUser(taskId, user) {
  assertId(String(taskId), 'task id');
  const task = await Task.findById(taskId);
  if (!task) throw httpError(404, 'Task not found');
  const project = await getProjectForUser(task.projectId, user);
  return { task, project };
}

module.exports = {
  isAdmin, isValidId, isValidIdList, assertId, sameId, isProjectMember,
  visibleProjectIds, getProjectForUser, getTaskForUser
};
