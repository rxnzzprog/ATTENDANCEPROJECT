const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// All routes require Student role
router.use(authenticateToken, requireRole('student'));

router.get('/profile', studentController.getStudentProfile);
router.get('/subjects', studentController.getEnrolledSubjects);
router.get('/history', studentController.getAttendanceHistory);
router.get('/stats', studentController.getAttendanceStats);

module.exports = router;
