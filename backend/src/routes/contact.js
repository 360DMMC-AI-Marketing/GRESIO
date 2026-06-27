const { Router } = require('express');
const { submitContact } = require('../controllers/contactController');
const { contact } = require('../middleware/validate');

const router = Router();

router.post('/', contact.submit, submitContact);

module.exports = router;
