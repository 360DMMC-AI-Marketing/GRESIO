const StrategyGoal = require('../models/StrategyGoal');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Sprint = require('../models/Sprint');

async function computeAlignment(domain) {
  const goals = await StrategyGoal.find({ domain, active: true }).lean();
  if (goals.length === 0) {
    return { alignment: 0, goals: [], gapAnalysis: null, message: 'No active strategy goals set' };
  }

  const projects = await Project.find({ domain, isActive: true }).select('_id name').lean();
  const projectIds = projects.map(p => p._id);

  const tasks = await Task.find({ project: { $in: projectIds }, isActive: true })
    .select('title status tags project')
    .lean();

  const totalWeight = goals.reduce((sum, g) => sum + g.weight, 0);

  const goalAlignment = goals.map(goal => {
    const goalWeight = totalWeight > 0 ? goal.weight / totalWeight : 0;
    const goalTags = goal.title.toLowerCase().split(/\s+/);
    const categoryTags = goal.category ? [goal.category.toLowerCase()] : [];

    const matchingTasks = tasks.filter(t => {
      const titleLower = (t.title || '').toLowerCase();
      const tags = (t.tags || []).map(tag => tag.toLowerCase());
      return goalTags.some(gt => titleLower.includes(gt) || tags.some(t => t.includes(gt))) ||
             categoryTags.some(ct => titleLower.includes(ct) || tags.some(t => t.includes(ct)));
    });

    const taskCount = matchingTasks.length;
    const taskPercentage = tasks.length > 0 ? (taskCount / tasks.length) * 100 : 0;
    const alignedScore = Math.min(100, Math.round(taskPercentage * goalWeight * 2));

    const suggestedTasks = matchingTasks.slice(0, 5).map(t => ({
      id: t._id,
      title: t.title,
      status: t.status,
    }));

    return {
      goalId: goal._id,
      title: goal.title,
      category: goal.category,
      weight: goal.weight,
      alignedTasks: taskCount,
      totalTasks: tasks.length,
      alignmentPercentage: Math.round(taskPercentage),
      alignmentScore: alignedScore,
      kpis: goal.kpis || [],
      suggestedTasks,
    };
  });

  const overallAlignment = goalAlignment.length > 0
    ? Math.round(goalAlignment.reduce((sum, g) => sum + g.alignmentScore, 0) / goalAlignment.length)
    : 0;

  const gapAnalysis = analyzeGap(goals, tasks, projects);

  return {
    alignment: overallAlignment,
    goals: goalAlignment,
    gapAnalysis,
    totalTasks: tasks.length,
    totalProjects: projects.length,
  };
}

function analyzeGap(goals, tasks, projects) {
  if (goals.length === 0 || tasks.length === 0) return null;

  const unalignedTasks = tasks.filter(t => {
    const titleLower = (t.title || '').toLowerCase();
    const tags = (t.tags || []).map(tag => tag.toLowerCase());

    return !goals.some(goal => {
      const goalTags = goal.title.toLowerCase().split(/\s+/);
      const categoryTags = goal.category ? [goal.category.toLowerCase()] : [];
      return goalTags.some(gt => titleLower.includes(gt) || tags.some(t => t.includes(gt))) ||
             categoryTags.some(ct => titleLower.includes(ct) || tags.some(t => t.includes(ct)));
    });
  });

  const unalignedPercentage = tasks.length > 0 ? (unalignedTasks.length / tasks.length) * 100 : 0;

  const topGoal = goals.reduce((max, g) => g.weight > max.weight ? g : max, goals[0]);
  const bottomTasks = unalignedTasks.slice(0, 10);

  const topGoalAlignedCount = goals.length > 0
    ? tasks.filter(t => {
        const titleLower = (t.title || '').toLowerCase();
        return topGoal.title.toLowerCase().split(/\s+/).some(gt => titleLower.includes(gt));
      }).length
    : 0;

  const recommendedRebalance = [];
  if (topGoalAlignedCount < tasks.length * 0.2 && topGoal.weight > 50) {
    recommendedRebalance.push(`Increase tasks aligned with "${topGoal.title}" from ${topGoalAlignedCount} to ${Math.ceil(tasks.length * 0.3)}`);
  }
  if (unalignedPercentage > 40) {
    recommendedRebalance.push(`Reduce unaligned work from ${Math.round(unalignedPercentage)}% to below 30%`);
  }

  return {
    unalignedTasks: unalignedTasks.length,
    unalignedPercentage: Math.round(unalignedPercentage),
    topGoalMissed: topGoalAlignedCount < tasks.length * 0.15 ? topGoal.title : null,
    sampleUnalignedTasks: bottomTasks.map(t => ({ id: t._id, title: t.title, status: t.status })),
    recommendedRebalance: recommendedRebalance.slice(0, 3),
  };
}

async function getRecommendedRebalance(domain) {
  const alignment = await computeAlignment(domain);
  if (!alignment.gapAnalysis) return [];

  const rebalancing = [];

  for (const goal of alignment.goals) {
    if (goal.alignmentPercentage < 30 && goal.weight > 30) {
      rebalancing.push({
        goal: goal.title,
        currentAlignment: goal.alignmentPercentage,
        targetAlignment: Math.min(100, goal.weight),
        suggestedAction: `Dedicate more resources to "${goal.title}" — currently ${goal.alignmentPercentage}% aligned but weighted at ${goal.weight}% importance`,
        tasksToRealign: goal.suggestedTasks,
      });
    }
  }

  if (alignment.gapAnalysis.unalignedPercentage > 40) {
    rebalancing.push({
      goal: 'Unaligned Work',
      currentAlignment: 100 - alignment.gapAnalysis.unalignedPercentage,
      targetAlignment: 70,
      suggestedAction: `Reduce unaligned work from ${alignment.gapAnalysis.unalignedPercentage}% to below 30%`,
      tasksToRealign: alignment.gapAnalysis.sampleUnalignedTasks?.slice(0, 5) || [],
    });
  }

  return rebalancing.sort((a, b) => a.currentAlignment - b.currentAlignment);
}

module.exports = {
  computeAlignment,
  getRecommendedRebalance,
};
