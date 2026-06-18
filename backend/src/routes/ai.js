const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const c = require('../controllers/aiController');

router.post('/chat/:projectId', auth, c.chat);
router.get('/chat/:projectId/history', auth, c.history);
router.delete('/chat/:projectId', auth, c.clearHistory);

router.post('/report-summary/:id', auth, c.generateReportSummary);
router.post('/estimate', auth, c.estimateTask);
router.get('/risks/:projectId', auth, c.detectRisks);

router.post('/generate-template', auth, c.generateTemplate);

module.exports = router;
