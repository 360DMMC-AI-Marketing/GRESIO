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

  _getApi(apiKey) {
    if (apiKey) {
      return axios.create({
        baseURL: 'https://api.clickup.com/api/v2',
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
        },
      });
    }
    return this.api;
  }

  // ---- HIERARCHY BROWSING ---- //

  async getAuthorizedTeams(apiKey) {
    const api = this._getApi(apiKey);
    const { data } = await api.get('/team');
    return data.teams || [];
  }

  async getTeamSpaces(teamId, apiKey) {
    const api = this._getApi(apiKey);
    const { data } = await api.get(`/team/${teamId}/space`);
    return data.spaces || [];
  }

  async getSpaceFolders(spaceId, apiKey) {
    const api = this._getApi(apiKey);
    const { data } = await api.get(`/space/${spaceId}/folder`);
    return data.folders || [];
  }

  async getFolderLists(folderId, apiKey) {
    const api = this._getApi(apiKey);
    const { data } = await api.get(`/folder/${folderId}/list`);
    return data.lists || [];
  }

  async getSpaceLists(spaceId, apiKey) {
    const api = this._getApi(apiKey);
    const { data } = await api.get(`/space/${spaceId}/list`);
    return data.lists || [];
  }

  async getListTasks(listId, opts = {}, apiKey) {
    const api = this._getApi(apiKey);
    const allTasks = [];
    let page = 0;
    let hasMore = true;
    while (hasMore) {
      const { data } = await api.get(`/list/${listId}/task`, {
        params: { include_closed: opts.includeClosed ?? true, subtasks: opts.subtasks ?? false, page },
      });
      const tasks = data.tasks || [];
      allTasks.push(...tasks);
      hasMore = tasks.length > 0 && (data.last_page === false || data.last_page === undefined || data.last_page === null);
      if (data.last_page === true) hasMore = false;
      page++;
    }
    return allTasks;
  }

  async getTask(taskId, apiKey) {
    const api = this._getApi(apiKey);
    const { data } = await api.get(`/task/${taskId}`);
    return data;
  }

  // ---- AI-POWERED IMPORT ---- //

  async analyzeForImport(selection) {
    const aiService = require('./aiService');
    return aiService.analyzeClickupForImport(selection);
  }

  async executeImportPlan(plan, userId, apiKey) {
    const User = require('../models/User');
    const Project = require('../models/Project');
    const domain = (await User.findById(userId))?.domain || 'unknown';
    const results = { projects: [], totalTasks: 0, errors: [] };

    for (const item of plan) {
      if (item.action === 'skip') continue;

      try {
        if (item.action === 'create_project') {
          const tasks = await this.getListTasks(item.clickupListId, { includeClosed: true, subtasks: false }, apiKey);

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
          let taskCount = 0;
          const assigneeIds = new Set();

          for (const t of tasks) {
            const taskType = item.taskTypes?.[t.id] || 'task';
            const taskStatus = item.statusMapping?.[t.status?.status] || mapClickUpStatus(t.status?.status);
            let assignee = null;
            if (t.assignees && t.assignees.length > 0) {
              for (const a of t.assignees) {
                let matchedUser = null;
                if (a.username) matchedUser = await User.findOne({ name: a.username });
                if (!matchedUser && a.email) matchedUser = await User.findOne({ email: a.email });
                if (matchedUser) {
                  assignee = matchedUser._id;
                  assigneeIds.add(matchedUser._id.toString());
                  break;
                }
              }
            }
            try {
              await Task.create({
                title: t.name,
                description: t.description || '',
                status: taskStatus,
                type: taskType,
                clickupTaskId: t.id,
                project: project._id,
                domain,
                assignee,
                priority: mapPriorityFromClickUp(t.priority),
                deadline: t.due_date ? new Date(parseInt(t.due_date)) : null,
              });
              taskCount++;
            } catch (e) {
              results.errors.push(`Task "${t.name}": ${e.message}`);
            }
          }

          if (assigneeIds.size > 0) {
            await Project.findByIdAndUpdate(project._id, { $addToSet: { members: { $each: [...assigneeIds] } } });
            await this._linkToDepartmentGroups(project._id, [...assigneeIds], domain);
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

  async syncTasks(listId, projectId, apiKey) {
    try {
      const tasks = await this.getListTasks(listId, { includeClosed: true, subtasks: false }, apiKey);
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

  // ---- CLEANUP previously imported ClickUp data ---- //

  async cleanupImport() {
    const Project = require('../models/Project');
    const Sprint = require('../models/Sprint');
    const Task = require('../models/Task');

    const deletedProjects = await Project.deleteMany({
      $or: [
        { clickupFolderId: { $ne: '' } },
        { clickupListId: { $ne: '' } }
      ]
    });
    const deletedSprints = await Sprint.deleteMany({ clickupListId: { $ne: '' } });
    const deletedTasks = await Task.deleteMany({ clickupTaskId: { $ne: '' } });

    return {
      deletedProjects: deletedProjects.deletedCount,
      deletedSprints: deletedSprints.deletedCount,
      deletedTasks: deletedTasks.deletedCount,
    };
  }

  // ---- LINK user to matching department groups in a project ---- //
  async _linkToDepartmentGroups(projectId, userIds, domain) {
    const TeamGroup = require('../models/TeamGroup');
    const ProjectMember = require('../models/ProjectMember');
    const User = require('../models/User');
    for (const uid of userIds) {
      const user = await User.findById(uid);
      if (!user || !user.department || user.department.length === 0) continue;
      for (const deptName of user.department) {
        const teamGroup = await TeamGroup.findOne({ project: projectId, name: deptName });
        if (teamGroup) {
          await ProjectMember.findOneAndUpdate(
            { project: projectId, user: uid },
            { project: projectId, domain, user: uid, projectRole: 'developer', teamGroup: teamGroup._id, status: 'active' },
            { upsert: true }
          );
        }
      }
    }
  }

  // ---- IMPORT ALL (deterministic, no AI) ---- //

  async importAll(userId, filters = {}) {
    const User = require('../models/User');
    const Project = require('../models/Project');
    const Sprint = require('../models/Sprint');
    const Task = require('../models/Task');

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    const domain = user.domain || 'unknown';
    const apiKey = filters.apiKey;

    const result = { projects: 0, sprints: 0, tasks: 0, skipped: { projects: 0, sprints: 0, tasks: 0 }, errors: [] };

    let teams;
    try {
      teams = await this.getAuthorizedTeams(apiKey);
    } catch (e) {
      result.errors.push(`Failed to fetch workspaces: ${e.message}`);
      return result;
    }
    if (filters.teamId) teams = teams.filter(t => t.id === filters.teamId);

    for (const team of teams) {
      let spaces;
      try {
        spaces = await this.getTeamSpaces(team.id, apiKey);
      } catch (e) {
        result.errors.push(`Team "${team.name}": failed to fetch spaces - ${e.message}`);
        continue;
      }
      if (filters.spaceId) spaces = spaces.filter(s => s.id === filters.spaceId);

      for (const space of spaces) {
        let folders;
        try {
          folders = await this.getSpaceFolders(space.id, apiKey);
        } catch (e) {
          result.errors.push(`Space "${space.name}": failed to fetch folders - ${e.message}`);
          continue;
        }

        for (const folder of folders) {
          try {
            const existingProject = await Project.findOne({ clickupFolderId: folder.id });
            if (existingProject) {
              result.skipped.projects++;
              continue;
            }

            const lists = await this.getFolderLists(folder.id, apiKey);
            const allListTasks = [];
            let listError = null;
            for (const list of lists) {
              try {
                const tasks = await this.getListTasks(list.id, { includeClosed: true, subtasks: true }, apiKey);
                allListTasks.push({ list, tasks });
              } catch (e) {
                listError = e;
                result.errors.push(`Folder "${folder.name}" list "${list.name}": ${e.message}`);
              }
            }

            if (listError && allListTasks.length === 0) {
              result.errors.push(`Folder "${folder.name}": all lists failed, skipping folder`);
              continue;
            }

            const project = await Project.create({
              name: folder.name,
              description: folder.description || '',
              projectType: 'software',
              domain,
              isActive: true,
              members: [userId],
              clickupFolderId: folder.id,
            });
            result.projects++;

            for (const { list, tasks } of allListTasks) {
              try {
                const existingSprint = await Sprint.findOne({ clickupListId: list.id });
                if (existingSprint) {
                  result.skipped.sprints++;
                  continue;
                }

                let startDate = new Date();
                let endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

                if (tasks.length > 0) {
                  const dueDates = tasks
                    .map(t => t.due_date ? new Date(parseInt(t.due_date)) : null)
                    .filter(d => d && !isNaN(d.getTime()));
                  if (dueDates.length > 0) {
                    startDate = new Date(Math.min(...dueDates.map(d => d.getTime())));
                    startDate.setDate(startDate.getDate() - 1);
                    endDate = new Date(Math.max(...dueDates.map(d => d.getTime())));
                  }
                }

                const sprint = await Sprint.create({
                  name: list.name,
                  project: project._id,
                  startDate,
                  endDate,
                  status: 'planning',
                  createdBy: userId,
                  clickupListId: list.id,
                });
                result.sprints++;
                const sprintAssigneeIds = new Set();

                for (const t of tasks) {
                  const existingTask = await Task.findOne({ clickupTaskId: t.id });
                  if (existingTask) {
                    result.skipped.tasks++;
                    continue;
                  }

                  let assigneeId = null;
                  if (t.assignees && t.assignees.length > 0) {
                    for (const a of t.assignees) {
                      let matchedUser = null;
                      if (a.username) matchedUser = await User.findOne({ name: a.username });
                      if (!matchedUser && a.email) matchedUser = await User.findOne({ email: a.email });
                      if (matchedUser) {
                        assigneeId = matchedUser._id;
                        sprintAssigneeIds.add(matchedUser._id.toString());
                        break;
                      }
                    }
                  }

                  try {
                    const task = await Task.create({
                      title: t.name,
                      description: t.description || '',
                      status: mapClickUpStatus(t.status?.status),
                      priority: mapPriorityFromClickUp(t.priority),
                      project: project._id,
                      sprint: sprint._id,
                      domain,
                      clickupTaskId: t.id,
                      assignee: assigneeId,
                      deadline: t.due_date ? new Date(parseInt(t.due_date)) : null,
                    });

                    await Sprint.findByIdAndUpdate(sprint._id, { $push: { tasks: task._id } });
                    await Project.findByIdAndUpdate(project._id, { $push: { tasks: task._id } });
                    result.tasks++;
                  } catch (e) {
                    result.errors.push(`Task "${t.name}": ${e.message}`);
                  }
                }

                if (sprintAssigneeIds.size > 0) {
                  await Project.findByIdAndUpdate(project._id, { $addToSet: { members: { $each: [...sprintAssigneeIds] } } });
                  await this._linkToDepartmentGroups(project._id, [...sprintAssigneeIds], domain);
                }
              } catch (e) {
                result.errors.push(`List "${list.name}" in folder "${folder.name}": ${e.message}`);
              }
            }
          } catch (e) {
            result.errors.push(`Folder "${folder.name}": ${e.message}`);
          }
        }

        // Also process folderless lists (lists attached directly to a space)
        const folderlessLists = await this.getSpaceLists(space.id, apiKey);
        for (const list of folderlessLists) {
          try {
            const existingProject = await Project.findOne({ clickupListId: list.id });
            if (existingProject) {
              result.skipped.projects++;
              continue;
            }

            const tasks = await this.getListTasks(list.id, { includeClosed: true, subtasks: true }, apiKey);

            const project = await Project.create({
              name: list.name,
              description: list.description || '',
              projectType: 'software',
              domain,
              isActive: true,
              members: [userId],
              clickupListId: list.id,
            });
            result.projects++;

            let startDate = new Date();
            let endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

            if (tasks.length > 0) {
              const dueDates = tasks
                .map(t => t.due_date ? new Date(parseInt(t.due_date)) : null)
                .filter(d => d && !isNaN(d.getTime()));
              if (dueDates.length > 0) {
                startDate = new Date(Math.min(...dueDates.map(d => d.getTime())));
                startDate.setDate(startDate.getDate() - 1);
                endDate = new Date(Math.max(...dueDates.map(d => d.getTime())));
              }
            }

            const sprint = await Sprint.create({
              name: list.name,
              project: project._id,
              startDate,
              endDate,
              status: 'planning',
              createdBy: userId,
              clickupListId: list.id,
            });
            result.sprints++;
            const sprintAssigneeIds = new Set();

            for (const t of tasks) {
              const existingTask = await Task.findOne({ clickupTaskId: t.id });
              if (existingTask) {
                result.skipped.tasks++;
                continue;
              }

              let assigneeId = null;
              if (t.assignees && t.assignees.length > 0) {
                for (const a of t.assignees) {
                  let matchedUser = null;
                  if (a.username) matchedUser = await User.findOne({ name: a.username });
                  if (!matchedUser && a.email) matchedUser = await User.findOne({ email: a.email });
                  if (matchedUser) {
                    assigneeId = matchedUser._id;
                    sprintAssigneeIds.add(matchedUser._id.toString());
                    break;
                  }
                }
              }

              try {
                const task = await Task.create({
                  title: t.name,
                  description: t.description || '',
                  status: mapClickUpStatus(t.status?.status),
                  priority: mapPriorityFromClickUp(t.priority),
                  project: project._id,
                  sprint: sprint._id,
                  domain,
                  clickupTaskId: t.id,
                  assignee: assigneeId,
                  deadline: t.due_date ? new Date(parseInt(t.due_date)) : null,
                });

                await Sprint.findByIdAndUpdate(sprint._id, { $push: { tasks: task._id } });
                await Project.findByIdAndUpdate(project._id, { $push: { tasks: task._id } });
                result.tasks++;
              } catch (e) {
                result.errors.push(`Task "${t.name}": ${e.message}`);
              }
            }

            if (sprintAssigneeIds.size > 0) {
              await Project.findByIdAndUpdate(project._id, { $addToSet: { members: { $each: [...sprintAssigneeIds] } } });
              await this._linkToDepartmentGroups(project._id, [...sprintAssigneeIds], domain);
            }
          } catch (e) {
            result.errors.push(`Folderless list "${list.name}": ${e.message}`);
          }
        }
      }
    }

    return result;
  }

  async createTask(clickupListId, taskData, apiKey) {
    const api = this._getApi(apiKey);
    try {
      const { data } = await api.post(`/list/${clickupListId}/task`, {
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
