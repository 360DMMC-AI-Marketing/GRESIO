const Company = require('../models/Company');
const User = require('../models/User');
const { enforceUserLimit, getCompanyUsage, getPlanLimit } = require('../config/planLimits');

exports.getCompanies = async (req, res, next) => {
  try {
    const companies = await Company.find({ domain: req.user.domain, isActive: true }).populate('createdBy', 'name');
    const enriched = await Promise.all(companies.map(async (c) => {
      const usage = await getCompanyUsage(c.domain);
      return { ...c.toObject(), usage };
    }));
    res.json(enriched);
  } catch (e) { next(e); }
};

exports.createCompany = async (req, res, next) => {
  try {
    const existing = await Company.findOne({ domain: req.body.domain?.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Domain already registered' });
    const company = await Company.create({ ...req.body, createdBy: req.user._id, domain: req.body.domain?.toLowerCase() });
    res.status(201).json(company);
  } catch (e) { next(e); }
};

exports.updateCompany = async (req, res, next) => {
  try {
    const company = await Company.findOneAndUpdate(
      { _id: req.params.id, domain: req.user.domain },
      req.body,
      { new: true }
    );
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.json(company);
  } catch (e) { next(e); }
};

const JOB_TITLE_ROLE_MAP = [
  { patterns: ['software engineer', 'software dev', 'developer', 'frontend', 'backend', 'full stack', 'web dev', 'engineer', 'programmer', 'devops', 'site reliability', 'engineering', 'software'], role: 'developer' },
  { patterns: ['qa', 'quality', 'test engineer', 'tester', 'automation'], role: 'qa_tester' },
  { patterns: ['project manager', 'program manager', 'project lead', 'scrum master', 'product manager'], role: 'project_manager' },
  { patterns: ['team lead', 'tech lead', 'engineering manager', 'dev manager', 'technical lead', 'lead engineer', 'lead dev'], role: 'team_lead' },
  { patterns: ['manager', 'director', 'head of'], role: 'manager' },
  { patterns: ['designer', 'ux', 'ui', 'product designer', 'graphic designer', 'visual designer', 'creative'], role: 'designer' },
  { patterns: ['business analyst', 'product owner', 'analyst', 'business'], role: 'business_analyst' },
  { patterns: ['intern'], role: 'intern' },
  { patterns: ['admin', 'ceo', 'cto', 'cfo', 'coo', 'vp', 'vice president', 'president', 'chief'], role: 'admin' },
];

const DEPT_ROLE_MAP = [
  { patterns: ['engineering', 'development', 'it', 'tech', 'product'], role: 'developer' },
  { patterns: ['quality', 'qa', 'test', 'testing'], role: 'qa_tester' },
  { patterns: ['design', 'ux', 'ui', 'creative'], role: 'designer' },
  { patterns: ['management', 'project', 'program'], role: 'project_manager' },
  { patterns: ['business', 'analytics', 'finance', 'marketing', 'sales'], role: 'business_analyst' },
  { patterns: ['admin', 'hr', 'human resources', 'operations', 'executive'], role: 'admin' },
];

function inferRoleFromJobTitle(jobTitle, department) {
  const title = (jobTitle || '').toLowerCase();
  const dept = (department || '').toLowerCase();
  for (const entry of JOB_TITLE_ROLE_MAP) {
    for (const p of entry.patterns) {
      if (title.includes(p)) return entry.role;
    }
  }
  for (const entry of DEPT_ROLE_MAP) {
    for (const p of entry.patterns) {
      if (dept.includes(p)) return entry.role;
    }
  }
  return 'developer';
}

const ROLE_TO_GROUP = {
  'Administration Team': ['admin', 'company_owner'],
  'Project Management Team': ['project_manager', 'team_leader', 'scrum_master'],
  'Development Team': ['frontend_developer', 'backend_developer', 'full_stack_developer', 'mobile_developer', 'devops_engineer'],
  'QA & Testing Team': ['qa_tester', 'automation_tester', 'qa_lead'],
  'Design Team': ['ui_designer', 'ux_designer', 'product_designer'],
  'Business Team': ['business_analyst', 'product_owner', 'business_developer'],
  'Interns': ['development_intern', 'qa_intern', 'design_intern', 'business_intern'],
};

const GROUP_BY_USER_ROLE = {
  admin: { groupName: 'Administration Team', projectRole: 'admin' },
  team_lead: { groupName: 'Project Management Team', projectRole: 'team_leader' },
  project_manager: { groupName: 'Project Management Team', projectRole: 'project_manager' },
  manager: { groupName: 'Project Management Team', projectRole: 'project_manager' },
  qa_tester: { groupName: 'QA & Testing Team', projectRole: 'qa_tester' },
  developer: { groupName: 'Development Team', projectRole: 'developer' },
  designer: { groupName: 'Design Team', projectRole: 'designer' },
  business_analyst: { groupName: 'Business Team', projectRole: 'business_analyst' },
  intern: { groupName: 'Interns', projectRole: 'intern' },
  other: { groupName: 'Development Team', projectRole: 'developer' },
};

async function assignUserToProjectGroups(user, companyDomain, invitedBy) {
  const Project = require('../models/Project');
  const TeamGroup = require('../models/TeamGroup');
  const ProjectMember = require('../models/ProjectMember');
  const mapping = GROUP_BY_USER_ROLE[user.role] || GROUP_BY_USER_ROLE.other;
  const projects = await Project.find({ domain: companyDomain });
  for (const project of projects) {
    const group = await TeamGroup.findOne({ project: project._id, name: mapping.groupName });
    const exists = await ProjectMember.findOne({ project: project._id, user: user._id });
    if (!exists) {
      await ProjectMember.create({
        project: project._id,
        domain: companyDomain,
        user: user._id,
        email: user.email,
        projectRole: mapping.projectRole,
        teamGroup: group?._id || null,
        status: 'active',
        invitedBy,
        invitedAt: new Date(),
        acceptedAt: new Date(),
      });
    }
  }
}

exports.importCompanyUsers = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    const microsoftGraphService = require('../services/microsoftGraphService');
    const crypto = require('crypto');
    const env = require('../config/env');
    const client = await microsoftGraphService.getClient();
    if (!client) return res.status(503).json({ message: 'Microsoft Graph not connected' });
    const { data } = await client.get('/users', {
      params: { $filter: `endswith(mail,'@${company.domain}')`, $select: 'displayName,mail,id,jobTitle,department', $top: 999 }
    });
    const graphUsers = data.value || [];
    const planLimit = getPlanLimit(company.plan, 'users');
    const currentActive = await User.countDocuments({ domain: company.domain, isActive: true });
    const adminUser = await User.findById(req.user._id);
    let imported = 0, skipped = 0;
    const newUsers = [];
    for (const gu of graphUsers) {
      if (!gu.mail) { skipped++; continue; }
      const existing = await User.findOne({ outlookEmail: gu.mail.toLowerCase() });
      if (existing) { skipped++; continue; }
      if (planLimit !== Infinity && (currentActive + imported) >= planLimit) {
        skipped++;
        continue;
      }
      const userRole = inferRoleFromJobTitle(gu.jobTitle, gu.department);
      const tempPassword = crypto.randomBytes(8).toString('hex') + 'Aa1!';
      const created = await User.create({
        name: gu.displayName || gu.mail.split('@')[0],
        email: gu.mail.toLowerCase(),
        password: tempPassword,
        role: userRole,
        outlookEmail: gu.mail.toLowerCase(),
        teamsId: gu.id || '',
        domain: company.domain,
        isActive: true,
      });
      await assignUserToProjectGroups(created, company.domain, adminUser?._id || req.user._id);
      newUsers.push({ user: created, tempPassword });
      imported++;
    }
    if (newUsers.length > 0) {
      const { sendEmail } = require('../services/emailService');
      for (const { user: u, tempPassword } of newUsers) {
        try {
          await sendEmail({
            to: u.email,
            senderEmail: adminUser?.outlookEmail || req.user.email,
            subject: 'You have been added to GRESIO',
            html: `<p>Hi ${u.name},</p><p>You have been added to GRESIO for <strong>${company.name}</strong> in the <strong>${u.role}</strong> role.</p><p>Login: ${env.FRONTEND_URL}<br>Email: ${u.email}<br>Temporary password: <strong>${tempPassword}</strong></p>`,
          });
        } catch (e) { console.error(`Email failed for ${u.email}:`, e.message); }
      }
    }
    res.json({ imported, skipped, total: graphUsers.length, planLimitReached: planLimit !== Infinity && (currentActive + imported) >= planLimit });
  } catch (e) { next(e); }
};

exports.addWikiDepartment = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Department name is required' });
    let company = await Company.findById(req.params.id);
    if (!company) company = await Company.findOne({ domain: req.user.domain });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    if (company.domain !== req.user.domain) return res.status(403).json({ message: 'Access denied' });
    if (company.wikiDepartments.includes(name.trim())) {
      return res.status(400).json({ message: 'Department already exists' });
    }
    company.wikiDepartments.push(name.trim());
    await company.save();
    res.json(company);
  } catch (e) { next(e); }
};

exports.updatePlan = async (req, res, next) => {
  try {
    const { plan } = req.body;
    const validPlans = ['starter', 'team', 'enterprise'];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ message: `Invalid plan. Must be one of: ${validPlans.join(', ')}` });
    }
    const company = await Company.findByIdAndUpdate(req.params.id, { plan }, { new: true });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    const usage = await getCompanyUsage(company.domain);
    res.json({ ...company.toObject(), usage });
  } catch (e) { next(e); }
};

exports.getCompanyById = async (req, res, next) => {
  try {
    const company = await Company.findOne({ _id: req.params.id, domain: req.user.domain }).populate('createdBy', 'name');
    if (!company) return res.status(404).json({ message: 'Company not found' });
    const usage = await getCompanyUsage(company.domain);
    res.json({ ...company.toObject(), usage });
  } catch (e) { next(e); }
};
