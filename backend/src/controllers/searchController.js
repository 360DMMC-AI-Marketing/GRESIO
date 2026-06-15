const Project = require('../models/Project');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const User = require('../models/User');
const { getDomainProjectIds } = require('../config/planLimits');

exports.search = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ results: [] });

    const regex = { $regex: q, $options: 'i' };
    const domain = req.user.domain;

    const projectIds = await getDomainProjectIds(domain);

    const [projects, tasks, sprints, users] = await Promise.all([
      Project.find({ domain, name: regex, isActive: true }).select('name').limit(5).lean(),
      Task.find({ domain, title: regex, isActive: true }).select('title scope').limit(5).lean(),
      Sprint.find({ project: { $in: projectIds }, name: regex }).select('name').limit(5).lean(),
      User.find({ domain, name: regex, isActive: true }).select('name').limit(5).lean(),
    ]);

    const results = [
      ...projects.map(p => ({ type: 'Project', label: p.name, to: `/projects/${p._id}` })),
      ...tasks.map(t => ({ type: 'Task', label: t.title, to: '/tasks' })),
      ...sprints.map(s => ({ type: 'Sprint', label: s.name, to: '/sprints' })),
      ...users.map(u => ({ type: 'User', label: u.name, to: '/users' })),
    ];

    res.json({ results });
  } catch (e) { next(e); }
};
