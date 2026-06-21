const Wiki = require('../models/Wiki');
const fs = require('fs');
const path = require('path');

const populateRefs = q => q.populate('createdBy', 'name email avatar role').populate('updatedBy', 'name email avatar role');

function makeSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function uniqueSlug(title, domain, excludeId) {
  let slug = makeSlug(title);
  if (!slug) slug = 'untitled';
  let counter = 0;
  let candidate = slug;
  while (true) {
    const filter = { slug: candidate, domain };
    if (excludeId) filter._id = { $ne: excludeId };
    const exists = await Wiki.findOne(filter);
    if (!exists) return candidate;
    counter++;
    candidate = `${slug}-${counter}`;
  }
}

exports.getPages = async (req, res, next) => {
  try {
    const { search, department } = req.query;
    const filter = { domain: req.user.domain, isActive: true };
    if (department) filter.department = department;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }
    const pages = await populateRefs(Wiki.find(filter).sort({ updatedAt: -1 }));
    res.json(pages);
  } catch (e) { next(e); }
};

exports.getPageById = async (req, res, next) => {
  try {
    const page = await populateRefs(Wiki.findOne({ _id: req.params.id, domain: req.user.domain, isActive: true }));
    if (!page) return res.status(404).json({ message: 'Page not found' });
    res.json(page);
  } catch (e) { next(e); }
};

exports.getPageBySlug = async (req, res, next) => {
  try {
    const page = await populateRefs(Wiki.findOne({ slug: req.params.slug, domain: req.user.domain, isActive: true }));
    if (!page) return res.status(404).json({ message: 'Page not found' });
    res.json(page);
  } catch (e) { next(e); }
};

exports.createPage = async (req, res, next) => {
  try {
    const { title, content, department } = req.body;
    const slug = await uniqueSlug(title, req.user.domain);
    const data = {
      title, content, slug, domain: req.user.domain,
      createdBy: req.user._id, updatedBy: req.user._id, department: department || 'General',
      contributors: [{ user: req.user._id, name: req.user.name, updatedAt: new Date() }],
    };
    let page = await Wiki.create(data);
    page = await populateRefs(Wiki.findById(page._id));
    res.status(201).json(page);
  } catch (e) { next(e); }
};

exports.updatePage = async (req, res, next) => {
  try {
    const page = await Wiki.findById(req.params.id);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    if (page.domain !== req.user.domain) return res.status(403).json({ message: 'Access denied' });

    if (req.body.title !== undefined) {
      page.title = req.body.title;
      page.slug = await uniqueSlug(req.body.title, req.user.domain, req.params.id);
    }
    if (req.body.content !== undefined) page.content = req.body.content;
    if (req.body.department !== undefined) page.department = req.body.department;
    page.updatedBy = req.user._id;

    const already = page.contributors.some(c => c.user?.toString() === req.user._id.toString());
    if (already) {
      const idx = page.contributors.findIndex(c => c.user?.toString() === req.user._id.toString());
      if (idx !== -1) page.contributors[idx].updatedAt = new Date();
    } else {
      page.contributors.push({ user: req.user._id, name: req.user.name, updatedAt: new Date() });
    }

    await page.save();
    const result = await populateRefs(Wiki.findById(page._id));
    res.json(result);
  } catch (e) { next(e); }
};

exports.deletePage = async (req, res, next) => {
  try {
    const page = await Wiki.findById(req.params.id);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    if (page.domain !== req.user.domain) return res.status(403).json({ message: 'Access denied' });
    // Clean up attached files
    for (const f of page.files) {
      const filePath = path.join(__dirname, '../../uploads', f.filename);
      try { fs.unlinkSync(filePath); } catch {}
    }
    page.isActive = false;
    await page.save();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
};

exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const page = await Wiki.findById(req.params.id);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    if (page.domain !== req.user.domain) return res.status(403).json({ message: 'Access denied' });
    page.files.push({
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
    await page.save();
    const updated = await populateRefs(Wiki.findById(page._id));
    res.json(updated);
  } catch (e) { next(e); }
};

exports.deleteFile = async (req, res, next) => {
  try {
    const page = await Wiki.findById(req.params.id);
    if (!page) return res.status(404).json({ message: 'Page not found' });
    if (page.domain !== req.user.domain) return res.status(403).json({ message: 'Access denied' });
    const file = page.files.id(req.params.fileId);
    if (!file) return res.status(404).json({ message: 'File not found' });
    const filePath = path.join(__dirname, '../../uploads', file.filename);
    try { fs.unlinkSync(filePath); } catch {}
    page.files.pull({ _id: req.params.fileId });
    await page.save();
    const updated = await populateRefs(Wiki.findById(page._id));
    res.json(updated);
  } catch (e) { next(e); }
};
