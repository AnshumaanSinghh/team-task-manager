const express = require('express');
const { getWorkload } = require('../controllers/teamController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.get('/workload', protect, getWorkload);

module.exports = router;
