const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const Project = require('../models/Project');
const CalendarEvent = require('../models/CalendarEvent');
const Activity = require('../models/Activity');
const User = require('../models/User');
const Company = require('../models/Company');
const Notification = require('../models/Notification');
const msGraph = require('../services/microsoftGraphService');

exports.getCalendarEvents = async (req, res, next) => {
  try {
    const { start, end, type, userId, projectId } = req.query;
    const domain = req.user.domain;
    const startDate = start ? new Date(start) : new Date(Date.now() - 90 * 86400000);
    const endDate = end ? new Date(end) : new Date(Date.now() + 90 * 86400000);

    const taskFilter = {
      domain,
      deadline: { $gte: startDate, $lte: endDate },
      isActive: true,
      ...(userId ? { assignee: userId } : {}),
      ...(projectId ? { project: projectId } : {}),
    };
    const sprintFilter = {
      ...(projectId ? { project: projectId } : {}),
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    };
    const projectFilter = {
      domain,
      ...(projectId ? { _id: projectId } : {}),
      deadline: { $gte: startDate, $lte: endDate },
    };
    const calendarFilter = {
      domain,
      date: { $gte: startDate, $lte: endDate },
      ...(userId ? { user: userId } : {}),
      ...(projectId ? { project: projectId } : {}),
    };
    const outlookFilter = {
      domain,
      type: 'outlook_calendar',
      createdAt: { $gte: startDate, $lte: endDate },
      ...(userId ? { user: userId } : {}),
    };

    const [tasks, sprints, projects, calendarEvents, outlookEvents, outlookUsers] = await Promise.all([
      Task.find(taskFilter).select('title deadline project assignee status priority').populate('project', 'name').populate('assignee', 'name').lean(),
      Sprint.find(sprintFilter).populate('project', 'name domain').lean(),
      Project.find(projectFilter).select('name deadline status phase').lean(),
      CalendarEvent.find(calendarFilter).populate('project', 'name').populate('user', 'name').lean(),
      Activity.find(outlookFilter).lean(),
      User.find({ domain }).select('_id name').lean(),
    ]);

    const userMap = {};
    outlookUsers.forEach(u => { userMap[u._id.toString()] = u.name; });

    const mappedTasks = tasks.map(t => ({
      _id: t._id,
      title: t.title,
      date: t.deadline,
      endDate: null,
      type: 'task',
      userId: t.assignee?._id || null,
      userName: t.assignee?.name || '',
      projectName: t.project?.name || '',
      projectId: t.project?._id || null,
      status: t.status,
      priority: t.priority,
      source: 'task',
      link: t.project?._id ? `/projects/${t.project._id}` : '/tasks',
    }));

    const mappedSprints = sprints
      .filter(s => s.project?.domain === domain)
      .map(s => ({
        _id: s._id,
        title: s.name,
        date: s.startDate,
        endDate: s.endDate,
        type: 'sprint',
        projectName: s.project?.name || '',
        projectId: s.project?._id || null,
        status: s.status,
        source: 'sprint',
        link: `/sprints`,
      }));

    const mappedProjects = projects.map(p => ({
      _id: p._id,
      title: p.name,
      date: p.deadline,
      endDate: null,
      type: 'project_deadline',
      projectName: p.name,
      projectId: p._id,
      status: p.status,
      phase: p.phase,
      source: 'project',
      link: `/projects/${p._id}`,
    }));

    const mappedCustom = calendarEvents.map(e => ({
      _id: e._id,
      title: e.title,
      date: e.date,
      endDate: e.endDate,
      type: e.type,
      userId: e.user?._id || null,
      userName: e.user?.name || '',
      projectName: e.project?.name || '',
      projectId: e.project?._id || null,
      description: e.description,
      link: e.link || null,
      source: 'custom',
    }));

    const mappedOutlook = outlookEvents.map(a => ({
      _id: a._id,
      title: a.metadata?.subject || a.description?.replace('Event: ', '') || 'Outlook Event',
      date: a.metadata?.start ? new Date(a.metadata.start) : a.createdAt,
      endDate: a.metadata?.end ? new Date(a.metadata.end) : null,
      type: 'event',
      userId: a.user?.toString() || null,
      userName: userMap[a.user?.toString()] || '',
      projectName: '',
      projectId: null,
      description: a.description || '',
      link: null,
      source: 'outlook',
    }));

    const all = [...mappedTasks, ...mappedSprints, ...mappedProjects, ...mappedCustom, ...mappedOutlook];
    all.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(all);
  } catch (error) {
    next(error);
  }
};

exports.createCalendarEvent = async (req, res, next) => {
  try {
    const { title, date, endDate, type, description, link, project } = req.body;
    const domain = req.user.domain;

    if (type === 'task') {
      const task = await Task.create({
        title,
        deadline: new Date(date),
        domain,
        project: project || undefined,
        createdBy: req.user._id,
        assignee: req.user._id,
        status: 'todo',
        scope: 'project',
      });
      if (project) {
        await Project.findByIdAndUpdate(project, { $push: { tasks: task._id } });
      }
      await Notification.create({
        user: req.user._id,
        domain,
        type: 'deadline_alert',
        title: `Calendar: Task created — ${title}`,
        message: `Task "${title}" created from calendar with deadline ${new Date(date).toLocaleDateString()}`,
        link: `/tasks`,
      });
      return res.status(201).json({ ...task.toObject(), source: 'task' });
    }

    const event = await CalendarEvent.create({
      domain, user: req.user._id, title, date: new Date(date),
      endDate: endDate ? new Date(endDate) : undefined,
      type, description, link: link || '', project: project || undefined,
    });

    if (syncToOutlook) {
      const [company, creator] = await Promise.all([
        Company.findOne({ domain }).lean(),
        User.findById(req.user._id).lean(),
      ]);
      if (company?.outlookTenantId && creator?.outlookEmail) {
        const creds = {
          tenantId: company.outlookTenantId,
          clientId: company.outlookClientId,
          clientSecret: company.getDecryptedOutlookSecret ? company.getDecryptedOutlookSecret() : company.outlookClientSecret,
        };
        const result = await msGraph.createOutlookCalendarEvent(
          creator.outlookEmail, title, new Date(date).toISOString(),
          endDate ? new Date(endDate).toISOString() : undefined,
          description || '', creds,
        );
        if (result.id) {
          event.outlookEventId = result.id;
          await event.save();
        }
      }
    }

    await Notification.create({
      user: req.user._id,
      domain,
      type: 'system',
      title: `Calendar: ${type} added — ${title}`,
      message: `"${title}" added to calendar for ${new Date(date).toLocaleDateString()}`,
      link: `/calendar`,
    });

    res.status(201).json({ ...event.toObject(), source: 'custom' });
  } catch (error) {
    next(error);
  }
};

exports.updateCalendarEvent = async (req, res, next) => {
  try {
    const { title, date, endDate, type, description, link, project } = req.body;
    const event = await CalendarEvent.findOneAndUpdate(
      { _id: req.params.id, domain: req.user.domain },
      { title, date, endDate, type, description, link, project },
      { new: true, runValidators: true }
    );
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (event.outlookEventId) {
      const [company, creator] = await Promise.all([
        Company.findOne({ domain: req.user.domain }).lean(),
        User.findById(req.user._id).lean(),
      ]);
      if (company?.outlookTenantId && creator?.outlookEmail) {
        const creds = {
          tenantId: company.outlookTenantId,
          clientId: company.outlookClientId,
          clientSecret: company.getDecryptedOutlookSecret ? company.getDecryptedOutlookSecret() : company.outlookClientSecret,
        };
        await msGraph.updateOutlookCalendarEvent(
          creator.outlookEmail, event.outlookEventId, title,
          new Date(date).toISOString(),
          endDate ? new Date(endDate).toISOString() : undefined,
          description || '', creds,
        );
      }
    }

    res.json(event);
  } catch (error) {
    next(error);
  }
};

exports.deleteCalendarEvent = async (req, res, next) => {
  try {
    const event = await CalendarEvent.findOneAndDelete({
      _id: req.params.id, domain: req.user.domain,
    });
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (event.outlookEventId) {
      const [company, creator] = await Promise.all([
        Company.findOne({ domain: req.user.domain }).lean(),
        User.findById(req.user._id).lean(),
      ]);
      if (company?.outlookTenantId && creator?.outlookEmail) {
        const creds = {
          tenantId: company.outlookTenantId,
          clientId: company.outlookClientId,
          clientSecret: company.getDecryptedOutlookSecret ? company.getDecryptedOutlookSecret() : company.outlookClientSecret,
        };
        await msGraph.deleteOutlookCalendarEvent(creator.outlookEmail, event.outlookEventId, creds);
      }
    }

    res.json({ message: 'Event deleted' });
  } catch (error) {
    next(error);
  }
};
