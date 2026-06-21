const { Router } = require('express');
const { create, update, deleteWorkLog, getMyLogs, getTeamLogs, getHistory, getUserProjectsAndTasks } = require('../controllers/workLogController');
const { auth, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const router = Router();
router.use(auth);

router.get('/my', getMyLogs);
router.get('/team', authorize('admin', 'project_manager', 'team_lead', 'manager'), getTeamLogs);
router.get('/history/:userId', getHistory);
router.get('/user-data', getUserProjectsAndTasks);
router.post('/', validate.workLog.create, create);
router.patch('/:id', update);
router.delete('/:id', deleteWorkLog);

module.exports = router;
