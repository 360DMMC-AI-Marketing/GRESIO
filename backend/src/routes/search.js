const { Router } = require('express');
const { search } = require('../controllers/searchController');
const { auth } = require('../middleware/auth');
const router = Router();
router.use(auth);
router.get('/', search);
module.exports = router;
