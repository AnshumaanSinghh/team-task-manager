const express = require('express');
const {
  getTasks, createTask, updateTask, deleteTask, getDashboardStats,
  getComments, addComment, deleteComment, toggleDecision,
  aiCreateTask, aiPlan, bulkCreateTasks, suggestNextStep, toggleKudos,
  startFocus, stopFocus
} = require('../controllers/taskController');
const { protect, admin } = require('../middleware/authMiddleware');
const { rateLimit } = require('../lib/rateLimit');

const router = express.Router();
const aiLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 40, message: 'AI request limit reached. Try again in a few minutes.' });

router.get('/dashboard', protect, getDashboardStats);
router.post('/ai-create', protect, admin, aiLimiter, aiCreateTask);
router.post('/ai-plan', protect, admin, aiLimiter, aiPlan);
router.post('/bulk', protect, admin, bulkCreateTasks);
router.post('/focus/stop', protect, stopFocus);

router.route('/').get(protect, getTasks).post(protect, admin, createTask);
router.route('/:id').put(protect, updateTask).delete(protect, admin, deleteTask);

router.route('/:id/comments').get(protect, getComments).post(protect, addComment);
router.delete('/:id/comments/:commentId', protect, deleteComment);
router.put('/:id/comments/:commentId/decision', protect, admin, toggleDecision);
router.get('/:id/suggest-next-step', protect, suggestNextStep);
router.post('/:id/kudos', protect, toggleKudos);
router.post('/:id/focus', protect, startFocus);

module.exports = router;
