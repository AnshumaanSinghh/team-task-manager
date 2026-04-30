const mongoose = require('mongoose');

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
    enum: ['created_task', 'updated_task', 'deleted_task', 'status_change', 'created_project', 'added_member']
  },
  details: {
    type: String,
    required: true
  },
  meta: {
    from: String,
    to: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);
