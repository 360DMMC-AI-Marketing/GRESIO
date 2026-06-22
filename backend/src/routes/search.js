const { Router } = require('express');
const { search, publicSearch } = require('../controllers/searchController');
const { auth } = require('../middleware/auth');
const router = Router();
router.get('/public', publicSearch);
router.use(auth);
router.get('/', search);
module.exports = router;
