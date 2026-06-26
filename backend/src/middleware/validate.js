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
    body('projectId').isMongoId().withMessage('Valid project ID is required'),
    handleErrors,
  ],
  update: [
    body('title').optional().trim().notEmpty().withMessage('Task title cannot be empty'),
    body('status').optional().isIn(['todo', 'in_progress', 'review', 'done', 'delayed']).withMessage('Valid status is required'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent', 'critical', 'blocker']).withMessage('Valid priority is required'),
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
  update: [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('role').optional().isIn(['admin', 'project_manager', 'developer', 'qa_tester', 'intern', 'team_lead']).withMessage('Valid role is required'),
    handleErrors,
  ],
};

const integration = {
  update: [
    body('name').isIn(['github', 'clickup', 'microsoft_graph']).withMessage('Valid integration name is required'),
    handleErrors,
  ],
};

const sprint = {
  create: [
    body('name').trim().notEmpty().withMessage('Sprint name is required'),
    body('project').isMongoId().withMessage('Valid project ID is required'),
    handleErrors,
  ],
  update: [
    body('name').optional().trim().notEmpty().withMessage('Sprint name cannot be empty'),
    handleErrors,
  ],
};

const bug = {
  create: [
    body('title').trim().notEmpty().withMessage('Bug title is required'),
    body('project').isMongoId().withMessage('Valid project ID is required'),
    handleErrors,
  ],
  update: [
    body('title').optional().trim().notEmpty().withMessage('Bug title cannot be empty'),
    body('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed', 'reopened']).withMessage('Valid status is required'),
    handleErrors,
  ],
};

const workLog = {
  create: [
    body('hours').optional().isFloat({ min: 0 }).withMessage('Hours must be a positive number'),
    body('date').optional().isISO8601().withMessage('Date must be valid'),
    handleErrors,
  ],
};

const idParam = [
  param('id').isMongoId().withMessage('Invalid ID format'),
  handleErrors,
];

const wiki = {
  create: [
    body('title').trim().notEmpty().withMessage('Page title is required'),
    handleErrors,
  ],
};

const testCase = {
  create: [
    body('title').trim().notEmpty().withMessage('Test case title is required'),
    body('project').isMongoId().withMessage('Valid project ID is required'),
    handleErrors,
  ],
  update: [
    body('title').optional().trim().notEmpty().withMessage('Test case title cannot be empty'),
    handleErrors,
  ],
};

const testing = {
  create: [
    body('title').trim().notEmpty().withMessage('Testing item title is required'),
    body('project').isMongoId().withMessage('Valid project ID is required'),
    handleErrors,
  ],
};

module.exports = { auth, project, task, user, integration, sprint, bug, workLog, wiki, testCase, testing, idParam };
