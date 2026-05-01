const express = require('express');
const router = express.Router();
const { getTasks, createTask, updateTask, deleteTask, aiCreateTask, toggleDecision, suggestNextStep, getDashboardStats, getComments, addComment } = require('../controllers/taskController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, getDashboardStats);
router.post('/ai-create', protect, admin, aiCreateTask);
router.route('/').get(protect, getTasks).post(protect, admin, createTask);
router.route('/:id').put(protect, updateTask).delete(protect, admin, deleteTask);

router.route('/:id/comments')
  .get(protect, getComments)
  .post(protect, addComment);

router.put('/:id/comments/:commentId/decision', protect, toggleDecision);
router.get('/:id/suggest-next-step', protect, suggestNextStep);

module.exports = router;
