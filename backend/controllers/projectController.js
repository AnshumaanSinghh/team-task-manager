const crypto = require('crypto');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Activity = require('../models/Activity');

const createProject = async (req, res) => {
  try {
    const { name, description, members } = req.body;

    if (!name || !description) {
      return res.status(400).json({ message: 'Project name and description are required' });
    }

    // Ensure the creator is always a member
    const memberList = members && members.length > 0 ? [...new Set([...members, req.user._id.toString()])] : [req.user._id];

    const project = await Project.create({
      name: name.trim(),
      description: description.trim(),
      createdBy: req.user._id,
      members: memberList
    });

    // Log activity
    await Activity.create({
      projectId: project._id,
      userId: req.user._id,
      action: 'created_project',
      details: `Created project "${project.name}"`
    });

    const populated = await Project.findById(project._id)
      .populate('members', 'name email')
      .populate('createdBy', 'name');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProjects = async (req, res) => {
  try {
    let projects;
    if (req.user.role === 'Admin') {
      projects = await Project.find()
        .populate('members', 'name email')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 });
    } else {
      projects = await Project.find({ members: req.user._id })
        .populate('members', 'name email')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 });
    }
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('members', 'name email')
      .populate('createdBy', 'name');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Members can only view projects they belong to
    if (req.user.role !== 'Admin' && !project.members.some(m => m._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('members', 'name email').populate('createdBy', 'name');

    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const generateShareLink = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    
    if (!project.shareId) {
      project.shareId = crypto.randomBytes(16).toString('hex');
      await project.save();
    }
    
    res.json({ shareId: project.shareId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPublicProject = async (req, res) => {
  try {
    const project = await Project.findOne({ shareId: req.params.shareId })
      .populate('members', 'name')
      .populate('createdBy', 'name');
      
    if (!project) return res.status(404).json({ message: 'Public project not found' });

    const tasks = await Task.find({ projectId: project._id })
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 });

    res.json({ project, tasks });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProjectActivity = async (req, res) => {
  try {
    const activities = await Activity.find({ projectId: req.params.id })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProjectPulse = async (req, res) => {
  try {
    const projectId = req.params.id;
    const project = await Project.findById(projectId).populate('members', 'name');
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const tasks = await Task.find({ projectId }).populate('assignedTo', 'name');
    
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    const recentActivities = await Activity.find({ 
      projectId, 
      createdAt: { $gte: sevenDaysAgo } 
    });

    let score = 50; // Base score
    let insights = [];
    let burnoutWarnings = [];

    // Metrics
    const completedTasks = tasks.filter(t => t.status === 'Completed');
    const pendingTasks = tasks.filter(t => t.status !== 'Completed');
    const overdueTasks = pendingTasks.filter(t => new Date(t.deadline) < now);

    // Score adjustments
    if (tasks.length > 0) {
      const completionRate = completedTasks.length / tasks.length;
      score += (completionRate * 30); // Up to +30 points for completion
    }

    if (overdueTasks.length > 0) {
      const overduePenalty = (overdueTasks.length / tasks.length) * 40;
      score -= overduePenalty; // Up to -40 points for overdue
    }

    if (recentActivities.length > 20) score += 20;
    else if (recentActivities.length > 5) score += 10;
    else score -= 10; // Penalize for inactivity

    score = Math.max(0, Math.min(100, Math.round(score)));

    // Burnout detection
    const workload = {};
    pendingTasks.forEach(t => {
      if (t.assignedTo) {
        const name = t.assignedTo.name;
        if (!workload[name]) workload[name] = { total: 0, overdue: 0 };
        workload[name].total++;
        if (new Date(t.deadline) < now) workload[name].overdue++;
      }
    });

    for (const [name, data] of Object.entries(workload)) {
      if (data.total > 10 || data.overdue > 3) {
        burnoutWarnings.push(`${name} might be overloaded (${data.overdue} overdue)`);
        score -= 5; // Slight penalty for team burnout
      }
    }

    // Smart Insights
    if (score >= 80) insights.push("High activity, team is actively pushing.");
    else if (score >= 50) insights.push("Project is progressing steadily.");
    else insights.push("Project slowing down. Needs attention.");

    if (overdueTasks.length > 0 && (overdueTasks.length / tasks.length) > 0.2) {
      insights.push("High number of overdue tasks detected.");
    }
    if (recentActivities.length === 0) {
      insights.push("Project has gone completely dormant.");
    }

    let status = 'healthy';
    if (score < 40) status = 'critical';
    else if (score < 75) status = 'warning';

    res.json({
      score: Math.max(0, Math.min(100, Math.round(score))),
      status,
      insights: insights.slice(0, 2), // Keep it to 1-2 lines
      burnoutWarnings,
      metrics: {
        total: tasks.length,
        completed: completedTasks.length,
        overdue: overdueTasks.length,
        recentActivityCount: recentActivities.length
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPlaybackHighlights = async (req, res) => {
  try {
    const projectId = req.params.id;
    const activities = await Activity.find({ projectId }).populate('userId', 'name').sort({ createdAt: 1 });
    const tasks = await Task.find({ projectId });

    // 1. Peak Activity Moment
    const dayCounts = {};
    let peakActivityDate = null;
    let maxCount = 0;
    
    activities.forEach(act => {
      const date = new Date(act.createdAt).toDateString();
      dayCounts[date] = (dayCounts[date] || 0) + 1;
      if (dayCounts[date] > maxCount) {
        maxCount = dayCounts[date];
        peakActivityDate = date;
      }
    });

    // 2. Largest Task Completed
    let largestTaskCompleted = null;
    let maxSubtasks = -1;
    tasks.forEach(task => {
      if (task.status === 'Completed' && task.subtasks.length > maxSubtasks) {
        maxSubtasks = task.subtasks.length;
        largestTaskCompleted = task.title;
      }
    });

    // 3. Missed Deadlines Count
    const missedDeadlines = tasks.filter(t => t.status !== 'Completed' && new Date(t.deadline) < new Date()).length;

    res.json({
      activities, // Send all activities for playback
      highlights: {
        peakActivityDate,
        maxCount,
        largestTaskCompleted: largestTaskCompleted || 'None yet',
        missedDeadlines
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createProject, getProjects, getProjectById, updateProject, generateShareLink, getPublicProject, getProjectActivity, getProjectPulse, getPlaybackHighlights };
