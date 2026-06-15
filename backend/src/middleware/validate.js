const { body, param, query, validationResult } = require('express-validator');

const handleErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};

const auth = {
  register: [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    handleErrors,
  ],
  login: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    handleErrors,
  ],
};

const project = {
  create: [
    body('name').trim().notEmpty().withMessage('Project name is required'),
    handleErrors,
  ],
};

const task = {
  create: [
    body('title').trim().notEmpty().withMessage('Task title is required'),
    body('project').isMongoId().withMessage('Valid project ID is required'),
    handleErrors,
  ],
};

const user = {
  create: [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['admin', 'project_manager', 'developer', 'qa_tester', 'intern', 'team_lead']).withMessage('Valid role is required'),
    handleErrors,
  ],
};

const integration = {
  update: [
    body('name').isIn(['github', 'clickup', 'microsoft_graph']).withMessage('Valid integration name is required'),
    handleErrors,
  ],
};

const idParam = [
  param('id').isMongoId().withMessage('Invalid ID format'),
  handleErrors,
];

module.exports = { auth, project, task, user, integration, idParam };
