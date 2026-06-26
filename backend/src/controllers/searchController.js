const Project = require('../models/Project');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const User = require('../models/User');
const Wiki = require('../models/Wiki');
const WorkLog = require('../models/WorkLog');
const Template = require('../models/Template');
const DecisionJournal = require('../models/DecisionJournal');
const Bug = require('../models/Bug');
const TestCase = require('../models/TestCase');
const Report = require('../models/Report');
const { getDomainProjectIds } = require('../config/planLimits');

const SEARCH_LIMIT = 5;

const SEARCHABLE = [
  {
    model: Project, name: 'Project', fields: 'name',
    labelField: 'name', to: p => `/projects/${p._id}`,
    filter: { isActive: true },
    hasDomain: true,
  },
  {
    model: Task, name: 'Task', fields: 'title',
    labelField: 'title', to: t => `/tasks?taskId=${t._id}`,
    filter: { isActive: true },
    hasDomain: true,
  },
  {
    model: Sprint, name: 'Sprint', fields: 'name',
    labelField: 'name', to: s => `/sprints?sprintId=${s._id}`,
    filter: {}, useProjectIds: true,
  },
  {
    model: User, name: 'User', fields: 'name',
    labelField: 'name', to: () => '/users',
    filter: { isActive: true },
    hasDomain: true,
  },
  {
    model: Wiki, name: 'Wiki', fields: 'title',
    labelField: 'title', to: w => `/wiki/${w._id}`,
    filter: { isActive: true },
    hasDomain: true,
  },
  {
    model: WorkLog, name: 'Work Log', fields: 'description',
    labelField: 'taskTitle', fallback: 'description', to: () => '/work-logs',
    filter: {}, hasDomain: true,
  },
  {
    model: Template, name: 'Template', fields: 'name',
    labelField: 'name', to: t => `/templates/${t._id}`,
    filter: { approved: true },
    hasDomain: true,
  },
  {
    model: DecisionJournal, name: 'Decision', fields: 'decision',
    labelField: 'decision', to: () => '/decisions',
    fallback: 'rationale', filter: {},
    hasDomain: true,
  },
  {
    model: Bug, name: 'Bug', fields: 'title',
    labelField: 'title', to: b => `/projects/${b.project}?tab=test-cases`,
    fallback: 'description', filter: {},
    useProjectIds: true,
  },
  {
    model: TestCase, name: 'Test Case', fields: 'title',
    labelField: 'title', to: tc => `/test-cases/${tc.project}`,
    fallback: 'description', filter: { isActive: true },
    useProjectIds: true,
  },
  {
    model: Report, name: 'Report', fields: '_id',
    labelField: '_id', to: r => `/report/${r._id}`,
    filter: {},
    useProjectIds: true,
  },
];

async function queryCollection(cfg, q, domain, projectIds) {
  let docs;
  try {
    const baseFilter = cfg.hasDomain ? { domain: { $regex: `^${escapeRegex(domain)}$`, $options: 'i' } } : {};
    const extraFilter = cfg.useProjectIds ? { project: { $in: projectIds } } : {};
    docs = await cfg.model.find(
      { $text: { $search: q }, ...baseFilter, ...extraFilter, ...cfg.filter },
      { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } }).limit(SEARCH_LIMIT).lean();
  } catch {
    const regex = { $regex: q, $options: 'i' };
    let query = {};
    if (cfg.hasDomain) query.domain = domain;
    if (cfg.useProjectIds) query.project = { $in: projectIds };
    query[cfg.fields] = regex;
    Object.assign(query, cfg.filter);
    try {
      docs = await cfg.model.find(query).limit(SEARCH_LIMIT).lean();
    } catch {
      docs = [];
    }
  }
  return docs;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getLabel(doc, cfg) {
  let label = doc[cfg.labelField];
  if (cfg.labelField === '_id') label = 'Report';
  if (label) return String(label);
  if (cfg.fallback) return String(doc[cfg.fallback] || 'Untitled');
  return 'Untitled';
}

exports.search = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ results: [] });

    const domain = req.user.domain;
    const projectIds = await getDomainProjectIds(domain);

    const queries = SEARCHABLE.map(cfg => queryCollection(cfg, q, domain, projectIds));
    const docs = await Promise.all(queries);

    let results = [];
    for (let i = 0; i < SEARCHABLE.length; i++) {
      const cfg = SEARCHABLE[i];
      for (const doc of docs[i]) {
        results.push({
          type: cfg.name,
          label: getLabel(doc, cfg),
          to: typeof cfg.to === 'function' ? cfg.to(doc) : cfg.to,
          _score: doc.score || 0,
        });
      }
    }

    results.sort((a, b) => b._score - a._score);
    results = results.slice(0, 25).map(({ _score, ...rest }) => rest);

    res.json({ results });
  } catch (e) { next(e); }
};

exports.publicSearch = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ results: [] });

    const regex = { $regex: q, $options: 'i' };

    const [wikiPages, templates] = await Promise.all([
      Wiki.find({ isActive: true, title: regex }).select('title').limit(5).lean(),
      Template.find({ approved: true, name: regex }).select('name').limit(5).lean(),
    ]);

    const results = [
      ...wikiPages.map(w => ({ type: 'Wiki', label: w.title, to: `/wiki/${w._id}` })),
      ...templates.map(t => ({ type: 'Template', label: t.name, to: `/templates/${t._id}` })),
    ];

    res.json({ results });
  } catch (e) { next(e); }
};
