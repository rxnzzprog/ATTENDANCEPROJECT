const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const teacherController = require('../controllers/teacherController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// Student QR Code scan endpoint
router.post('/scan', authenticateToken, requireRole('student'), attendanceController.processQRScan);

// Student attendance history endpoint alias
router.get('/my-records', authenticateToken, requireRole('student'), attendanceController.getMyRecords);

// Teacher QR Attendance Session management aliases
router.post('/sessions', authenticateToken, requireRole('teacher'), teacherController.createAttendanceSession);
router.post('/sessions/:id/end', authenticateToken, requireRole('teacher'), teacherController.closeSession);
router.put('/sessions/:id/end', authenticateToken, requireRole('teacher'), teacherController.closeSession);
router.get('/sessions/:id', authenticateToken, teacherController.getActiveSessionDetails);
router.get('/session/:id/records', authenticateToken, requireRole('teacher'), attendanceController.getSessionRecords);

module.exports = router;

