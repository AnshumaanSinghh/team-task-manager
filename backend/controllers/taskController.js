const Task = require('../models/Task');
const Project = require('../models/Project');
const Activity = require('../models/Activity');

const createTask = async (req, res) => {
  try {
    const { title, description, projectId, assignedTo, deadline, status, priority } = req.body;

    if (!title || !description || !projectId || !deadline) {
      return res.status(400).json({ message: 'Title, description, project, and deadline are required' });
    }

    if (new Date(deadline) < new Date()) {
      return res.status(400).json({ message: 'Deadline cannot be in the past' });
    }

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description.trim(),
      projectId,
      assignedTo: assignedTo || null,
      deadline,
      status: status || 'To Do',
      priority: priority || 'Medium',
      subtasks: req.body.subtasks || []
    });

    // Log activity
    await Activity.create({
      projectId,
      taskId: task._id,
      userId: req.user._id,
      action: 'created_task',
      details: `Created task "${task.title}"`
    });

    const populated = await Task.findById(task._id).populate('assignedTo', 'name email');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTasks = async (req, res) => {
  try {
    const { projectId, status, priority, search } = req.query;
    let filter = {};

    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (search) filter.title = { $regex: search, $options: 'i' };

    // Member RBAC
    if (req.user.role !== 'Admin') {
      const projects = await Project.find({ members: req.user._id }).select('_id');
      const projectIds = projects.map(p => p._id);
      if (projectId) {
        if (!projectIds.some(id => id.toString() === projectId)) {
          return res.status(403).json({ message: 'Access denied' });
        }
      } else {
        filter.projectId = { $in: projectIds };
      }
    }

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .populate('projectId', 'name')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const oldStatus = task.status;
    let updateData;

    // Role-based logic
    if (req.user.role === 'Member') {
      // Members can only update task status and subtasks
      updateData = { status: req.body.status };
      if (req.body.subtasks) updateData.subtasks = req.body.subtasks;
    } else {
      updateData = req.body;
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email');

    // Log status change
    if (req.body.status && req.body.status !== oldStatus) {
      await Activity.create({
        projectId: task.projectId,
        taskId: task._id,
        userId: req.user._id,
        action: 'status_change',
        details: `Changed "${task.title}" from ${oldStatus} to ${req.body.status}`,
        meta: { from: oldStatus, to: req.body.status }
      });
    } else if (req.user.role === 'Admin') {
      await Activity.create({
        projectId: task.projectId,
        taskId: task._id,
        userId: req.user._id,
        action: 'updated_task',
        details: `Updated task "${task.title}"`
      });
    }

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await Activity.create({
      projectId: task.projectId,
      taskId: task._id,
      userId: req.user._id,
      action: 'deleted_task',
      details: `Deleted task "${task.title}"`
    });

    await Task.findByIdAndDelete(req.params.id);
    res.json({ id: req.params.id, message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role !== 'Admin') {
      const projects = await Project.find({ members: req.user._id }).select('_id');
      const projectIds = projects.map(p => p._id);
      filter.projectId = { $in: projectIds };
    }

    const tasks = await Task.find(filter).populate('projectId', 'name');

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const todo = tasks.filter(t => t.status === 'To Do').length;
    const pending = total - completed;
    const overdue = tasks.filter(t => t.status !== 'Completed' && new Date(t.deadline) < new Date()).length;
    const myTasks = tasks.filter(t => t.assignedTo && t.assignedTo.toString() === req.user._id.toString()).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Tasks by priority
    const highPriority = tasks.filter(t => t.priority === 'High' && t.status !== 'Completed').length;
    const mediumPriority = tasks.filter(t => t.priority === 'Medium' && t.status !== 'Completed').length;
    const lowPriority = tasks.filter(t => t.priority === 'Low' && t.status !== 'Completed').length;

    // Tasks per project (for charts)
    const projectMap = {};
    tasks.forEach(t => {
      const pName = t.projectId?.name || 'Unknown';
      if (!projectMap[pName]) projectMap[pName] = { total: 0, completed: 0 };
      projectMap[pName].total++;
      if (t.status === 'Completed') projectMap[pName].completed++;
    });
    const tasksByProject = Object.entries(projectMap).map(([name, data]) => ({
      name,
      total: data.total,
      completed: data.completed
    }));

    // Recent activity
    let actFilter = {};
    if (req.user.role !== 'Admin') {
      const projects = await Project.find({ members: req.user._id }).select('_id');
      actFilter.projectId = { $in: projects.map(p => p._id) };
    }
    const Activity = require('../models/Activity');
    const recentActivity = await Activity.find(actFilter)
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      total,
      completed,
      inProgress,
      todo,
      pending,
      overdue,
      myTasks,
      completionRate,
      highPriority,
      mediumPriority,
      lowPriority,
      tasksByProject,
      statusBreakdown: [
        { name: 'To Do', value: todo, color: '#EF4444' },
        { name: 'In Progress', value: inProgress, color: '#F59E0B' },
        { name: 'Completed', value: completed, color: '#10B981' }
      ],
      recentActivity
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createTask, getTasks, updateTask, deleteTask, getDashboardStats };
