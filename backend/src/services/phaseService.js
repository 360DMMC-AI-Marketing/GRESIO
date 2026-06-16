const Project = require('../models/Project');
const Sprint = require('../models/Sprint');
const Task = require('../models/Task');
const TestingItem = require('../models/TestingItem');
const TestCase = require('../models/TestCase');
const Activity = require('../models/Activity');

function getIO() {
  try {
    const { getIO } = require('../socket/ioProvider');
    return getIO();
  } catch (e) { return null; }
}

const TYPE_CONFIGS = {
  software: {
    label: 'Software / Development',
    phases: ['discovery', 'planning', 'development', 'testing', 'review', 'launched', 'delivered'],
    autoPhases: new Set(['discovery', 'planning', 'development', 'testing', 'review']),
    manualPhases: new Set(['launched', 'delivered']),
  },
  design: {
    label: 'Design / Creative',
    phases: ['discovery', 'planning', 'designing', 'prototyping', 'testing', 'review', 'launched', 'delivered'],
    autoPhases: new Set(['discovery', 'planning', 'designing', 'prototyping', 'testing', 'review']),
    manualPhases: new Set(['launched', 'delivered']),
  },
  business: {
    label: 'Business / Marketing / Growth',
    phases: ['discovery', 'planning', 'business_growth', 'validation', 'testing', 'review', 'launched', 'delivered'],
    autoPhases: new Set(['discovery', 'planning', 'business_growth', 'validation', 'testing', 'review']),
    manualPhases: new Set(['launched', 'delivered']),
  },
  content: {
    label: 'Content / Writing',
    phases: ['discovery', 'planning', 'content_creation', 'editing', 'testing', 'review', 'launched', 'delivered'],
    autoPhases: new Set(['discovery', 'planning', 'content_creation', 'editing', 'testing', 'review']),
    manualPhases: new Set(['launched', 'delivered']),
  },
  research: {
    label: 'Research / Analysis',
    phases: ['discovery', 'planning', 'research', 'analysis', 'testing', 'review', 'launched', 'delivered'],
    autoPhases: new Set(['discovery', 'planning', 'research', 'analysis', 'testing', 'review']),
    manualPhases: new Set(['launched', 'delivered']),
  },
};

function expandLabel(phase) {
  return phase.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// In-memory transition cache — prevents circular transitions (2s cooldown)
// Stores { timestamp, fromPhase, toPhase } per project
const phaseTransitionCache = new Map();

function getExecutionPhase(type) {
  const map = {
    software: 'development',
    design: 'designing',
    business: 'business_growth',
    content: 'content_creation',
    research: 'research',
  };
  return map[type] || 'development';
}

async function evaluateProjectPhase(projectId) {
  const project = await Project.findById(projectId);
  if (!project) return;

  if (project.settings?.enableAutoPhaseProgression === false) return;

  const type = project.projectType || 'software';
  const config = TYPE_CONFIGS[type];
  if (!config) return;

  const PHASES = config.phases;
  const AUTO_PHASES = config.autoPhases;

  const currentIdx = PHASES.indexOf(project.phase);
  if (currentIdx === -1) return;

  // Debounce: prevent rapid RE-EVALUATION (2s cooldown)
  const cacheKey = projectId.toString();
  const cached = phaseTransitionCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 2000) {
    return project.phase;
  }

  const sprints = await Sprint.find({ project: projectId });
  const tasks = await Task.find({ project: projectId, isActive: true, scope: 'project' });
  const testingItems = await TestingItem.find({ project: projectId, isActive: true });
  const testCases = await TestCase.find({ project: projectId, isActive: true });

  const hasSprints = sprints.length > 0;
  const hasTasks = tasks.length > 0;

  const hasProjectInfo = !!(project.description || project.client || project.settings?.clientName || project.deadline || (project.members && project.members.length > 0));

  const s = project.settings || {};
  const hasRepos = !!(s.frontendRepo || s.backendRepo || s.databaseRepo || s.mobileRepo ||
                      s.apiDocsUrl || s.stagingUrl || s.productionUrl ||
                      (project.repositories && project.repositories.length > 0));

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const allTasksDone = totalTasks > 0 && doneTasks === totalTasks;
  const noCriticalTasksRemain = !tasks.some(t => t.priority === 'critical' && t.status !== 'done');

  const totalTesting = testingItems.length;
  const allTestingPassed = totalTesting > 0 && testingItems.every(t =>
    ['passed', 'completed'].includes(t.status)
  );
  const noFailedTesting = !testingItems.some(t => t.status === 'failed');

  const totalTC = testCases.length;
  const allTestCasesPassed = totalTC > 0 && testCases.every(tc => tc.status === 'passed');

  const testingReady = allTestCasesPassed || (allTestingPassed && noFailedTesting);

  let targetPhase;

  // ===== BACKWARD TRANSITION DETECTION =====
  // Handles cases where new work is added after forward progression
  // (must run before forward logic to override)
  // These check for REGRESSION: tasks reopened, new test cases added, etc.

  // Rule 1: Tasks reopened → back to execution phase
  if (totalTasks > 0 && doneTasks < totalTasks) {
    if (project.phase === 'review' || project.phase === 'testing') {
      targetPhase = getExecutionPhase(type);
    }
  }

  // Rule 2: Test cases or testing items not all passed → back to testing
  if (!targetPhase && project.phase === 'review') {
    if ((totalTC > 0 && !allTestCasesPassed) || (totalTesting > 0 && !allTestingPassed)) {
      targetPhase = 'testing';
    }
  }

  // Rule 3: New task added while in review → back to execution
  if (!targetPhase && project.phase === 'review') {
    if (hasTasks && allTasksDone === false) {
      targetPhase = getExecutionPhase(type);
    }
  }

  // Rule 4: In COMPLETE/launched/delivered — tasks or tests added → move back to testing or execution
  if (!targetPhase && !AUTO_PHASES.has(project.phase)) {
    if (totalTasks > 0 && doneTasks < totalTasks) {
      targetPhase = getExecutionPhase(type);
    } else if (totalTC > 0 && !allTestCasesPassed) {
      targetPhase = 'testing';
    }
  }

  // ===== FORWARD TRANSITION DETECTION =====
  // Only runs if no backward transition was triggered AND phase is auto
  if (!targetPhase && AUTO_PHASES.has(project.phase)) {
    // Type-specific evaluation
    switch (type) {
      case 'software':
        if (allTasksDone && noCriticalTasksRemain && testingReady) {
          targetPhase = 'review';
        } else if (allTasksDone && noCriticalTasksRemain) {
          targetPhase = 'testing';
        } else if (hasSprints || hasTasks) {
          targetPhase = 'development';
        } else if (hasProjectInfo || hasRepos) {
          targetPhase = 'planning';
        }
        break;

      case 'design':
        if (allTasksDone && noCriticalTasksRemain && testingReady) {
          targetPhase = 'review';
        } else if (allTasksDone && noCriticalTasksRemain) {
          targetPhase = 'testing';
        } else if (testingReady) {
          targetPhase = 'testing';
        } else if ((totalTesting > 0 && allTestingPassed) || (testCases.length > 0 && allTestCasesPassed)) {
          targetPhase = 'prototyping';
        } else if (hasTasks || hasSprints) {
          targetPhase = 'designing';
        } else if (hasProjectInfo || hasRepos) {
          targetPhase = 'planning';
        }
        break;

      case 'business':
        if (allTasksDone && noCriticalTasksRemain && testingReady) {
          targetPhase = 'review';
        } else if (allTasksDone && noCriticalTasksRemain) {
          targetPhase = 'testing';
        } else if (testingReady) {
          targetPhase = 'testing';
        } else if (totalTasks > 0 && doneTasks >= totalTasks * 0.7) {
          targetPhase = 'validation';
        } else if (hasTasks || hasSprints) {
          targetPhase = 'business_growth';
        } else if (hasProjectInfo) {
          targetPhase = 'planning';
        }
        break;

      case 'content':
        if (allTasksDone && noCriticalTasksRemain && testingReady) {
          targetPhase = 'review';
        } else if (allTasksDone && noCriticalTasksRemain) {
          targetPhase = 'testing';
        } else if (testingReady) {
          targetPhase = 'testing';
        } else if (totalTasks > 0 && doneTasks >= totalTasks * 0.5) {
          targetPhase = 'editing';
        } else if (hasTasks) {
          targetPhase = 'content_creation';
        } else if (hasProjectInfo) {
          targetPhase = 'planning';
        }
        break;

      case 'research':
        if (allTasksDone && noCriticalTasksRemain && testingReady) {
          targetPhase = 'review';
        } else if (allTasksDone && noCriticalTasksRemain) {
          targetPhase = 'testing';
        } else if (testingReady) {
          targetPhase = 'testing';
        } else if (totalTasks > 0 && doneTasks >= totalTasks * 0.5) {
          targetPhase = 'analysis';
        } else if (hasTasks) {
          targetPhase = 'research';
        } else if (hasProjectInfo) {
          targetPhase = 'planning';
        }
        break;
    }
  }

  // Stay in current phase if no transition condition matched
  if (!targetPhase) {
    return project.phase;
  }

  const targetIdx = PHASES.indexOf(targetPhase);
  if (targetPhase !== project.phase) {
    const fromPhase = project.phase;
    phaseTransitionCache.set(cacheKey, { timestamp: Date.now(), fromPhase, toPhase: targetPhase });
    const progress = calcPhaseProgress(project.projectType, targetPhase);
    await Project.findByIdAndUpdate(projectId, { phase: targetPhase, progress }, { new: true });
    if (project.domain) {
      await Activity.create({
        user: null,
        domain: project.domain,
        type: 'project_update',
        source: 'internal',
        description: `Phase auto-transition: ${fromPhase} → ${targetPhase}`,
        metadata: { projectId, fromPhase, toPhase: targetPhase, reason: 'auto' },
      }).catch(() => {});
    }
    // Emit socket event for real-time UI updates
    try {
      const io = getIO();
      if (io) {
        io.to(`project:${projectId}`).emit('phase_changed', {
          projectId,
          fromPhase,
          toPhase: targetPhase,
          progress,
        });
      }
    } catch (e) {}
    return targetPhase;
  }

  return project.phase;
}

function calcPhaseProgress(projectType, phase) {
  const config = TYPE_CONFIGS[projectType || 'software'];
  if (!config) return 0;
  const idx = config.phases.indexOf(phase);
  if (idx === -1) return 0;
  return Math.round((idx / (config.phases.length - 1)) * 100);
}

module.exports = { evaluateProjectPhase, TYPE_CONFIGS, calcPhaseProgress };
