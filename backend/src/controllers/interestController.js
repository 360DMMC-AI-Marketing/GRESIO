const TestCase = require('../models/TestCase');
const ProjectInterest = require('../models/ProjectInterest');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const { getDomainProjectIds } = require('../config/planLimits');

function getIO() {
  return require('../app').io;
}

const MANAGER_ROLES = ['admin', 'project_manager', 'team_lead'];

function calculateInterestScore(tc, interests) {
  if (!interests) return { score: 100, status: 'high' };
  const { interestTags = [], priorityFeatures = [], ignorePatterns = [] } = interests;
  let score = 50;
  const title = (tc.title || '').toLowerCase();
  const tcFeature = (tc.feature || '').toLowerCase();
  const tcTags = (tc.tags || []).map(t => t.toLowerCase());
  const allText = [title, tcFeature, ...tcTags].join(' ');

  if (priorityFeatures.some(f => tcFeature.includes(f.toLowerCase()))) score += 30;
  if (interestTags.some(t => allText.includes(t.toLowerCase()))) score += 20;
  if (ignorePatterns.some(p => allText.includes(p.toLowerCase()))) score -= 40;
  score = Math.max(0, Math.min(100, score));
  let status = 'high';
  if (score < 30) status = 'flagged';
  else if (score < 60) status = 'low';
  return { score, status };
}

exports.getProjectInterests = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    if (!projectIds.some(id => id.toString() === req.params.projectId)) {
      return res.status(404).json({ message: 'Project not found' });
    }
    let interests = await ProjectInterest.findOne({ project: req.params.projectId });
    if (!interests) {
      interests = await ProjectInterest.create({ project: req.params.projectId, createdBy: req.user._id });
    }
    res.json(interests);
  } catch (e) { next(e); }
};

exports.updateProjectInterests = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    if (!projectIds.some(id => id.toString() === req.params.projectId)) {
      return res.status(404).json({ message: 'Project not found' });
    }
    const allowed = ['interestTags', 'priorityFeatures', 'ignorePatterns', 'autoDeleteEnabled', 'autoDeleteDays'];
    const changes = { updatedBy: req.user._id };
    allowed.forEach(f => { if (req.body[f] !== undefined) changes[f] = req.body[f]; });
    const interests = await ProjectInterest.findOneAndUpdate(
      { project: req.params.projectId },
      changes,
      { new: true, upsert: true, runValidators: true }
    );
    await Activity.create({
      user: req.user._id, domain: req.user.domain, type: 'task_update', source: 'internal',
      description: 'Updated project interest filters',
      metadata: { projectId: req.params.projectId },
    });
    res.json(interests);
  } catch (e) { next(e); }
};

exports.runInterestFilter = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const projectIds = await getDomainProjectIds(req.user.domain);
    if (!projectIds.some(id => id.toString() === projectId)) {
      return res.status(404).json({ message: 'Project not found' });
    }
    const interests = await ProjectInterest.findOne({ project: projectId });
    if (!interests || !interests.autoDeleteEnabled) {
      return res.json({ message: 'Interest filter disabled for this project', updated: 0 });
    }
    const tests = await TestCase.find({ project: projectId, isActive: true, status: { $ne: 'auto-draft' } });
    let updated = 0;
    let flagged = 0;
    for (const tc of tests) {
      const { score, status } = calculateInterestScore(tc, interests);
      tc.interestMatchScore = score;
      tc.interestMatchStatus = status;
      if (status === 'flagged' && !tc.flaggedForDeletion) {
        tc.flaggedForDeletion = true;
        tc.flaggedAt = new Date();
        tc.autoDeleteAt = new Date(Date.now() + interests.autoDeleteDays * 86400000);
        tc.status = 'auto-draft';
        flagged++;
      } else if (status !== 'flagged' && tc.flaggedForDeletion) {
        tc.flaggedForDeletion = false;
        tc.flaggedAt = undefined;
        tc.autoDeleteAt = undefined;
        if (tc.status === 'auto-draft') tc.status = 'draft';
      }
      await tc.save();
      updated++;
    }
    if (flagged > 0) {
      const admins = await require('../models/User').find({ domain: req.user.domain, role: 'admin' }).select('_id');
      for (const admin of admins) {
        await Notification.create({
          user: admin._id, domain: req.user.domain, type: 'warning',
          title: `${flagged} test case(s) flagged for deletion`,
          message: `Review and confirm before auto-deletion in ${interests.autoDeleteDays} days`,
          link: `/projects/${projectId}/test-cases`,
        }).catch(() => {});
      }
    }
    res.json({ message: 'Interest filter applied', updated, flagged });
  } catch (e) { next(e); }
};

exports.getFlaggedTests = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    const filter = { project: { $in: projectIds }, flaggedForDeletion: true, isActive: true };
    if (req.params.projectId) filter.project = req.params.projectId;
    const tests = await TestCase.find(filter)
      .populate('assignee', 'name email avatar role')
      .populate('sprint', 'name')
      .populate('linkedTask', 'title')
      .sort({ autoDeleteAt: 1 });
    res.json(tests);
  } catch (e) { next(e); }
};

exports.restoreFlaggedTest = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    const tc = await TestCase.findOne({ _id: req.params.id, project: { $in: projectIds }, flaggedForDeletion: true });
    if (!tc) return res.status(404).json({ message: 'Flagged test case not found' });
    tc.flaggedForDeletion = false;
    tc.flaggedAt = undefined;
    tc.autoDeleteAt = undefined;
    if (tc.status === 'auto-draft') tc.status = 'draft';
    tc.interestMatchScore = 100;
    tc.interestMatchStatus = 'high';
    await tc.save();
    const interests = await ProjectInterest.findOne({ project: tc.project });
    if (interests) {
      const tag = tc.feature || tc.title?.split(' ').slice(0, 2).join('_').toLowerCase();
      if (tag && !interests.interestTags.includes(tag)) {
        interests.interestTags.push(tag);
        await interests.save();
      }
    }
    await Activity.create({
      user: req.user._id, domain: req.user.domain, type: 'task_update', source: 'internal',
      description: `Restored flagged test case: ${tc.testCaseId}`,
      metadata: { testCaseId: tc._id, projectId: tc.project },
    });
    const populated = await TestCase.findById(tc._id)
      .populate('assignee', 'name email avatar role')
      .populate('project', 'name')
      .populate('sprint', 'name')
      .populate('linkedTask', 'title');
    res.json(populated);
  } catch (e) { next(e); }
};

exports.restoreAllFlagged = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    const tests = await TestCase.find({ project: { $in: projectIds }, flaggedForDeletion: true, isActive: true });
    let count = 0;
    for (const tc of tests) {
      tc.flaggedForDeletion = false;
      tc.flaggedAt = undefined;
      tc.autoDeleteAt = undefined;
      if (tc.status === 'auto-draft') tc.status = 'draft';
      tc.interestMatchScore = 100;
      tc.interestMatchStatus = 'high';
      await tc.save();
      count++;
    }
    res.json({ message: `Restored ${count} flagged test cases`, count });
  } catch (e) { next(e); }
};

exports.deleteAllFlagged = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    const result = await TestCase.deleteMany({ project: { $in: projectIds }, flaggedForDeletion: true, isActive: true });
    res.json({ message: `Deleted ${result.deletedCount} flagged test cases`, count: result.deletedCount });
  } catch (e) { next(e); }
};

exports.runAutoDelete = async () => {
  try {
    const now = new Date();
    const toDelete = await TestCase.find({
      flaggedForDeletion: true,
      isActive: true,
      autoDeleteAt: { $lte: now },
    });
    let count = 0;
    for (const tc of toDelete) {
      await TestCase.findByIdAndDelete(tc._id);
      count++;
    }
    if (count > 0) console.log(`Auto-deleted ${count} flagged test cases`);
  } catch (e) { console.error('Auto-delete error:', e.message); }
};

exports.getInterestStats = async (req, res, next) => {
  try {
    const projectIds = await getDomainProjectIds(req.user.domain);
    const filter = { project: { $in: projectIds }, isActive: true };
    if (req.params.projectId) filter.project = req.params.projectId;
    const all = await TestCase.find(filter).select('interestMatchStatus interestMatchScore flaggedForDeletion');
    const total = all.length;
    const high = all.filter(t => t.interestMatchStatus === 'high').length;
    const low = all.filter(t => t.interestMatchStatus === 'low').length;
    const flagged = all.filter(t => t.flaggedForDeletion).length;
    res.json({ total, highMatch: high, lowMatch: low, flaggedForDeletion: flagged });
  } catch (e) { next(e); }
};
