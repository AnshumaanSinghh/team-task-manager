const express = require('express');
const {
  createProject, getProjects, getProjectById, updateProject, deleteProject,
  generateShareLink, revokeShareLink, getPublicProject, getProjectActivity,
  getProjectPulse, getPlaybackHighlights, getStandup
} = require('../controllers/projectController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/public/:shareId', getPublicProject);

router.route('/').get(protect, getProjects).post(protect, admin, createProject);
router.route('/:id')
  .get(protect, getProjectById)
  .put(protect, admin, updateProject)
  .delete(protect, admin, deleteProject);
router.get('/:id/activity', protect, getProjectActivity);
router.get('/:id/pulse', protect, getProjectPulse);
router.get('/:id/playback-highlights', protect, getPlaybackHighlights);
router.get('/:id/standup', protect, getStandup);
router.route('/:id/share').post(protect, admin, generateShareLink).delete(protect, admin, revokeShareLink);

module.exports = router;
