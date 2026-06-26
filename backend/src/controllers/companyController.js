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

exports.importCompanyUsers = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    // Use domain from request body, or fall back to company domain
    const importDomain = (req.body?.domain || company.domain || '').toLowerCase().replace(/^@/, '');
    if (!importDomain) return res.status(400).json({ message: 'Domain is required' });

    const microsoftGraphService = require('../services/microsoftGraphService');
    const crypto = require('crypto');
    const env = require('../config/env');

    // Check credentials are actually configured
    const creds = company.outlookTenantId ? {
      tenantId: company.outlookTenantId,
      clientId: company.outlookClientId,
      clientSecret: company.getDecryptedOutlookSecret(),
    } : null;

    const hasGlobalCreds = env.MICROSOFT_TENANT_ID && env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET;
    const hasCompanyCreds = !!(creds?.tenantId && creds?.clientId && creds?.clientSecret);

    if (!hasGlobalCreds && !hasCompanyCreds) {
      return res.status(503).json({
        message: 'Microsoft Graph not configured. Set MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, and MICROSOFT_CLIENT_SECRET in your .env file, or save Outlook credentials in Company settings.',
      });
    }

    const client = await microsoftGraphService.getClient(creds?.tenantId, creds?.clientId, creds?.clientSecret);
    if (!client) return res.status(503).json({
      message: 'Microsoft Graph authentication failed. Check your Azure AD credentials are correct and the app has User.Read.All permission.',
    });

    // Try mail filter first, fall back to userPrincipalName
    let graphUsers = [];
    const queryOpts = { $top: 999, $select: 'displayName,mail,userPrincipalName,id,jobTitle,department' };
    const eventualHeader = { headers: { ConsistencyLevel: 'eventual' } };

    // Try the company domain on mail
    try {
      const response = await client.get('/users', {
        ...eventualHeader,
        params: { ...queryOpts, $filter: `endswith(mail,'@${importDomain}')` }
      });
      graphUsers = response.data?.value || [];
    } catch (e) {
      console.error('Graph users query (mail) failed:', e.message);
    }

    // Fallback: try company domain on userPrincipalName
    if (graphUsers.length === 0) {
      try {
        const response = await client.get('/users', {
          ...eventualHeader,
          params: { ...queryOpts, $filter: `endswith(userPrincipalName,'@${importDomain}')` }
        });
        graphUsers = response.data?.value || [];
      } catch (e) {
        console.error('Graph users query (UPN) failed:', e.message);
      }
    }

    // Fallback: try onmicrosoft.com variant of the domain
    if (graphUsers.length === 0 && !importDomain.endsWith('.onmicrosoft.com')) {
      const onMicrosoftDomain = `${importDomain.split('.')[0].toUpperCase()}.onmicrosoft.com`;
      try {
        const response = await client.get('/users', {
          ...eventualHeader,
          params: { ...queryOpts, $filter: `endswith(mail,'@${onMicrosoftDomain}')` }
        });
        graphUsers = response.data?.value || [];
      } catch (e) {
        console.error('Graph users query (onmicrosoft mail) failed:', e.message);
      }
    }

    // Fallback: onmicrosoft.com on userPrincipalName
    if (graphUsers.length === 0 && !importDomain.endsWith('.onmicrosoft.com')) {
      const onMicrosoftDomain = `${importDomain.split('.')[0].toUpperCase()}.onmicrosoft.com`;
      try {
        const response = await client.get('/users', {
          ...eventualHeader,
          params: { ...queryOpts, $filter: `endswith(userPrincipalName,'@${onMicrosoftDomain}')` }
        });
        graphUsers = response.data?.value || [];
      } catch (e) {
        console.error('Graph users query (onmicrosoft UPN) failed:', e.message);
      }
    }

    // Last resort: get all users and filter client-side by domain
    if (graphUsers.length === 0) {
      try {
        const response = await client.get('/users', {
          ...eventualHeader,
          params: { ...queryOpts, $top: 999 }
        });
        graphUsers = (response.data?.value || []).filter(u =>
          (u.mail || u.userPrincipalName || '').toLowerCase().endsWith(`@${company.domain.toLowerCase()}`)
        );
        if (graphUsers.length > 0) {
          console.log(`Found ${graphUsers.length} users via client-side filter for @${company.domain}`);
        }
      } catch (e) {
        console.error('Graph users query (no filter) failed:', e.message);
      }
    }

    // Filter out service accounts (only keep real people)
    const SERVICE_KEYWORDS = [
      'booking', 'appointment', 'reservation', 'signup', 'register',
      'n8n', 'ai', 'bot', 'helpdesk', 'support', 'mailbox',
      'firebase', 'twilio', 'hubspot', 'supabase', 'claude', 'elevenlabs',
      'newsletter', 'careers', 'contact', 'esign', 'esignature',
      'devops', 'github', 'instagram', 'linkedin',
      'freshstock', 'uscis', 'internship', 'marketing', 'order',
      'cartesia', 'gusto', 'copy', 'figma',
      'vpn', 'service', 'system', 'noreply', 'nobody', 'guest',
      'alert', 'notification', 'digest', 'report', 'analytics',
      'kimi', 'chatgpt', 'openai', 'anthropic', 'claude',
      'test', 'demo', 'sample', 'temp', 'temporary',
      'scanner', 'printer', 'fax', 'scanner',
      'zoom', 'teams', 'slack', 'discord', 'webex',
      'mailer', 'sendgrid', 'postmark', 'mailgun', 'ses',
      'hostmaster', 'postmaster', 'webmaster', 'abuse',
    ];
    const isServiceAccount = (gu) => {
      const name = (gu.displayName || '').toLowerCase().trim();
      const localPart = (gu.mail || gu.userPrincipalName || '').toLowerCase().split('@')[0];
      const combined = `${name} ${localPart}`;
      // Normalize: remove hyphens, underscores, dots for keyword matching
      const normalized = combined.replace(/[-_.]/g, '');
      // 1) Keyword match anywhere in name or email local part
      const keywordMatch = SERVICE_KEYWORDS.some(k => normalized.includes(k));
      if (keywordMatch) {
        console.log(`Filtered by keyword: ${gu.displayName || gu.mail || gu.userPrincipalName}`);
        return true;
      }
      // 2) Single-word display names (no space) → service account
      const nameWords = name.split(/\s+/).filter(Boolean);
      if (nameWords.length < 2) {
        console.log(`Filtered by single-word name: ${gu.displayName || gu.mail || gu.userPrincipalName}`);
        return true;
      }
      // 3) Email local part is all numbers or UUID-like (e.g. "a1b2c3d4") → service
      if (/^[a-f0-9-]{8,}$/i.test(localPart.replace(/[-_.]/g, ''))) {
        console.log(`Filtered by UUID-like email: ${gu.displayName || gu.mail || gu.userPrincipalName}`);
        return true;
      }
      return false;
    };
    graphUsers = graphUsers.filter(gu => !isServiceAccount(gu));

    const planLimit = getPlanLimit(company.plan, 'users');
    const currentActive = await User.countDocuments({ domain: company.domain, isActive: true });
    const adminUser = await User.findById(req.user._id);
    let imported = 0, skipped = 0;
    const newUsers = [];
    const allEmails = graphUsers.map(gu => (gu.mail || gu.userPrincipalName || '').toLowerCase()).filter(Boolean);
    const existingUsers = allEmails.length > 0 ? await User.find({ $or: [{ outlookEmail: { $in: allEmails } }, { email: { $in: allEmails } }] }).lean() : [];
    const existingByEmail = new Map();
    for (const u of existingUsers) {
      if (u.email) existingByEmail.set(u.email.toLowerCase(), u);
      if (u.outlookEmail) existingByEmail.set(u.outlookEmail.toLowerCase(), u);
    }
    for (const gu of graphUsers) {
      const email = (gu.mail || gu.userPrincipalName || '').toLowerCase();
      if (!email) { skipped++; continue; }
      const existing = existingByEmail.get(email);
      const userRole = inferRoleFromJobTitle(gu.jobTitle, gu.department);
      if (existing) {
        let updated = false;
        if (userRole !== 'developer' && existing.role !== userRole) {
          existing.role = userRole;
          updated = true;
        }
        if (!existing.outlookEmail && email.includes('@')) {
          existing.outlookEmail = email;
          updated = true;
        }
        if (updated) {
          await User.findByIdAndUpdate(existing._id, { role: existing.role, outlookEmail: existing.outlookEmail });
        }
        skipped++;
        continue;
      }
      if (planLimit !== Infinity && (currentActive + imported) >= planLimit) {
        skipped++;
        continue;
      }
      const tempPassword = crypto.randomBytes(8).toString('hex') + 'Aa1!';
      const deptFromRole = GROUP_BY_USER_ROLE[userRole]?.groupName || 'Development Team';
      newUsers.push({
        name: gu.displayName || email.split('@')[0],
        email,
        password: tempPassword,
        role: userRole,
        department: [deptFromRole],
        outlookEmail: email,
        teamsId: gu.id || '',
        domain: company.domain,
        isActive: true,
        _tempPassword: tempPassword,
      });
      imported++;
    }
    if (newUsers.length > 0) {
      const createdDocs = await User.insertMany(newUsers.map(({ _tempPassword, ...u }) => u));
      const { sendEmail } = require('../services/emailService');
      for (let i = 0; i < createdDocs.length; i++) {
        try {
          await sendEmail({
            to: createdDocs[i].email,
            senderEmail: adminUser?.outlookEmail || req.user.email,
            subject: 'You have been added to GRESIO',
            html: `<p>Hi ${createdDocs[i].name},</p><p>You have been added to GRESIO for <strong>${company.name}</strong> in the <strong>${createdDocs[i].role}</strong> role.</p><p>Login: ${env.FRONTEND_URL}<br>Email: ${createdDocs[i].email}<br>Temporary password: <strong>${newUsers[i]._tempPassword}</strong></p>`,
          });
        } catch (e) { console.error(`Email failed for ${createdDocs[i].email}:`, e.message); }
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

exports.deleteCompany = async (req, res, next) => {
  try {
    const company = await Company.findOne({ _id: req.params.id, domain: req.user.domain });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    const Task = require('../models/Task');
    const Project = require('../models/Project');
    const Sprint = require('../models/Sprint');
    await User.deleteMany({ domain: company.domain });
    await Project.deleteMany({ domain: company.domain });
    await Sprint.deleteMany({ domain: company.domain });
    await Task.deleteMany({ domain: company.domain });
    await Company.deleteOne({ _id: company._id });
    res.json({ message: `Company "${company.domain}" and all associated data deleted` });
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
