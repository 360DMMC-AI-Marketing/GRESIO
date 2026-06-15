const { Router } = require('express');
const { login, register, getMe, updateProfile, changePassword, microsoftConfig } = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { auth: authValidation } = require('../middleware/validate');
const upload = require('../middleware/upload');

const router = Router();

router.get('/microsoft/config', microsoftConfig);
router.post('/login', authValidation.login, login);
router.post('/register', authValidation.register, register);
router.get('/me', auth, getMe);
router.patch('/profile', auth, upload.single('avatar'), updateProfile);
router.post('/change-password', auth, changePassword);

module.exports = router;
