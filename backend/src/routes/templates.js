const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const c = require('../controllers/templateController');

router.get('/', auth, c.list);
router.get('/my', auth, c.myTemplates);
router.get('/:id', auth, c.getById);
router.post('/', auth, c.create);
router.patch('/:id', auth, c.update);
router.delete('/:id', auth, c.remove);
router.post('/from-project/:projectId', auth, c.fromProject);
router.post('/:id/download', auth, c.download);
router.post('/:id/apply', auth, c.apply);
router.post('/:id/rate', auth, c.rate);

module.exports = router;
