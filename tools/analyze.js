const mongoose = require('mongoose');
const Project = require('../src/models/Project');
const Task = require('../src/models/Task');
const Sprint = require('../src/models/Sprint');
const Bug = require('../src/models/Bug');
const DecisionJournal = require('../src/models/DecisionJournal');
const AiAnalysis = require('../src/models/AiAnalysis');
const env = require('../src/config/env');

async function run() {
  await mongoose.connect(env.MONGODB_URI);
  const domain = process.env.DOMAIN || 'gresio.com';

  const projects = await Project.find({ domain, isActive: true }).select('name projectType status phase progress deadline').lean();
  const tasks = await Task.find({ domain, isActive: true }).populate('project', 'name').sort({ createdAt: -1 }).limit(200).lean();
  const sprints = await Sprint.find({ domain }).populate('project', 'name').sort({ createdAt: -1 }).limit(100).lean();
  const bugs = await Bug.find({ domain }).populate('project', 'name').sort({ createdAt: -1 }).limit(100).lean();
  const decisions = await DecisionJournal.find({ domain }).populate('createdBy', 'name').sort({ createdAt: -1 }).limit(100).lean();

  const data = {
    projects: projects.map(p => ({ name: p.name, type: p.projectType, status: p.status, phase: p.phase, progress: p.progress, deadline: p.deadline })),
    tasks: tasks.map(t => ({ title: t.title, status: t.status, priority: t.priority, type: t.type, deadline: t.deadline, project: t.project?.name })),
    sprints: sprints.map(s => ({ name: s.name, status: s.status, start: s.startDate, end: s.endDate, project: s.project?.name })),
    bugs: bugs.map(b => ({ title: b.title, severity: b.severity, status: b.status, project: b.project?.name })),
    decisions: decisions.map(d => ({ decision: d.decision, outcome: d.outcome, tags: d.tags, by: d.createdBy?.name })),
  };

  console.log(JSON.stringify(data, null, 2));
  console.log('\n---\nPaste the data above to your AI agent, then paste the JSON response below and the script will save it.');

  process.stdin.on('data', async (buf) => {
    try {
      const analysis = JSON.parse(buf.toString().trim());
      await AiAnalysis.create({
        domain,
        summary: analysis.summary || '',
        patterns: analysis.patterns || [],
        risks: analysis.risks || [],
      });
      console.log('Analysis saved! Refresh WorkDNA to see it.');
    } catch (e) {
      console.error('Failed to save:', e.message);
    }
    process.exit(0);
  });
}

run().catch(e => { console.error(e); process.exit(1); });
