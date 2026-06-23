const mongoose = require('mongoose');

async function clean() {
  await mongoose.connect('mongodb://localhost:27017/gresio');
  const Project = require('./src/models/Project');
  const Sprint = require('./src/models/Sprint');
  const Task = require('./src/models/Task');

  const projects = await Project.find({ clickupFolderId: { $ne: '' } });
  console.log('Deleting', projects.length, 'projects...');

  for (const p of projects) {
    await Task.deleteMany({ project: p._id });
  }
  const sprints = await Sprint.deleteMany({ clickupListId: { $ne: '' } });
  const tasks = await Task.deleteMany({ clickupTaskId: { $ne: '' } });
  const projDel = await Project.deleteMany({ clickupFolderId: { $ne: '' } });

  console.log('Deleted:', projDel.deletedCount, 'projects,', sprints.deletedCount, 'sprints,', tasks.deletedCount, 'tasks');
  await mongoose.disconnect();
}
clean().catch(e => { console.error(e); process.exit(1); });
