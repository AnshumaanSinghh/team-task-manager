const express = require('express');
const router = express.Router();
const { createTask, getTasks, updateTask, deleteTask, getDashboardStats } = require('../controllers/taskController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, getDashboardStats);
router.route('/').get(protect, getTasks).post(protect, admin, createTask);
router.route('/:id').put(protect, updateTask).delete(protect, admin, deleteTask);

module.exports = router;
