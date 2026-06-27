const express = require('express');
const router = express.Router();
const { apiAuth, requireScope } = require('../middleware/apiAuth');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const Report = require('../models/Report');
const { getDomainProjectIds } = require('../config/planLimits');

router.use(apiAuth);

router.get('/projects', requireScope('projects:read'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    const filter = { domain: req.user.domain };
    if (status) filter.status = status;
    if (type) filter.projectType = type;
    const projects = await Project.find(filter)
      .select('name projectType status phase progress deadline client techStack createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    const total = await Project.countDocuments(filter);
    res.json({ data: projects, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/projects/:id', requireScope('projects:read'), async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, domain: req.user.domain }).lean();
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ data: project });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/projects/:id/tasks', requireScope('tasks:read'), async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, domain: req.user.domain }).lean();
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const { page = 1, limit = 50, status } = req.query;
    const filter = { project: req.params.id };
    if (status) filter.status = status;
    const tasks = await Task.find(filter)
      .select('title description status priority assignee estimatedHours loggedHours dueDate createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    const total = await Task.countDocuments(filter);
    res.json({ data: tasks, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/tasks', requireScope('tasks:write'), async (req, res) => {
  try {
    const { title, description, projectId, assignee, priority, estimatedHours } = req.body;
    if (!title || !projectId) return res.status(400).json({ error: 'title and projectId required' });
    const project = await Project.findOne({ _id: projectId, domain: req.user.domain }).lean();
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const task = await Task.create({
      title, description, project: projectId,
      assignee: assignee || req.user._id,
      priority: priority || 'medium',
      estimatedHours: estimatedHours || 0,
      status: 'todo',
    });
    res.status(201).json({ data: task });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/projects/:id/reports', requireScope('reports:read'), async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, domain: req.user.domain }).lean();
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const reports = await Report.find({ project: req.params.id })
      .select('type generatedAt downloadCount')
      .sort({ generatedAt: -1 })
      .lean();
    res.json({ data: reports });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/reports/:id', requireScope('reports:read'), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate('project', 'domain').lean();
    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (report.project && report.project.domain !== req.user.domain) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json({ data: report });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/sprints', requireScope('sprints:read'), async (req, res) => {
  try {
    const { page = 1, limit = 20, projectId } = req.query;
    const projectIds = await getDomainProjectIds(req.user.domain, req.user);
    const filter = { project: { $in: projectIds } };
    if (projectId) {
      if (!projectIds.some(pid => pid.toString() === projectId)) {
        return res.status(404).json({ error: 'Project not found' });
      }
      filter.project = projectId;
    }
    const sprints = await Sprint.find(filter)
      .sort({ startDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    const total = await Sprint.countDocuments(filter);
    res.json({ data: sprints, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/users/me', requireScope('users:read'), (req, res) => {
  res.json({ data: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role } });
});

module.exports = router;
