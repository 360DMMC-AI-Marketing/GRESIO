const Project = require('../models/Project');
const Sprint = require('../models/Sprint');
const Task = require('../models/Task');

function inferStartDate(task, sprint, project) {
  if (task.startDate) return task.startDate;
  if (sprint?.startDate) return sprint.startDate;
  if (task.createdAt) return task.createdAt;
  if (project?.startDate) return project.startDate;
  return new Date(project?.createdAt || Date.now());
}

function statusColor(status) {
  const map = {
    todo: '#9ca3af',
    in_progress: '#3b82f6',
    review: '#f59e0b',
    done: '#22c55e',
    delayed: '#ef4444',
    active: '#3b82f6',
    completed: '#22c55e',
    cancelled: '#ef4444',
    planning: '#9ca3af',
    on_track: '#22c55e',
    at_risk: '#f59e0b',
    blocked: '#ef4444',
    ready_to_test: '#8b5cf6',
  };
  return map[status] || '#6b7280';
}

function phaseColor(phase) {
  const map = {
    discovery: '#f59e0b',
    planning: '#3b82f6',
    development: '#22c55e',
    testing: '#8b5cf6',
    review: '#f97316',
    launched: '#6b7280',
    delivered: '#14b8a6',
    designing: '#ec4899',
    prototyping: '#a855f7',
    business_growth: '#06b6d4',
    validation: '#10b981',
    content_creation: '#eab308',
    editing: '#f43f5e',
    research: '#6366f1',
    analysis: '#8b5cf6',
  };
  return map[phase] || '#6b7280';
}

exports.getTimeline = async (req, res, next) => {
  try {
    const domain = req.user.domain;
    const { projectId } = req.query;

    const projectFilter = { domain, isActive: true };
    if (projectId) projectFilter._id = projectId;
    const projects = await Project.find(projectFilter).select('name startDate deadline phase status progress createdAt').sort('startDate').lean();

    const sprintFilter = projectId ? { project: projectId } : {};
    const sprints = await Sprint.find(sprintFilter).populate('project', 'name domain').sort('startDate').lean();
    const domainSprints = sprints.filter(s => s.project?.domain === domain);

    const taskFilter = { domain, isActive: true, scope: 'project' };
    if (projectId) taskFilter.project = projectId;
    const tasks = await Task.find(taskFilter).populate('project', 'name startDate').populate('sprint', 'name startDate endDate').populate('assignee', 'name').sort('startDate deadline createdAt').lean();

    const projectMap = {};
    for (const p of projects) {
      const pId = String(p._id);
      projectMap[pId] = {
        id: pId,
        type: 'project',
        label: p.name,
        startDate: p.startDate,
        endDate: p.deadline,
        phase: p.phase,
        color: phaseColor(p.phase),
        status: p.status,
        progress: p.progress,
        children: [],
      };
    }

    for (const sprint of domainSprints) {
      const pId = String(sprint.project?._id);
      if (!projectMap[pId]) continue;
      projectMap[pId].children.push({
        id: String(sprint._id),
        type: 'sprint',
        label: sprint.name,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        color: statusColor(sprint.status),
        status: sprint.status,
        children: [],
      });
    }

    for (const task of tasks) {
      const pId = String(task.project?._id);
      if (!projectMap[pId]) continue;
      const sprintId = task.sprint ? String(task.sprint._id) : null;
      const sprint = domainSprints.find(s => String(s._id) === sprintId);
      const project = projectMap[pId];
      const start = inferStartDate(task, sprint, project);

      const taskNode = {
        id: String(task._id),
        type: 'task',
        label: task.title,
        startDate: start,
        endDate: task.deadline || start,
        color: statusColor(task.status),
        status: task.status,
        priority: task.priority,
        assignee: task.assignee?.name || '',
      };

      if (sprintId && project.children.some(c => c.id === sprintId)) {
        const sprintNode = project.children.find(c => c.id === sprintId);
        sprintNode.children.push(taskNode);
      } else {
        project.children.push(taskNode);
      }
    }

    for (const p of projects) {
      const pId = String(p._id);
      if (projectMap[pId] && projectMap[pId].children.length > 0) {
        let minDate = projectMap[pId].startDate;
        let maxDate = projectMap[pId].endDate;
        for (const child of projectMap[pId].children) {
          if (child.startDate && (!minDate || child.startDate < minDate)) minDate = child.startDate;
          if (child.endDate && (!maxDate || child.endDate > maxDate)) maxDate = child.endDate;
          if (child.children) {
            for (const grandchild of child.children) {
              if (grandchild.startDate && (!minDate || grandchild.startDate < minDate)) minDate = grandchild.startDate;
              if (grandchild.endDate && (!maxDate || grandchild.endDate > maxDate)) maxDate = grandchild.endDate;
            }
          }
        }
        projectMap[pId].startDate = minDate;
        projectMap[pId].endDate = maxDate;
      }
    }

    const result = Object.values(projectMap).filter(p => p.children.length > 0 || !projectId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
