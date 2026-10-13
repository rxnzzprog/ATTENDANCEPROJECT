const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Accessible by Admin and Teacher
router.use(authenticateToken);

router.get('/data', reportController.getReports);
router.get('/filters', reportController.getFilterOptions);
router.get('/export/csv', reportController.exportCSV);

module.exports = router;
