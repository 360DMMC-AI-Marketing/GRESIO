const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gresio');
  const AiAnalysis = require('../src/models/AiAnalysis');

  const pending = await AiAnalysis.find({ status: 'pending' }).sort({ createdAt: 1 }).limit(10).lean();

  if (pending.length === 0) {
    console.log('No pending analyses. Click "Run Monthly Analysis" in WorkDNA first.');
    process.exit(0);
  }

  console.log(`Found ${pending.length} pending analyses.\n`);

  for (const a of pending) {
    const data = a.snapshotData || {};
    console.log(`=== ${a.projectName} [${a.projectType}] ===`);
    console.log(`ID: ${a._id}`);
    console.log(`Stats: ${a.stats?.totalTasks || 0} tasks, ${a.stats?.totalSprints || 0} sprints, ${a.stats?.totalBugs || 0} bugs, ${a.stats?.totalDecisions || 0} decisions`);

    if (data.tasks?.length) {
      console.log('Tasks:');
      data.tasks.slice(0, 10).forEach(t => console.log(`  "${t.title}" ${t.status} ${t.priority || ''}`));
      if (data.tasks.length > 10) console.log(`  ... and ${data.tasks.length - 10} more`);
    }
    if (data.sprints?.length) {
      console.log('Sprints:');
      data.sprints.slice(0, 5).forEach(s => console.log(`  ${s.name} ${s.status} ${s.start?.slice(0,10)}→${s.end?.slice(0,10)}`));
    }
    if (data.bugs?.length) {
      console.log(`Bugs: ${data.bugs.length}`);
      data.bugs.slice(0, 3).forEach(b => console.log(`  ${b.title} [${b.severity}] ${b.status}`));
    }
    if (data.decisions?.length) {
      console.log(`Decisions: ${data.decisions.length}`);
      data.decisions.slice(0, 3).forEach(d => console.log(`  ${d.decision} → ${d.outcome || '?'}`));
    }

    console.log('');
  }

  console.log('Paste analysis JSON array below. Each entry MUST have projectId (the _id above).');
  console.log('Format: [{ "projectId": "...", "features": ["feat1","feat2"], "techStack": ["tech1"], "summary": "...", "risks": [...], "keyDecisions": [...], "patterns": [...] }]');

  process.stdin.on('data', async (buf) => {
    try {
      const results = JSON.parse(buf.toString().trim());
      let saved = 0;
      for (const r of results) {
        if (!r.projectId) { console.log(`Skipping entry without projectId`); continue; }
        const update = {
          $set: {
            status: 'done',
            features: r.features || [],
            techStack: r.techStack || [],
            summary: r.summary || '',
            risks: r.risks || [],
            keyDecisions: r.keyDecisions || [],
            patterns: r.patterns || [],
            generatedAt: new Date(),
          },
          $unset: { snapshotData: '' },
        };
        await AiAnalysis.updateOne({ _id: r.projectId, status: 'pending' }, update);
        saved++;
      }
      console.log(`Saved ${saved} analyses! Refresh WorkDNA to see them.`);
    } catch (e) {
      console.error('Invalid JSON:', e.message);
    }
    process.exit(0);
  });
}

run().catch(e => { console.error(e); process.exit(1); });
