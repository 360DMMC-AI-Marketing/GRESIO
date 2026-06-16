const { Router } = require('express');
const { create, list, getById, update, remove } = require('../controllers/chainController');
const { auth, authorize } = require('../middleware/auth');
const router = Router();

router.use(auth);
router.get('/', list);
router.post('/', authorize('admin', 'project_manager', 'manager', 'team_lead'), create);
router.get('/:id', getById);
router.put('/:id', authorize('admin', 'project_manager', 'manager', 'team_lead'), update);
router.delete('/:id', authorize('admin', 'project_manager', 'manager', 'team_lead'), remove);

module.exports = router;
