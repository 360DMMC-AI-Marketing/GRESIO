const mongoose = require('mongoose');
const Report = require('./src/models/Report');
const Project = require('./src/models/Project');

(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/gresio');
  const project = await Project.findOne({}).select('_id name').lean();
  if (!project) { console.log('No project found'); process.exit(1); }
  
  const { buildReportData } = require('./src/controllers/reportController');
  const data = await buildReportData(project._id.toString(), 'client');
  const keys = Object.keys(data);
  console.log('New data keys (' + keys.length + '): ' + keys.join(', '));

  const report = await Report.findOneAndUpdate(
    { project: project._id, type: 'client' },
    { $set: { data } },
    { new: true }
  ).lean();

  console.log('Stored data keys: ' + Object.keys(report.data).length);
  console.log('Has features: ' + ('features' in report.data));
  console.log('Has bugs: ' + ('bugs' in report.data));
  console.log('Has phaseTimeline: ' + ('phaseTimeline' in report.data));
  console.log('Has overallHealth: ' + ('overallHealth' in report.data));
  console.log('Has keyMilestones: ' + ('keyMilestones' in report.data));
  console.log('Has techStack: ' + ('techStack' in report.data));
  console.log('Has keyDecisions: ' + ('keyDecisions' in report.data));
  console.log('Has documents: ' + ('documents' in report.data));
  console.log('Has technicalUrls: ' + ('technicalUrls' in report.data));
  console.log('Has analysisSummary: ' + ('analysisSummary' in report.data));
  console.log('Has featureCount: ' + ('featureCount' in report.data));
  console.log('Has bugFixedCount: ' + ('bugFixedCount' in report.data));
  console.log('Has bugTotalCount: ' + ('bugTotalCount' in report.data));

  await mongoose.disconnect();
})().catch(e => { console.log('Error:', e.message); process.exit(1); });
