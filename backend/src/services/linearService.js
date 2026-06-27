const axios = require('axios');

class LinearService {
  _getApi(apiKey) {
    return axios.create({
      baseURL: 'https://api.linear.app/graphql',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async _query(apiKey, query, variables = {}) {
    const api = this._getApi(apiKey);
    const { data } = await api.post('', { query, variables });
    if (data.errors) throw new Error(data.errors[0]?.message || 'Linear API error');
    return data.data;
  }

  async getTeams(apiKey) {
    const q = `{ teams { nodes { id name key } } }`;
    const data = await this._query(apiKey, q);
    return data.teams?.nodes || [];
  }

  async getProjects(teamId, apiKey) {
    const q = `query($teamId: String!) { team(id: $teamId) { projects { nodes { id name description state startDate targetDate } } } }`;
    const data = await this._query(apiKey, q, { teamId });
    return data.team?.projects?.nodes || [];
  }

  async getIssuesForProject(projectId, apiKey) {
    const q = `query($projectId: String!) { project(id: $projectId) { issues { nodes { id title description priority dueDate completedAt createdAt assignee { id name email } state { name type } labels { nodes { name } } } } } }`;
    const data = await this._query(apiKey, q, { projectId });
    return data.project?.issues?.nodes || [];
  }

  async getUsers(teamId, apiKey) {
    const q = `query($teamId: String!) { team(id: $teamId) { members { nodes { id name email } } } }`;
    const data = await this._query(apiKey, q, { teamId });
    return data.team?.members?.nodes || [];
  }

  async importTeam(teamId, userId, domain, apiKey) {
    const User = require('../models/User');
    const Project = require('../models/Project');
    const Sprint = require('../models/Sprint');
    const Task = require('../models/Task');

    const team = await this._query(apiKey, `{ team(id: "${teamId}") { id name key } }`);
    const teamName = team.team?.name || 'Imported';
    const projects = await this.getProjects(teamId, apiKey);

    let totalTasks = 0;
    const results = [];

    for (const lp of projects) {
      const project = await Project.create({
        name: `[Linear] ${lp.name}`,
        description: lp.description || '',
        projectType: 'software',
        phase: 'planning',
        domain,
        isActive: true,
        members: [userId],
      });

      const issues = await this.getIssuesForProject(lp.id, apiKey);

      const sprint = await Sprint.create({
        name: `${lp.name} - Sprint`,
        project: project._id,
        startDate: lp.startDate ? new Date(lp.startDate) : new Date(),
        endDate: lp.targetDate ? new Date(lp.targetDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'planning',
        createdBy: userId,
      });

      let taskCount = 0;
      const assigneeIds = new Set();

      for (const issue of issues) {
        let assignee = null;
        if (issue.assignee?.email) {
          const user = await User.findOne({ email: issue.assignee.email });
          if (user) assignee = user._id;
        } else if (issue.assignee?.name) {
          const user = await User.findOne({ name: issue.assignee.name });
          if (user) assignee = user._id;
        }

        const createdTask = await Task.create({
          title: issue.title,
          description: issue.description || '',
          status: this._mapStatus(issue.state),
          type: 'task',
          project: project._id,
          sprint: sprint._id,
          domain,
          assignee,
          priority: this._mapPriority(issue.priority),
          deadline: issue.dueDate ? new Date(issue.dueDate) : null,
        });

        await Sprint.findByIdAndUpdate(sprint._id, { $push: { tasks: createdTask._id } });
        await Project.findByIdAndUpdate(project._id, { $push: { tasks: createdTask._id } });

        if (assignee) assigneeIds.add(assignee.toString());
        taskCount++;
        totalTasks++;
      }

      if (assigneeIds.size > 0) {
        await Project.findByIdAndUpdate(project._id, { $addToSet: { members: { $each: [...assigneeIds].filter(Boolean) } } });
      }

      results.push({ id: project._id, name: project.name, taskCount });
    }

    return { projects: results, totalTasks };
  }

  _mapStatus(state) {
    if (!state) return 'todo';
    const type = state.type || '';
    const name = (state.name || '').toLowerCase();
    if (type === 'completed' || type === 'canceled' || name === 'done' || name === 'closed') return 'done';
    if (type === 'started' || name === 'in progress' || name === 'started') return 'in_progress';
    if (type === 'review' || name === 'review' || name === 'in review') return 'review';
    if (name === 'backlog' || name === 'triage') return 'todo';
    return 'todo';
  }

  _mapPriority(priority) {
    if (priority == null) return 'medium';
    if (priority === 0) return 'low';
    if (priority === 1) return 'medium';
    if (priority === 2) return 'high';
    if (priority >= 3) return 'urgent';
    return 'medium';
  }
}

module.exports = new LinearService();
