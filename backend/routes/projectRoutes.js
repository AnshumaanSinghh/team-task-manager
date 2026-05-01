const express = require('express');
const router = express.Router();
const { createProject, getProjects, getProjectById, updateProject, generateShareLink, getPublicProject, getProjectActivity, getProjectPulse, getPlaybackHighlights } = require('../controllers/projectController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/public/:shareId', getPublicProject);

router.route('/').get(protect, getProjects).post(protect, admin, createProject);
router.route('/:id').get(protect, getProjectById).put(protect, admin, updateProject);
router.get('/:id/activity', protect, getProjectActivity);
router.get('/:id/pulse', protect, getProjectPulse);
router.get('/:id/playback-highlights', protect, getPlaybackHighlights);
router.post('/:id/share', protect, admin, generateShareLink);

module.exports = router;
