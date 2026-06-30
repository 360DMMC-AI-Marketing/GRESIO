const Notification = require('../models/Notification');
const ProjectViability = require('../models/ProjectViability');

const CRITICAL_SCORE_THRESHOLD = 35;
const WARNING_SCORE_THRESHOLD = 55;
const CHECK_INTERVAL_MS = 3600000;

let intervalHandle = null;

async function checkProject(viability) {
  const populated = viability.projectId;
  if (!populated || !populated._id || !populated.domain) return;

  const projectId = populated._id;
  const projectName = populated.name || 'Unknown';
  const domain = populated.domain;
  const score = viability.score;

  const existingNotifications = await Notification.countDocuments({
    domain,
    type: 'warning',
    title: { $regex: `Cerebrum: ${projectName}`, $options: 'i' },
    createdAt: { $gte: new Date(Date.now() - 86400000) },
  });

  if (existingNotifications > 0) return;

  if (score < CRITICAL_SCORE_THRESHOLD) {
    await Notification.create({
      user: null,
      domain,
      type: 'warning',
      title: `Cerebrum: ${projectName} — Critical Viability`,
      message: `Viability score dropped to ${score}/100. ${viability.recommendation === 'kill' ? 'Recommendation: KILL this project to save ~$' + (viability.projectedSavings || 0).toLocaleString() : 'Immediate attention required.'}`,
      link: `/cerebrum/oracle/${projectId}`,
      metadata: { projectId, score, recommendation: viability.recommendation },
    });
    return;
  }

  if (score < WARNING_SCORE_THRESHOLD) {
    await Notification.create({
      user: null,
      domain,
      type: 'warning',
      title: `Cerebrum: ${projectName} — Needs Attention`,
      message: `Viability score is ${score}/100. ${viability.trajectory === 'falling' ? 'Score is declining. ' : ''}Review recommendations.`,
      link: `/cerebrum/oracle/${projectId}`,
      metadata: { projectId, score, trajectory: viability.trajectory },
    });
  }
}

async function checkAndNotifyAll() {
  try {
    const viabilities = await ProjectViability.find({
      score: { $lt: WARNING_SCORE_THRESHOLD },
      lastComputed: { $gte: new Date(Date.now() - 7 * 86400000) },
    }).populate('projectId', 'name domain').lean();

    for (const v of viabilities) {
      await checkProject(v);
    }
  } catch (err) {
    console.error('[OracleNotifier] check failed:', err.message);
  }
}

async function checkAndNotify(projectId) {
  const viability = await ProjectViability.findOne({ projectId }).populate('projectId', 'name domain').lean();
  if (!viability) return;
  await checkProject(viability);
}

function startAutoCheck() {
  if (intervalHandle) return;
  checkAndNotifyAll();
  intervalHandle = setInterval(checkAndNotifyAll, CHECK_INTERVAL_MS);
}

function stopAutoCheck() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

module.exports = {
  checkAndNotify,
  checkAndNotifyAll,
  startAutoCheck,
  stopAutoCheck,
};
