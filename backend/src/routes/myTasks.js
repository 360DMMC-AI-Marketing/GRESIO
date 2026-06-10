const { Router } = require('express');
const { auth } = require('../middleware/auth');
const { getMyTasks, getMyWidgets, getRoleAnalytics } = require('../controllers/myTasksController');

const router = Router();

router.use(auth);

router.get('/', getMyTasks);
router.get('/widgets', getMyWidgets);
router.get('/analytics', getRoleAnalytics);

module.exports = router;
