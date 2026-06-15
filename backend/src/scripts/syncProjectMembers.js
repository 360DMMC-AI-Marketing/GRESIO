const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gresio');
  const Project = require('../models/Project');
  const ProjectMember = require('../models/ProjectMember');

  const projects = await Project.find({ isActive: true }).select('_id name members');
  let synced = 0;
  let fixed = 0;

  for (const project of projects) {
    const activeMembers = await ProjectMember.find({ project: project._id, status: 'active', user: { $ne: null } }).select('user');
    const activeUserIds = activeMembers.filter(m => m.user).map(m => m.user);
    if (activeUserIds.length === 0) continue;
    synced++;
    const before = project.members.length;
    await Project.findByIdAndUpdate(project._id, { $addToSet: { members: { $each: activeUserIds } } });
    const after = (await Project.findById(project._id).select('members')).members.length;
    if (after > before) {
      fixed++;
      console.log(`  Synced ${project.name}: ${before} → ${after} members`);
    }
  }

  console.log(`\nChecked ${synced} projects with active members. Fixed ${fixed} projects.`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
