const mongoose = require('mongoose');
const path = require('path');
require(path.join(__dirname, 'src', 'config', 'env'));

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/gresio');
  const Project = require(path.join(__dirname, 'src', 'models', 'Project'));
  const Sprint = require(path.join(__dirname, 'src', 'models', 'Sprint'));
  const Task = require(path.join(__dirname, 'src', 'models', 'Task'));

  const projects = await Project.find({ clickupFolderId: { $ne: '' } });
  console.log('Projects with clickupFolderId:', projects.length);
  for (const p of projects) {
    const taskCount = await Task.countDocuments({ project: p._id });
    console.log('  -', p.name, '| tasks:', taskCount);
  }

  const sprints = await Sprint.find({ clickupListId: { $ne: '' } });
  console.log('Sprints with clickupListId:', sprints.length);
  for (const s of sprints) {
    const taskCount = await Task.countDocuments({ sprint: s._id });
    console.log('  -', s.name, '| tasks:', taskCount);
  }

  const allTasks = await Task.find({ clickupTaskId: { $ne: '' } });
  console.log('Total tasks with clickupTaskId:', allTasks.length);

  await mongoose.disconnect();
}
check().catch(e => console.error(e));
