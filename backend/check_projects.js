const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Project = require('./src/models/Project');
  const total = await Project.countDocuments({ isActive: true });
  const umbrellas = await Project.countDocuments({ isActive: true, projectType: 'umbrella' });
  const nonUmbrella = await Project.countDocuments({ isActive: true, projectType: { $ne: 'umbrella' } });
  const completed = await Project.countDocuments({ isActive: true, status: 'completed', projectType: { $ne: 'umbrella' } });
  const inProgress = await Project.countDocuments({ isActive: true, status: { $in: ['on_track', 'ready_to_test'] }, projectType: { $ne: 'umbrella' } });
  console.log({ total, umbrellas, nonUmbrella, completed, inProgress });
  const projects = await Project.find({ isActive: true }).select('name projectType phase status').lean();
  console.log(JSON.stringify(projects, null, 2));
  mongoose.disconnect();
});
