const { Router } = require('express');
const { submitContact } = require('../controllers/contactController');

const router = Router();

router.post('/', submitContact);

module.exports = router;
