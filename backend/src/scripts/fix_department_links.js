const mongoose = require('mongoose');
const Project = require('../models/Project');
const User = require('../models/User');
const TeamGroup = require('../models/TeamGroup');
const ProjectMember = require('../models/ProjectMember');

async function fixDepartmentLinks() {
  await mongoose.connect('mongodb://localhost:27017/gresio');
  console.log('Connected to MongoDB');

  const projects = await Project.find({ isActive: true }).lean();
  let totalLinks = 0;

  for (const project of projects) {
    if (!project.members || project.members.length === 0) continue;

    for (const memberId of project.members) {
      const user = await User.findById(memberId);
      if (!user || !user.department || user.department.length === 0) continue;

      for (const deptName of user.department) {
        const teamGroup = await TeamGroup.findOne({ project: project._id, name: deptName });
        if (teamGroup) {
          await ProjectMember.findOneAndUpdate(
            { project: project._id, user: memberId },
            { project: project._id, domain: project.domain, user: memberId, projectRole: 'developer', teamGroup: teamGroup._id, status: 'active' },
            { upsert: true }
          );
          totalLinks++;
        } else {
          console.log(`  No TeamGroup "${deptName}" in project "${project.name}", skipped`);
        }
      }
    }
  }

  console.log(`\nDone. Created/updated ${totalLinks} ProjectMember links.`);
  mongoose.disconnect();
}

fixDepartmentLinks().catch(e => { console.error(e); process.exit(1); });
