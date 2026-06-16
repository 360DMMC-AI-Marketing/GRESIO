const ProjectChain = require('../models/ProjectChain');

exports.create = async (req, res, next) => {
  try {
    const { name, projects } = req.body;
    if (!name) return res.status(400).json({ message: 'Chain name is required' });
    const chain = await ProjectChain.create({
      name, domain: req.user.domain,
      projects: projects || [],
      createdBy: req.user._id,
    });
    const populated = await ProjectChain.findById(chain._id).populate('projects', 'name phase status projectType progress');
    res.status(201).json(populated);
  } catch (e) { next(e); }
};

exports.list = async (req, res, next) => {
  try {
    const chains = await ProjectChain.find({ domain: req.user.domain, isActive: true })
      .populate('projects', 'name phase status projectType progress')
      .sort({ createdAt: -1 });
    res.json(chains);
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const chain = await ProjectChain.findOne({ _id: req.params.id, domain: req.user.domain, isActive: true })
      .populate('projects', 'name phase status projectType progress');
    if (!chain) return res.status(404).json({ message: 'Chain not found' });
    res.json(chain);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const { name, projects } = req.body;
    const chain = await ProjectChain.findOne({ _id: req.params.id, domain: req.user.domain });
    if (!chain) return res.status(404).json({ message: 'Chain not found' });
    if (name !== undefined) chain.name = name;
    if (projects !== undefined) chain.projects = projects;
    await chain.save();
    const populated = await ProjectChain.findById(chain._id).populate('projects', 'name phase status projectType progress');
    res.json(populated);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const chain = await ProjectChain.findOne({ _id: req.params.id, domain: req.user.domain });
    if (!chain) return res.status(404).json({ message: 'Chain not found' });
    chain.isActive = false;
    await chain.save();
    res.json({ message: 'Chain deleted' });
  } catch (e) { next(e); }
};
