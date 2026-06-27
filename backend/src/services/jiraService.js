const axios = require('axios');

class JiraService {
  _getApi(baseUrl, email, apiToken) {
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
    return axios.create({
      baseURL: baseUrl.replace(/\/$/, '') + '/rest/api/3',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async getProjects(baseUrl, email, apiToken) {
    const api = this._getApi(baseUrl, email, apiToken);
    const { data } = await api.get('/project/search', { params: { maxResults: 200 } });
    return data.values || [];
  }

  async getProjectDetail(projectKey, baseUrl, email, apiToken) {
    const api = this._getApi(baseUrl, email, apiToken);
    const { data } = await api.get(`/project/${projectKey}`);
    return data;
  }

  async getEpics(projectKey, baseUrl, email, apiToken) {
    const api = this._getApi(baseUrl, email, apiToken);
    const all = [];
    let startAt = 0;
    while (true) {
      const { data } = await api.get('/search', {
        params: {
          jql: `project=${projectKey} AND issuetype=Epic ORDER BY created ASC`,
          maxResults: 100,
          startAt,
          fields: 'summary,description,customfield_10011,status',
        },
      });
      all.push(...(data.issues || []));
      if (data.issues.length < 100) break;
      startAt += 100;
    }
    return all;
  }

  async getIssuesByEpic(projectKey, epicId, baseUrl, email, apiToken) {
    const api = this._getApi(baseUrl, email, apiToken);
    const all = [];
    let startAt = 0;
    while (true) {
      const { data } = await api.get('/search', {
        params: {
          jql: epicId
            ? `project=${projectKey} AND "Epic Link"=${epicId} ORDER BY created ASC`
            : `project=${projectKey} AND issuetype!=Epic ORDER BY created ASC`,
          maxResults: 100,
          startAt,
          fields: 'summary,description,assignee,duedate,status,priority,issuetype,created,parent',
        },
      });
      all.push(...(data.issues || []));
      if (data.issues.length < 100) break;
      startAt += 100;
    }
    return all;
  }

  async getUsers(projectKey, baseUrl, email, apiToken) {
    const api = this._getApi(baseUrl, email, apiToken);
    try {
      const { data } = await api.get('/user/assignable/search', { params: { project: projectKey, maxResults: 200 } });
      return data || [];
    } catch {
      return [];
    }
  }

  async importProject(projectKey, userId, domain, baseUrl, email, apiToken) {
    const User = require('../models/User');
    const Project = require('../models/Project');
    const Sprint = require('../models/Sprint');
    const Task = require('../models/Task');

    const projectDetail = await this.getProjectDetail(projectKey, baseUrl, email, apiToken);
    const epics = await this.getEpics(projectKey, baseUrl, email, apiToken);

    const project = await Project.create({
      name: `[Jira] ${projectDetail.name}`,
      description: projectDetail.description || '',
      projectType: 'software',
      phase: 'planning',
      domain,
      isActive: true,
      members: [userId],
    });

    let totalTasks = 0;
    const assigneeIds = new Set();

    if (epics.length > 0) {
      for (const epic of epics) {
        const epicName = epic.fields?.summary || 'Unnamed Epic';
        const issues = await this.getIssuesByEpic(projectKey, epic.key, baseUrl, email, apiToken);

        const sprint = await Sprint.create({
          name: epicName,
          project: project._id,
          startDate: new Date(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          status: 'planning',
          createdBy: userId,
        });

        for (const issue of issues) {
          const task = await this._createTask(issue, project._id, sprint._id, userId, domain, baseUrl, email, apiToken);
          if (task) {
            if (task.assignee) assigneeIds.add(task.assignee.toString());
            totalTasks++;
          }
        }
      }
    } else {
      const issues = await this.getIssuesByEpic(projectKey, null, baseUrl, email, apiToken);

      const sprint = await Sprint.create({
        name: `${projectDetail.name} - Sprint 1`,
        project: project._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'planning',
        createdBy: userId,
      });

      for (const issue of issues) {
        const task = await this._createTask(issue, project._id, sprint._id, userId, domain, baseUrl, email, apiToken);
        if (task) {
          if (task.assignee) assigneeIds.add(task.assignee.toString());
          totalTasks++;
        }
      }
    }

    if (assigneeIds.size > 0) {
      await Project.findByIdAndUpdate(project._id, { $addToSet: { members: { $each: [...assigneeIds].filter(Boolean) } } });
    }

    return { id: project._id, name: project.name, taskCount: totalTasks };
  }

  _mapIssueType(jiraType) {
    if (!jiraType) return 'task';
    const name = (jiraType.name || jiraType || '').toLowerCase();
    if (name === 'bug' || name === 'defect') return 'bug';
    if (name === 'test' || name === 'test case') return 'test_case';
    if (name === 'epic') return 'epic';
    if (name === 'story' || name === 'user story') return 'story';
    if (name === 'task' || name === 'subtask') return 'task';
    return 'task';
  }

  _mapStatus(jiraStatus) {
    if (!jiraStatus) return 'todo';
    const name = (jiraStatus.name || jiraStatus || '').toLowerCase();
    if (name === 'done' || name === 'closed' || name === 'resolved') return 'done';
    if (name === 'in progress' || name === 'in_progress') return 'in_progress';
    if (name === 'review' || name === 'in review' || name === 'code review') return 'review';
    if (name === 'to do' || name === 'todo' || name === 'backlog' || name === 'open') return 'todo';
    if (name === 'blocked' || name === 'block') return 'delayed';
    return 'todo';
  }

  _mapPriority(jiraPriority) {
    if (!jiraPriority) return 'medium';
    const name = (jiraPriority.name || jiraPriority || '').toLowerCase();
    if (name === 'highest' || name === 'critical' || name === 'blocker') return 'urgent';
    if (name === 'high') return 'high';
    if (name === 'medium' || name === 'major') return 'medium';
    if (name === 'low' || name === 'lowest' || name === 'minor' || name === 'trivial') return 'low';
    return 'medium';
  }

  async _createTask(issue, projectId, sprintId, userId, domain, baseUrl, email, apiToken) {
    const Task = require('../models/Task');
    const TestCase = require('../models/TestCase');
    const Sprint = require('../models/Sprint');
    const Project = require('../models/Project');
    const User = require('../models/User');

    const fields = issue.fields || {};
    let assignee = null;
    if (fields.assignee?.emailAddress) {
      const user = await User.findOne({ email: fields.assignee.emailAddress });
      if (user) assignee = user._id;
    } else if (fields.assignee?.displayName) {
      const user = await User.findOne({ name: fields.assignee.displayName });
      if (user) assignee = user._id;
    }

    const taskType = this._mapIssueType(fields.issuetype);
    const deadline = fields.duedate ? new Date(fields.duedate) : null;

    if (taskType === 'test_case' || taskType === 'test') {
      try {
        const tc = await TestCase.create({
          title: fields.summary || 'Untitled',
          description: fields.description || '',
          status: this._mapStatus(fields.status),
          project: projectId,
          domain,
          createdBy: userId,
          priority: this._mapPriority(fields.priority),
        });
        return tc;
      } catch {
        return null;
      }
    }

    const createdTask = await Task.create({
      title: fields.summary || 'Untitled',
      description: fields.description || '',
      status: this._mapStatus(fields.status),
      type: taskType,
      project: projectId,
      sprint: sprintId,
      domain,
      assignee,
      priority: this._mapPriority(fields.priority),
      deadline,
    });

    await Sprint.findByIdAndUpdate(sprintId, { $push: { tasks: createdTask._id } });
    await Project.findByIdAndUpdate(projectId, { $push: { tasks: createdTask._id } });

    return createdTask;
  }
}

module.exports = new JiraService();
