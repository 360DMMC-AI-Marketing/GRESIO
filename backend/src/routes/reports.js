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
router.post('/:id/share', auth, authorize(...REPORT_ROLES), reportController.shareReport);
router.get('/:id/share', auth, authorize(...REPORT_ROLES), reportController.getShareSettings);
router.delete('/:id/share', auth, authorize(...REPORT_ROLES), (req, res) => {
  req.body = { enabled: false };
  reportController.shareReport(req, res);
});

module.exports = router;


module.exports = router;
