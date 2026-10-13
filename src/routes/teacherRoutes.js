const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// All routes require Teacher role
router.use(authenticateToken, requireRole('teacher'));

router.get('/profile', teacherController.getTeacherProfile);
router.get('/classes', teacherController.getAssignedClasses);
router.post('/session/create', teacherController.createAttendanceSession);
router.get('/session/active', teacherController.getActiveSessionDetails);
router.put('/session/:id/close', teacherController.closeSession);
router.post('/attendance/manual', teacherController.manualMarkAttendance);
router.get('/attendance', teacherController.getTeacherAttendanceRecords);
router.get('/history', teacherController.getSessionHistory);

module.exports = router;
