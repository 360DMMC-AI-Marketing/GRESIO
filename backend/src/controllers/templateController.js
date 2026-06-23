const Template = require('../models/Template');

exports.list = async (req, res) => {
  try {
    const { type, category, minPrice, maxPrice, sort, page = 1, limit = 20 } = req.query;
    const filter = { approved: true };
    if (req.user.role !== 'admin') filter.domain = req.user.domain;
    if (type) filter.projectType = type;
    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    let sortObj = { downloads: -1 };
    if (sort === 'rating') sortObj = { rating: -1 };
    if (sort === 'newest') sortObj = { createdAt: -1 };
    if (sort === 'price') sortObj = { price: 1 };

    const templates = await Template.find(filter)
      .populate('author', 'name email')
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    const total = await Template.countDocuments(filter);

    res.json({ data: templates, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.role !== 'admin') filter.domain = req.user.domain;
    const template = await Template.findOne(filter).populate('author', 'name email').lean();
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json({ data: template });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const allowed = ['admin', 'project_manager', 'team_lead', 'manager'];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Only admins, PMs, team leads, and managers can create templates' });
    }
    const { name, description, projectType, category, price, phases, tags } = req.body;
    if (!name || !phases?.length) return res.status(400).json({ error: 'name and phases required' });

    const template = await Template.create({
      name, description, projectType: projectType || 'software',
      category: category || 'general', price: price || 0,
      phases, tags: tags || [],
      author: req.user._id, domain: req.user.domain || '',
    });
    res.status(201).json({ data: template });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    if (template.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    Object.assign(template, req.body);
    await template.save();
    res.json({ data: template });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    if (template.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await template.deleteOne();
    res.json({ message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.download = async (req, res) => {
  try {
    const template = await Template.findOneAndUpdate(
      { _id: req.params.id, domain: req.user.domain },
      { $inc: { downloads: 1 } },
      { new: true }
    ).lean();
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json({ data: template });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.apply = async (req, res) => {
  try {
    const template = await Template.findOne({ _id: req.params.id, domain: req.user.domain }).lean();
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const Project = require('../models/Project');
    const Task = require('../models/Task');
    const Sprint = require('../models/Sprint');

    const project = await Project.create({
      name: template.name,
      description: template.description,
      projectType: template.projectType,
      domain: req.user.domain,
      phase: 'planning',
      members: [req.user._id],
    });

    const taskDocs = [];
    const sprintDocs = [];
    let taskCounter = 0;

    for (let pi = 0; pi < template.phases.length; pi++) {
      const phase = template.phases[pi];
      const sprintStart = new Date();
      sprintStart.setDate(sprintStart.getDate() + pi * 14);
      const sprintEnd = new Date(sprintStart);
      sprintEnd.setDate(sprintEnd.getDate() + 13);

      const sprint = await Sprint.create({
        name: phase.name,
        project: project._id,
        startDate: sprintStart,
        endDate: sprintEnd,
        status: pi === 0 ? 'active' : 'planning',
        goal: phase.name,
        createdBy: req.user._id,
      });
      sprintDocs.push(sprint);
      taskCounter += phase.tasks.length;

      for (const t of phase.tasks) {
        const task = await Task.create({
          title: t.title,
          description: t.description || '',
          status: 'todo',
          project: project._id,
          sprint: sprint._id,
          estimatedHours: t.estimatedHours || 4,
          createdBy: req.user._id,
          domain: req.user.domain,
        });
        taskDocs.push(task);
      }
    }

    await Template.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } });

    const fullProject = await Project.findById(project._id)
      .populate('members', 'name email avatar')
      .lean();

    res.status(201).json({ data: { ...fullProject, tasks: taskDocs, sprints: sprintDocs } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.myTemplates = async (req, res) => {
  try {
    const templates = await Template.find({ author: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ data: templates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.fromProject = async (req, res) => {
  try {
    const allowed = ['admin', 'project_manager', 'team_lead', 'manager'];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Only admins, PMs, team leads, and managers can save projects as templates' });
    }

    const Project = require('../models/Project');
    const Task = require('../models/Task');
    const Sprint = require('../models/Sprint');

    const project = await Project.findById(req.params.projectId).lean();
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const sprints = await Sprint.find({ project: project._id }).sort({ startDate: 1 }).lean();
    const allTasks = await Task.find({ project: project._id }).lean();

    const phases = sprints.map(s => ({
      name: s.name,
      tasks: allTasks
        .filter(t => t.sprint && t.sprint.toString() === s._id.toString())
        .map(t => ({ title: t.title, description: t.description || '', estimatedHours: t.estimatedHours || 4 })),
    }));

    const template = await Template.create({
      name: project.name + ' (from project)',
      description: project.description || `Template generated from project ${project.name}`,
      projectType: project.projectType || 'software',
      phases: phases.length > 0 ? phases : [{ name: 'Planning', tasks: allTasks.map(t => ({ title: t.title, description: t.description || '', estimatedHours: t.estimatedHours || 4 })) }],
      author: req.user._id,
      domain: req.user.domain || '',
      approved: true,
      tags: ['from-project'],
    });

    res.status(201).json({ data: template });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.rate = async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });

    const template = await Template.findOne({ _id: req.params.id, domain: req.user.domain });
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const total = template.rating * template.ratingCount + rating;
    template.ratingCount += 1;
    template.rating = Math.round((total / template.ratingCount) * 10) / 10;
    await template.save();

    res.json({ data: { rating: template.rating, ratingCount: template.ratingCount } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
