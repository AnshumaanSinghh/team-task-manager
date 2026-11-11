const express = require('express');
const { registerUser, loginUser, getMe, getUsers } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { rateLimit } = require('../lib/rateLimit');

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.post('/signup', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.get('/me', protect, getMe);
router.get('/users', protect, getUsers);

module.exports = router;
