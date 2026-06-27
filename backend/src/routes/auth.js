const { Router } = require('express');
const { login, register, getMe, updateProfile, changePassword, microsoftConfig, forgotPassword, resetPassword, verify2fa, setup2fa, enable2fa, disable2fa } = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { auth: authValidation } = require('../middleware/validate');
const upload = require('../middleware/upload');

const router = Router();

router.get('/microsoft/config', microsoftConfig);
router.post('/login', authValidation.login, login);
router.post('/register', authValidation.register, register);
router.get('/me', auth, getMe);
router.patch('/profile', auth, upload.single('avatar'), authValidation.updateProfile, updateProfile);
router.post('/change-password', auth, authValidation.changePassword, changePassword);
router.post('/forgot-password', authValidation.forgotPassword, forgotPassword);
router.post('/reset-password/:token', authValidation.resetPassword, resetPassword);
router.post('/verify-2fa', verify2fa);
router.post('/setup-2fa', auth, setup2fa);
router.post('/enable-2fa', auth, enable2fa);
router.post('/disable-2fa', auth, disable2fa);

module.exports = router;
