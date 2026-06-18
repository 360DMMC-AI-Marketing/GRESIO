const Template = require('../models/Template');

exports.list = async (req, res) => {
  try {
    const { type, category, minPrice, maxPrice, sort, page = 1, limit = 20 } = req.query;
    const filter = { approved: true };
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
    const template = await Template.findById(req.params.id).populate('author', 'name email').lean();
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json({ data: template });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, description, projectType, category, price, phases, tags } = req.body;
    if (!name || !phases?.length) return res.status(400).json({ error: 'name and phases required' });

    const template = await Template.create({
      name, description, projectType: projectType || 'software',
      category: category || 'general', price: price || 0,
      phases, tags: tags || [],
      author: req.user._id, domain: req.user.domain,
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
    const template = await Template.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloads: 1 } },
      { new: true }
    ).lean();
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json({ data: template });
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

exports.rate = async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });

    const template = await Template.findById(req.params.id);
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
