const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const reportController = require('../controllers/reportController');

const REPORT_ROLES = ['admin', 'project_manager', 'manager', 'team_lead'];
router.get('/', auth, authorize(...REPORT_ROLES), reportController.listReports);
router.get('/project/:id', auth, authorize(...REPORT_ROLES), reportController.getReportData);
router.post('/project/:id', auth, authorize(...REPORT_ROLES), reportController.generateReport);
router.get('/:id', auth, authorize(...REPORT_ROLES), reportController.getReport);
router.delete('/:id', auth, authorize(...REPORT_ROLES), reportController.deleteReport);
router.post('/:id/download', auth, authorize(...REPORT_ROLES), reportController.countDownload);

module.exports = router;
