const axios = require('axios');

class AsanaService {
  _getApi(accessToken) {
    return axios.create({
      baseURL: 'https://app.asana.com/api/1.0',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async getWorkspaces(accessToken) {
    const api = this._getApi(accessToken);
    const { data } = await api.get('/workspaces');
    return data.data || [];
  }

  async getProjects(workspaceId, accessToken) {
    const api = this._getApi(accessToken);
    const all = [];
    let offset;
    while (true) {
      const params = { workspace: workspaceId, limit: 100, ...(offset ? { offset } : {}) };
      const { data } = await api.get('/projects', { params });
      all.push(...(data.data || []));
      if (!data.next_page?.offset) break;
      offset = data.next_page.offset;
    }
    return all;
  }

  async getSections(projectId, accessToken) {
    const api = this._getApi(accessToken);
    const { data } = await api.get(`/projects/${projectId}/sections`);
    return data.data || [];
  }

  async getTasksForProject(projectId, accessToken) {
    const api = this._getApi(accessToken);
    const all = [];
    let offset;
    while (true) {
      const params = { project: projectId, limit: 100, opt_fields: 'name,notes,assignee,due_on,completed,created_at,tags' };
      if (offset) params.offset = offset;
      const { data } = await api.get('/tasks', { params });
      all.push(...(data.data || []));
      if (!data.next_page?.offset) break;
      offset = data.next_page.offset;
    }
    return all;
  }

  async getTasksForSection(sectionId, accessToken) {
    const api = this._getApi(accessToken);
    const all = [];
    let offset;
    while (true) {
      const params = { limit: 100, opt_fields: 'name,notes,assignee,due_on,completed,created_at,priority_color' };
      if (offset) params.offset = offset;
      const { data } = await api.get(`/sections/${sectionId}/tasks`, { params });
      all.push(...(data.data || []));
      if (!data.next_page?.offset) break;
      offset = data.next_page.offset;
    }
    return all;
  }

  async getUsers(workspaceId, accessToken) {
    const api = this._getApi(accessToken);
    const { data } = await api.get('/users', { params: { workspace: workspaceId } });
    return data.data || [];
  }

  async importProject(projectId, userId, domain, accessToken) {
    const User = require('../models/User');
    const Project = require('../models/Project');
    const Sprint = require('../models/Sprint');
    const Task = require('../models/Task');
    const Activity = require('../models/Activity');

    const api = this._getApi(accessToken);
    const { data: projectData } = await api.get(`/projects/${projectId}`, { params: { opt_fields: 'name,notes,due_on,created_at,members' } });
    const asanaProject = projectData.data;
    if (!asanaProject) throw new Error('Project not found');

    const sections = await this.getSections(projectId, accessToken);
    const projectTasks = await this.getTasksForProject(projectId, accessToken);

    const project = await Project.create({
      name: `[Asana] ${asanaProject.name}`,
      description: asanaProject.notes || '',
      projectType: 'software',
      phase: 'planning',
      domain,
      isActive: true,
      members: [userId],
    });

    let totalTasks = 0;
    const assigneeIds = new Set();

    if (sections.length > 0) {
      for (const section of sections) {
        const sectionTasks = projectTasks.filter(t => t.memberships?.some(m => m.section?.gid === section.gid));

        const sprint = await Sprint.create({
          name: section.name,
          project: project._id,
          startDate: new Date(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          status: 'planning',
          createdBy: userId,
        });

        for (const t of sectionTasks) {
          const task = await this._createTask(t, project._id, sprint._id, userId, domain, accessToken);
          if (task) {
            assigneeIds.add(task.assignee?.toString());
            totalTasks++;
          }
        }
      }
    } else {
      const sprint = await Sprint.create({
        name: `${asanaProject.name} - Sprint 1`,
        project: project._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'planning',
        createdBy: userId,
      });

      for (const t of projectTasks) {
        const task = await this._createTask(t, project._id, sprint._id, userId, domain, accessToken);
        if (task) {
          assigneeIds.add(task.assignee?.toString());
          totalTasks++;
        }
      }
    }

    if (assigneeIds.size > 0) {
      await Project.findByIdAndUpdate(project._id, { $addToSet: { members: { $each: [...assigneeIds].filter(Boolean) } } });
    }

    return { id: project._id, name: project.name, taskCount: totalTasks };
  }

  async _createTask(asanaTask, projectId, sprintId, userId, domain, accessToken) {
    const Task = require('../models/Task');
    const Sprint = require('../models/Sprint');
    const Project = require('../models/Project');
    const User = require('../models/User');

    let assignee = null;
    if (asanaTask.assignee?.gid) {
      try {
        const user = await User.findOne({ email: asanaTask.assignee.email });
        if (user) assignee = user._id;
      } catch {}
    }

    const createdTask = await Task.create({
      title: asanaTask.name || 'Untitled',
      description: asanaTask.notes || '',
      status: asanaTask.completed ? 'done' : 'todo',
      project: projectId,
      sprint: sprintId,
      domain,
      assignee,
      priority: asanaTask.due_on ? 'medium' : 'low',
      deadline: asanaTask.due_on ? new Date(asanaTask.due_on) : null,
    });

    await Sprint.findByIdAndUpdate(sprintId, { $push: { tasks: createdTask._id } });
    await Project.findByIdAndUpdate(projectId, { $push: { tasks: createdTask._id } });

    return createdTask;
  }
}

module.exports = new AsanaService();
