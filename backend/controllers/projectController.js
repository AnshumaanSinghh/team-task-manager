const Project = require('../models/Project');
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

module.exports = { createProject, getProjects, getProjectById, updateProject };
