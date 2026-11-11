const mongoose = require('mongoose');

const ACTIONS = [
  'created_task', 'updated_task', 'deleted_task', 'status_change',
  'created_project', 'updated_project', 'added_member', 'removed_member',
  'commented', 'focus_session', 'kudos'
];

const activitySchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ACTIONS
  },
  details: {
    type: String,
    required: true
  },
  meta: {
    from: String,
    to: String,
    minutes: Number,
    fields: [String]
  }
}, { timestamps: true });

activitySchema.index({ projectId: 1, createdAt: -1 });
activitySchema.index({ userId: 1, action: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
module.exports.ACTIONS = ACTIONS;
