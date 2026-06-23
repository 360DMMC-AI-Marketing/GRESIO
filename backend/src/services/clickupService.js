const axios = require('axios');
const env = require('../config/env');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Activity = require('../models/Activity');

class ClickUpService {
  constructor() {
    this.api = axios.create({
      baseURL: 'https://api.clickup.com/api/v2',
      headers: {
        Authorization: env.CLICKUP_API_KEY,
        'Content-Type': 'application/json',
      },
    });
  }

  // ---- HIERARCHY BROWSING ---- //

  async getAuthorizedTeams() {
    const { data } = await this.api.get('/team');
    return data.teams || [];
  }

  async getTeamSpaces(teamId) {
    const { data } = await this.api.get(`/team/${teamId}/space`);
    return data.spaces || [];
  }

  async getSpaceFolders(spaceId) {
    const { data } = await this.api.get(`/space/${spaceId}/folder`);
    return data.folders || [];
  }

  async getFolderLists(folderId) {
    const { data } = await this.api.get(`/folder/${folderId}/list`);
    return data.lists || [];
  }

  async getSpaceLists(spaceId) {
    const { data } = await this.api.get(`/space/${spaceId}/list`);
    return data.lists || [];
  }

  async getListTasks(listId, opts = {}) {
    const { data } = await this.api.get(`/list/${listId}/task`, {
      params: { include_closed: opts.includeClosed ?? true, subtasks: opts.subtasks ?? false, page: opts.page ?? 0 },
    });
    return data.tasks || [];
  }

  async getTask(taskId) {
    const { data } = await this.api.get(`/task/${taskId}`);
    return data;
  }

  // ---- AI-POWERED IMPORT ---- //

  async analyzeForImport(selection) {
    const aiService = require('./aiService');
    return aiService.analyzeClickupForImport(selection);
  }

  async executeImportPlan(plan, userId) {
    const User = require('../models/User');
    const Project = require('../models/Project');
    const domain = (await User.findById(userId))?.domain || 'unknown';
    const results = { projects: [], totalTasks: 0, errors: [] };

    for (const item of plan) {
      if (item.action === 'skip') continue;

      try {
        if (item.action === 'create_project') {
          const project = await Project.create({
            name: item.projectName || 'Imported Project',
            description: item.description || '',
            projectType: item.projectType || 'software',
            phase: item.phase || 'planning',
            domain,
            isActive: true,
            members: [userId],
            clickupListId: item.clickupListId || '',
          });

          const tasks = await this.getListTasks(item.clickupListId, { includeClosed: true, subtasks: false });
          let taskCount = 0;

          for (const t of tasks) {
            const taskType = item.taskTypes?.[t.id] || 'task';
            const taskStatus = item.statusMapping?.[t.status?.status] || mapClickUpStatus(t.status?.status);
            try {
              await Task.create({
                title: t.name,
                description: t.description || '',
                status: taskStatus,
                type: taskType,
                clickupTaskId: t.id,
                project: project._id,
                domain,
                priority: mapPriorityFromClickUp(t.priority),
                deadline: t.due_date ? new Date(parseInt(t.due_date)) : null,
              });
              taskCount++;
            } catch (e) {
              results.errors.push(`Task "${t.name}": ${e.message}`);
            }
          }

          results.projects.push({ id: project._id, name: project.name, taskCount });
          results.totalTasks += taskCount;
        }
      } catch (e) {
        results.errors.push(`Project "${item.projectName}": ${e.message}`);
      }
    }

    return results;
  }

  // ---- SYNC (existing) ---- //

  async syncTasks(listId, projectId) {
    try {
      const { data } = await this.api.get(`/list/${listId}/task`, {
        params: { include_closed: true, subtasks: false },
      });

      const tasks = data.tasks || [];
      for (const t of tasks) {
        const existing = await Task.findOne({ clickupTaskId: t.id });
        if (existing) {
          existing.status = mapClickUpStatus(t.status.status);
          existing.title = t.name;
          existing.description = t.description || existing.description;
          await existing.save();
        } else {
          const task = await Task.create({
            title: t.name,
            description: t.description || '',
            status: mapClickUpStatus(t.status.status),
            clickupTaskId: t.id,
            project: projectId,
            deadline: t.due_date ? new Date(parseInt(t.due_date)) : null,
          });
          await Project.findByIdAndUpdate(projectId, { $push: { tasks: task._id } });
        }
      }

      return { synced: tasks.length };
    } catch (error) {
      console.error('ClickUp sync error:', error.message);
      return null;
    }
  }

  async createTask(clickupListId, taskData) {
    try {
      const { data } = await this.api.post(`/list/${clickupListId}/task`, {
        name: taskData.title,
        description: taskData.description,
        due_date: taskData.deadline ? new Date(taskData.deadline).getTime().toString() : undefined,
        priority: mapPriority(taskData.priority),
      });
      return data;
    } catch (error) {
      console.error('ClickUp create task error:', error.message);
      return null;
    }
  }
}

function mapClickUpStatus(status) {
  const map = {
    'to do': 'todo',
    'in progress': 'in_progress',
    'in review': 'review',
    'complete': 'done',
    'closed': 'done',
  };
  return map[status?.toLowerCase()] || 'todo';
}

function mapPriority(priority) {
  const map = { low: 4, medium: 3, high: 2, urgent: 1 };
  return map[priority] || 3;
}

function mapPriorityFromClickUp(priority) {
  if (!priority || !priority.priority) return 'medium';
  const map = { 1: 'urgent', 2: 'high', 3: 'medium', 4: 'low' };
  return map[priority.priority] || 'medium';
}

ClickUpService.prototype.sync = async function() {
  try {
    const Project = require('../models/Project');
    const projects = await Project.find({ clickupListId: { $ne: '' }, isActive: true });
    let total = { projects: 0, synced: 0 };
    for (const p of projects) {
      const result = await this.syncTasks(p.clickupListId, p._id);
      if (result) {
        total.projects++;
        total.synced += result.synced;
      }
    }
    return total;
  } catch (error) {
    console.error('ClickUp auto-sync error:', error.message);
    return null;
  }
};

module.exports = new ClickUpService();
