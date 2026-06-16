const { Router } = require('express');
const { getTimeline } = require('../controllers/timelineController');
const { auth } = require('../middleware/auth');
const router = Router();

router.use(auth);
router.get('/', getTimeline);

module.exports = router;
