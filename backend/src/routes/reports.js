const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const reportController = require('../controllers/reportController');

router.get('/', auth, reportController.listReports);
router.get('/project/:id', auth, reportController.getReportData);
router.post('/project/:id', auth, reportController.generateReport);
router.get('/:id', auth, reportController.getReport);
router.delete('/:id', auth, reportController.deleteReport);
router.post('/:id/download', auth, reportController.countDownload);

module.exports = router;
