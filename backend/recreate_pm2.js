const mongoose = require('mongoose');
const env = require('./src/config/env');
async function run() {
  await mongoose.connect(env.MONGODB_URI);
  const User = require('./src/models/User');
  const Project = require('./src/models/Project');
  const TeamGroup = require('./src/models/TeamGroup');
  const ProjectMember = require('./src/models/ProjectMember');

  const domain = '360dmmc.com';
  const projects = await Project.find({ domain });
  const users = await User.find({ domain });
  const groups = await TeamGroup.find({ project: { $in: projects.map(p => p._id) } });

  const GROUP_BY_USER_ROLE = {
    super_admin: { groupName: 'Administration Team', projectRole: 'admin' },
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

  // First delete all existing
  await ProjectMember.deleteMany({});
  
  let created = 0;
  for (const user of users) {
    const mapping = GROUP_BY_USER_ROLE[user.role] || GROUP_BY_USER_ROLE.other;
    for (const project of projects) {
      const group = groups.find(g => String(g.project) === String(project._id) && g.name === mapping.groupName);
      await ProjectMember.create({
        project: project._id,
        domain,
        user: user._id,
        email: user.email,
        projectRole: mapping.projectRole,
        teamGroup: group?._id || null,
        status: 'active',
        invitedBy: user._id,
        invitedAt: new Date(),
        acceptedAt: new Date(),
      });
      created++;
    }
  }
  console.log('Created:', created);
  
  const verify = await ProjectMember.countDocuments({});
  console.log('Verify count after create:', verify);
  
  // Immediately check again
  const check2 = await ProjectMember.countDocuments({});
  console.log('Verify count after 0.5s:', check2);
  
  // Check by group
  const withGroup = await ProjectMember.countDocuments({ teamGroup: { $ne: null } });
  console.log('With teamGroup:', withGroup);
  
  await mongoose.disconnect();
}
run().catch(err => console.error(err.message));
