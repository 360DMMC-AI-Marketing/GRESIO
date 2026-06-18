const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const Template = require('../src/models/Template');
const User = require('../src/models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gresio';

const templates = [
  {
    name: 'Software Development — Full Stack',
    description: 'End-to-end software project from planning to deployment. Includes sprint planning, development sprints, QA, and launch phases.',
    projectType: 'software',
    category: 'development',
    tags: ['web', 'full-stack', 'agile', 'sprint'],
    featured: true,
    phases: [
      { name: 'Planning & Discovery', tasks: [
        { title: 'Define project scope & objectives', description: 'Document requirements and success criteria', estimatedHours: 8 },
        { title: 'Create technical architecture document', description: 'System design, database schema, API contracts', estimatedHours: 16 },
        { title: 'Set up development environment', description: 'Repo, CI/CD, staging servers', estimatedHours: 4 },
        { title: 'User story mapping', description: 'Break features into manageable stories', estimatedHours: 6 },
      ]},
      { name: 'Design', tasks: [
        { title: 'Wireframes & mockups', description: 'Low-fidelity screens for all user flows', estimatedHours: 16 },
        { title: 'Design system setup', description: 'Colors, typography, components library', estimatedHours: 8 },
        { title: 'High-fidelity prototypes', description: 'Interactive Figma prototype', estimatedHours: 16 },
        { title: 'Design review & iteration', description: 'Stakeholder feedback loop', estimatedHours: 6 },
      ]},
      { name: 'Sprint 1 — Core Features', tasks: [
        { title: 'Authentication system', description: 'Login, register, password reset, OAuth', estimatedHours: 20 },
        { title: 'Database models & migrations', description: 'All core schemas with indexes', estimatedHours: 12 },
        { title: 'API endpoints — CRUD', description: 'RESTful API for primary resources', estimatedHours: 24 },
        { title: 'Frontend core layout', description: 'Navigation, sidebar, responsive shell', estimatedHours: 16 },
      ]},
      { name: 'Sprint 2 — Feature Completion', tasks: [
        { title: 'Advanced features implementation', description: 'Search, filters, real-time updates', estimatedHours: 24 },
        { title: 'File upload & media handling', description: 'S3/Cloudinary integration', estimatedHours: 12 },
        { title: 'Dashboard & reporting', description: 'Charts, tables, export', estimatedHours: 20 },
        { title: 'Integration testing', description: 'API + E2E tests', estimatedHours: 12 },
      ]},
      { name: 'QA & Launch', tasks: [
        { title: 'Bug bash & regression testing', description: 'Full test suite pass', estimatedHours: 16 },
        { title: 'Performance optimization', description: 'Lighthouse audit, bundle size, caching', estimatedHours: 12 },
        { title: 'Security audit', description: 'OWASP checks, dependency scan', estimatedHours: 8 },
        { title: 'Deployment & launch', description: 'Production deploy, monitoring setup', estimatedHours: 8 },
      ]},
    ],
  },
  {
    name: 'Design Sprint — 5 Days',
    description: 'Google Ventures-inspired design sprint. Take a product from idea to validated prototype in one week.',
    projectType: 'design',
    category: 'sprint',
    tags: ['design-sprint', 'ux', 'prototyping', 'agile'],
    featured: true,
    phases: [
      { name: 'Day 1 — Understand', tasks: [
        { title: 'Define the challenge', description: 'Long-term goal, sprint questions, success metrics', estimatedHours: 2 },
        { title: 'Expert interviews', description: 'Talk to stakeholders and users', estimatedHours: 3 },
        { title: 'Customer journey map', description: 'Map current experience and pain points', estimatedHours: 2 },
        { title: 'How Might We notes', description: 'Reframe problems as opportunities', estimatedHours: 1 },
      ]},
      { name: 'Day 2 — Diverge', tasks: [
        { title: 'Lightning demos', description: 'Review existing solutions for inspiration', estimatedHours: 2 },
        { title: 'Crazy 8s sketching', description: '8 ideas in 8 minutes each', estimatedHours: 1.5 },
        { title: 'Solution sketch', description: 'Three-panel storyboard of best idea', estimatedHours: 2 },
        { title: 'Art museum & heat map', description: 'Vote on strongest concepts', estimatedHours: 1.5 },
      ]},
      { name: 'Day 3 — Converge', tasks: [
        { title: 'Storyboard the winning solution', description: 'Frame-by-frame user flow', estimatedHours: 4 },
        { title: 'Divide responsibilities', description: 'Who builds what in the prototype', estimatedHours: 1 },
        { title: 'Prepare prototype assets', description: 'Gather copy, images, icons', estimatedHours: 3 },
      ]},
      { name: 'Day 4 — Prototype', tasks: [
        { title: 'Build prototype', description: 'High-fidelity interactive prototype', estimatedHours: 8 },
        { title: 'Internal walkthrough', description: 'Test flow and fix issues', estimatedHours: 2 },
      ]},
      { name: 'Day 5 — Test', tasks: [
        { title: 'User interviews (5 users)', description: 'One-on-one remote sessions', estimatedHours: 6 },
        { title: 'Identify patterns', description: 'What worked, what confused', estimatedHours: 1.5 },
        { title: 'Sprint retrospective', description: 'Document learnings and next steps', estimatedHours: 1 },
      ]},
    ],
  },
  {
    name: 'Business Launch — MVP',
    description: 'Get a minimum viable product to market. Covers market research, brand identity, landing page, and launch plan.',
    projectType: 'business',
    category: 'launch',
    tags: ['startup', 'mvp', 'go-to-market', 'branding'],
    featured: true,
    phases: [
      { name: 'Market Research', tasks: [
        { title: 'Competitor analysis', description: 'Top 5 competitors: features, pricing, positioning', estimatedHours: 10 },
        { title: 'Target persona definition', description: 'Demographics, pain points, channels', estimatedHours: 6 },
        { title: 'Value proposition canvas', description: 'Fit between product and customer needs', estimatedHours: 4 },
        { title: 'Pricing strategy research', description: 'Competitive pricing, willingness to pay', estimatedHours: 4 },
      ]},
      { name: 'Brand & Identity', tasks: [
        { title: 'Brand naming & tagline', description: 'Brainstorm and validate name options', estimatedHours: 6 },
        { title: 'Logo & visual identity', description: 'Primary logo, color palette, typography', estimatedHours: 12 },
        { title: 'Brand guidelines', description: 'Usage rules, tone of voice, templates', estimatedHours: 8 },
      ]},
      { name: 'Landing Page', tasks: [
        { title: 'Copywriting — hero & sections', description: 'Headline, subtext, CTA, testimonials', estimatedHours: 8 },
        { title: 'Design & development', description: 'Responsive landing page with analytics', estimatedHours: 16 },
        { title: 'A/B test setup', description: 'Variant headlines, CTAs, images', estimatedHours: 4 },
        { title: 'Lead capture integration', description: 'Email signup, CRM webhook, thank-you flow', estimatedHours: 4 },
      ]},
      { name: 'Launch Preparation', tasks: [
        { title: 'Launch checklist', description: 'All platforms, accounts, integrations verified', estimatedHours: 4 },
        { title: 'PR & outreach list', description: 'Journalists, bloggers, influencers', estimatedHours: 6 },
        { title: 'Soft launch to beta users', description: 'Collect feedback from 20-50 users', estimatedHours: 8 },
        { title: 'Public launch', description: 'Coordinated announcement across channels', estimatedHours: 4 },
      ]},
    ],
  },
  {
    name: 'Content Strategy — 30 Days',
    description: 'Plan, create, and distribute a month of content across blog, social, and email.',
    projectType: 'content',
    category: 'marketing',
    tags: ['content', 'seo', 'social-media', 'email'],
    featured: false,
    phases: [
      { name: 'Strategy & Planning', tasks: [
        { title: 'Content audit', description: 'Review existing content performance', estimatedHours: 6 },
        { title: 'Keyword & topic research', description: 'SEO opportunities and trending topics', estimatedHours: 8 },
        { title: 'Content calendar', description: '30-day schedule with themes and channels', estimatedHours: 4 },
        { title: 'Editorial guidelines', description: 'Voice, formatting, SEO rules', estimatedHours: 3 },
      ]},
      { name: 'Content Production', tasks: [
        { title: 'Write 4 blog posts', description: '2,000+ words each, SEO-optimized', estimatedHours: 24 },
        { title: 'Create 8 social graphics', description: 'Quote cards, infographics, carousels', estimatedHours: 12 },
        { title: 'Record 2 short videos', description: '60-90 seconds, captioned', estimatedHours: 6 },
        { title: 'Write 4 email newsletters', description: 'Weekly digest with original insights', estimatedHours: 8 },
      ]},
      { name: 'Distribution', tasks: [
        { title: 'Schedule social posts', description: 'Buffer/Hootsuite, optimal times', estimatedHours: 3 },
        { title: 'Set up email automation', description: 'Welcome sequence + weekly send', estimatedHours: 4 },
        { title: 'Outreach to 10 partners', description: 'Cross-promotion and backlink requests', estimatedHours: 6 },
        { title: 'Syndicate top content', description: 'Medium, LinkedIn Articles, dev.to', estimatedHours: 4 },
      ]},
      { name: 'Analysis & Optimization', tasks: [
        { title: 'Track KPIs', description: 'Traffic, engagement, conversions daily', estimatedHours: 4 },
        { title: 'A/B test subject lines & CTAs', description: 'Iterate on what works', estimatedHours: 3 },
        { title: 'Monthly report', description: 'Results, insights, next month plan', estimatedHours: 4 },
      ]},
    ],
  },
  {
    name: 'User Research — Deep Dive',
    description: 'Qualitative and quantitative research to uncover user needs, validate hypotheses, and inform product decisions.',
    projectType: 'research',
    category: 'ux',
    tags: ['research', 'ux', 'interviews', 'surveys'],
    featured: false,
    phases: [
      { name: 'Research Design', tasks: [
        { title: 'Define research questions', description: 'What we need to learn and why', estimatedHours: 4 },
        { title: 'Choose methodology', description: 'Interviews, surveys, usability tests, analytics review', estimatedHours: 3 },
        { title: 'Recruit participants', description: 'Screen and schedule 8-12 participants', estimatedHours: 6 },
        { title: 'Create discussion guide', description: 'Script, probes, activities', estimatedHours: 5 },
      ]},
      { name: 'Data Collection', tasks: [
        { title: 'Conduct interviews', description: '6-8 sessions, recorded with consent', estimatedHours: 10 },
        { title: 'Deploy survey', description: 'Target n=100+ respondents', estimatedHours: 4 },
        { title: 'Analyze product analytics', description: 'Funnels, retention, feature usage', estimatedHours: 6 },
        { title: 'Competitive UX audit', description: 'Compare flows of top 3 competitors', estimatedHours: 8 },
      ]},
      { name: 'Synthesis & Reporting', tasks: [
        { title: 'Affinity mapping', description: 'Cluster findings into themes', estimatedHours: 6 },
        { title: 'Create personas', description: '2-3 primary personas with goals and pain points', estimatedHours: 8 },
        { title: 'Journey maps', description: 'Current vs. ideal state journeys', estimatedHours: 6 },
        { title: 'Research report', description: 'Executive summary, insights, recommendations', estimatedHours: 10 },
        { title: 'Present findings', description: 'Stakeholder presentation with video clips', estimatedHours: 4 },
      ]},
    ],
  },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Find an admin user to set as author, or create one
  let author = await User.findOne({ role: { $in: ['admin', 'superadmin'] } }).lean();
  if (!author) {
    author = await User.findOne().lean();
  }
  if (!author) {
    console.log('No users found. Creating a system seed user...');
    author = await User.create({
      name: 'GRESIO System',
      email: 'system@gresio.app',
      password: 'seed-only-not-for-login',
      role: 'admin',
      domain: 'gresio.app',
    });
  }
  console.log(`Using author: ${author.name} (${author._id})`);

  // Remove existing seed templates
  await Template.deleteMany({ author: author._id, tags: 'seed' });

  // Insert templates
  for (const tpl of templates) {
    tpl.tags.push('seed');
    tpl.author = author._id;
    tpl.domain = author.domain;
    tpl.approved = true;
    tpl.downloads = Math.floor(Math.random() * 80) + 20;
    tpl.rating = parseFloat((3 + Math.random() * 2).toFixed(1));
    tpl.ratingCount = Math.floor(Math.random() * 15) + 5;
  }

  await Template.insertMany(templates);
  console.log(`✅ Seeded ${templates.length} templates`);

  await mongoose.disconnect();
  console.log('Done');
}

seed().catch(err => { console.error(err); process.exit(1); });
