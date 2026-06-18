const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const c = require('../controllers/referralController');

router.get('/generate', auth, c.generateCode);
router.get('/my', auth, c.myReferrals);
router.post('/redeem', auth, c.redeemCode);
router.get('/stats', auth, authorize('admin'), c.stats);

module.exports = router;
