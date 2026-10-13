const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

// All routes require Admin role
router.use(authenticateToken, requireRole('admin'));

// Dashboard Stats
router.get('/stats', adminController.getDashboardStats);

// Students Management
router.get('/students', adminController.getAllStudents);
router.post('/students', adminController.createStudent);
router.put('/students/:id', adminController.updateStudent);
router.delete('/students/:id', adminController.deleteStudent);

// Teachers Management
router.get('/teachers', adminController.getAllTeachers);
router.post('/teachers', adminController.createTeacher);
router.put('/teachers/:id', adminController.updateTeacher);
router.delete('/teachers/:id', adminController.deleteTeacher);

// Courses, Sections & Subjects
router.get('/courses', adminController.getAllCourses);
router.post('/courses', adminController.createCourse);
router.get('/sections', adminController.getAllSections);
router.post('/sections', adminController.createSection);
router.put('/sections/:id', adminController.updateSection);
router.delete('/sections/:id', adminController.deleteSection);
router.get('/subjects', adminController.getAllSubjects);
router.post('/subjects', adminController.createSubject);
router.put('/subjects/:id', adminController.updateSubject);
router.delete('/subjects/:id', adminController.deleteSubject);

// Enrollments
router.get('/enrollments', adminController.getAllEnrollments);
router.post('/enrollments', adminController.enrollStudent);
// Attendance Management
router.get('/attendance', adminController.getAdminAttendanceRecords);

module.exports = router;
