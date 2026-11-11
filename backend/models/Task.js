const mongoose = require('mongoose');

const STATUSES = ['To Do', 'In Progress', 'In Review', 'Completed'];
const PRIORITIES = ['Low', 'Medium', 'High'];

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: STATUSES,
    default: 'To Do'
  },
  priority: {
    type: String,
    enum: PRIORITIES,
    default: 'Medium'
  },
  deadline: {
    type: Date,
    required: true
  },
  // Position inside a Kanban column (ascending). Fractional values allow drops between cards.
  order: {
    type: Number,
    default: () => Date.now()
  },
  tags: [{ type: String, trim: true, lowercase: true, maxlength: 24 }],
  // Story points (Fibonacci-ish scale, 0 = not estimated)
  estimate: { type: Number, default: 0, min: 0, max: 100 },
  // Tasks that must be completed before this one can be completed
  blockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  // Seconds logged through Focus Mode
  timeSpent: { type: Number, default: 0, min: 0 },
  completedAt: { type: Date, default: null },
  kudos: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now }
  }],
  subtasks: [{
    title: { type: String, required: true, trim: true, maxlength: 200 },
    isCompleted: { type: Boolean, default: false }
  }],
  decisionLog: [{
    commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
    text: String,
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    markedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

taskSchema.index({ projectId: 1, status: 1, order: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });

module.exports = mongoose.model('Task', taskSchema);
module.exports.STATUSES = STATUSES;
module.exports.PRIORITIES = PRIORITIES;
