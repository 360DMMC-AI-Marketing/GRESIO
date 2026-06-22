const { Router } = require('express');
const c = require('../controllers/wikiController');
const { auth, authorize } = require('../middleware/auth');
const { wiki: wikiValidation } = require('../middleware/validate');
const upload = require('../middleware/upload');
const router = Router();

router.use(auth);

router.get('/', c.getPages);
router.get('/slug/:slug', c.getPageBySlug);
router.get('/:id', c.getPageById);
router.post('/', authorize('admin', 'project_manager', 'team_lead', 'manager'), wikiValidation.create, c.createPage);
router.patch('/:id', c.updatePage);
router.delete('/:id', authorize('admin', 'project_manager', 'team_lead'), c.deletePage);
router.post('/:id/upload', authorize('admin', 'project_manager', 'team_lead', 'manager'), upload.single('file'), c.uploadFile);
router.delete('/:id/files/:fileId', authorize('admin', 'project_manager', 'team_lead'), c.deleteFile);
router.post('/:id/rate', c.ratePage);

module.exports = router;
