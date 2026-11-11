const mongoose = require('mongoose');

const PROJECT_COLORS = ['emerald', 'lime', 'mint', 'forest', 'jade', 'onyx'];

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [80, 'Project name cannot exceed 80 characters']
  },
  description: {
    type: String,
    required: [true, 'Project description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  color: {
    type: String,
    enum: PROJECT_COLORS,
    default: 'emerald'
  },
  // Work-in-progress limits per Kanban column. 0 means "no limit".
  wipLimits: {
    todo: { type: Number, default: 0, min: 0, max: 99 },
    inProgress: { type: Number, default: 0, min: 0, max: 99 },
    inReview: { type: Number, default: 0, min: 0, max: 99 }
  },
  shareId: {
    type: String,
    unique: true,
    sparse: true
  }
}, { timestamps: true });

projectSchema.index({ members: 1 });

module.exports = mongoose.model('Project', projectSchema);
module.exports.PROJECT_COLORS = PROJECT_COLORS;
