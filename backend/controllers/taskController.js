const Task = require('../models/Task');
const Project = require('../models/Project');
const Activity = require('../models/Activity');
const Comment = require('../models/Comment');

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

const getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ taskId: req.params.id })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Comment text is required' });

    const comment = await Comment.create({
      taskId: req.params.id,
      userId: req.user._id,
      text
    });

    const task = await Task.findById(req.params.id);
    await Activity.create({
      projectId: task.projectId,
      taskId: task._id,
      userId: req.user._id,
      action: 'updated_task',
      details: `Commented on task "${task.title}"`
    });

    const populated = await Comment.findById(comment._id).populate('userId', 'name email');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const aiCreateTask = async (req, res) => {
  try {
    const { prompt, projectId } = req.body;
    if (!prompt || !projectId) return res.status(400).json({ message: 'Prompt and projectId are required' });

    // AI Routing Strategy
    // Tries Groq first, then Gemini, then OpenRouter.
    let aiResponse = null;
    
    const systemPrompt = `You are a task creation assistant. Extract the following from the prompt and return a valid JSON object ONLY. Do NOT wrap in markdown code blocks.
Fields:
- title (string, max 100 chars, concise task title)
- description (string, more detailed from context if available)
- priority (string, strictly one of: "Low", "Medium", "High". Default to Medium)
- assignedTo (string, extract the exact name mentioned to assign the task to, or null if none mentioned)
- deadlineDays (number, how many days from now the deadline is. Example: "by Friday" could be 2 to 5 depending on the day, just estimate reasonably, default 3)

Prompt: ${prompt}`;

    // 1. Try Groq
    if (!aiResponse && process.env.GROQ_API_KEY) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama3-8b-8192',
            messages: [{ role: 'user', content: systemPrompt }],
            response_format: { type: "json_object" }
          })
        });
        if (res.ok) {
          const data = await res.json();
          aiResponse = JSON.parse(data.choices[0].message.content);
        }
      } catch (e) { console.error("Groq failed:", e.message); }
    }

    // 2. Try Gemini Flash
    if (!aiResponse && process.env.GEMINI_API_KEY) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });
        if (res.ok) {
          const data = await res.json();
          aiResponse = JSON.parse(data.candidates[0].content.parts[0].text);
        }
      } catch (e) { console.error("Gemini failed:", e.message); }
    }

    // 3. Try OpenRouter
    if (!aiResponse && process.env.OPENROUTER_API_KEY) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'meta-llama/llama-3-8b-instruct:free',
            messages: [{ role: 'user', content: systemPrompt }]
          })
        });
        if (res.ok) {
          const data = await res.json();
          const content = data.choices[0].message.content;
          // OpenRouter might wrap in code blocks even if instructed not to
          const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
          aiResponse = JSON.parse(cleanedContent);
        }
      } catch (e) { console.error("OpenRouter failed:", e.message); }
    }

    // Fallback if all AI fails or no keys exist
    if (!aiResponse) {
      console.log("Using fallback heuristic task creation");
      const lowercasePrompt = prompt.toLowerCase();
      let priority = 'Medium';
      if (lowercasePrompt.includes('urgent') || lowercasePrompt.includes('high')) priority = 'High';
      else if (lowercasePrompt.includes('low')) priority = 'Low';

      aiResponse = {
        title: prompt.length > 100 ? prompt.substring(0, 97) + '...' : prompt,
        description: `Generated from prompt: "${prompt}"`,
        priority: priority,
        assignedTo: null,
        deadlineDays: 3
      };
    }

    // Assignee mapping
    let finalAssignedTo = null;
    if (aiResponse.assignedTo) {
      const project = await Project.findById(projectId).populate('members', 'name _id');
      if (project && project.members) {
        const foundMember = project.members.find(m => m.name.toLowerCase().includes(aiResponse.assignedTo.toLowerCase()));
        if (foundMember) finalAssignedTo = foundMember._id;
      }
    }

    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + (aiResponse.deadlineDays || 3));

    const task = await Task.create({
      title: aiResponse.title || 'Untitled AI Task',
      description: aiResponse.description || prompt,
      projectId,
      assignedTo: finalAssignedTo,
      deadline: deadlineDate,
      status: 'To Do',
      priority: aiResponse.priority || 'Medium',
      subtasks: []
    });

    await Activity.create({
      projectId,
      taskId: task._id,
      userId: req.user._id,
      action: 'created_task',
      details: `AI magically created task "${task.title}"`
    });

    const populated = await Task.findById(task._id).populate('assignedTo', 'name email');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleDecision = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const decisionIndex = task.decisionLog.findIndex(d => d.commentId.toString() === commentId);

    if (decisionIndex !== -1) {
      task.decisionLog.splice(decisionIndex, 1);
    } else {
      task.decisionLog.push({
        commentId: comment._id,
        text: comment.text,
        markedBy: req.user._id,
        markedAt: new Date()
      });
    }

    await task.save();
    
    const updatedTask = await Task.findById(id)
      .populate('assignedTo', 'name email')
      .populate('decisionLog.markedBy', 'name');

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const suggestNextStep = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('assignedTo', 'name');
    if (!task) return res.status(404).json({ message: 'Task not found' });

    let suggestion = "Task looks healthy. Keep up the good work!";
    
    // Pure logic rules
    if (!task.deadline || new Date(task.deadline) < new Date()) {
      suggestion = "This task has an overdue or missing deadline. Consider updating the schedule to stay on track.";
    } else if (task.assignedTo) {
      const pendingCount = await Task.countDocuments({ 
        assignedTo: task.assignedTo._id, 
        status: { $ne: 'Completed' } 
      });
      if (pendingCount > 5) {
        suggestion = `${task.assignedTo.name} is handling a heavy workload (${pendingCount} pending tasks). Consider reassigning this task.`;
      } else if (task.description && task.description.length > 200 && task.subtasks.length === 0) {
        suggestion = "This task seems large. Consider breaking it down into smaller subtasks to make it more manageable.";
      } else if (task.status === 'To Do') {
        suggestion = "Task is ready! Move it to 'In Progress' to start tracking momentum.";
      }
    } else if (task.description && task.description.length > 200 && task.subtasks.length === 0) {
      suggestion = "This task seems large. Consider breaking it down into smaller subtasks to make it more manageable.";
    } else {
      suggestion = "This task is currently unassigned. Assign it to a team member to kick off progress.";
    }

    // Artificially slightly delay to feel "AI-like" if wanted, but req says <200ms
    res.json({ suggestion });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createTask, getTasks, updateTask, deleteTask, getDashboardStats, getComments, addComment, aiCreateTask, toggleDecision, suggestNextStep };
