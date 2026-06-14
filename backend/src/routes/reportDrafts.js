const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const reportDraftController = require('../controllers/reportDraftController');

const ROLES = ['admin', 'project_manager', 'manager', 'team_lead'];

router.get('/project/:id', auth, authorize(...ROLES), reportDraftController.getDraft);
router.post('/project/:id', auth, authorize(...ROLES), reportDraftController.saveDraft);
router.post('/project/:id/generate-pdf', auth, authorize(...ROLES), reportDraftController.generateCustomPdf);
router.post('/project/:id/save-report', auth, authorize(...ROLES), reportDraftController.saveCustomReport);

module.exports = router;
