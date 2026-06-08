const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cron = require('node-cron');

const env = require('./config/env');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { setupSocket } = require('./socket');
const { runStatusEngine } = require('./services/statusEngine');
const Integration = require('./models/Integration');
const integrationController = require('./controllers/integrationController');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const analyticsRoutes = require('./routes/analytics');
const integrationRoutes = require('./routes/integrations');
const sprintRoutes = require('./routes/sprints');
const companyRoutes = require('./routes/companies');
const notificationRoutes = require('./routes/notifications');
const testingRoutes = require('./routes/testing');
const workLogRoutes = require('./routes/workLogs');
const testCaseRoutes = require('./routes/testCases');

const app = express();
const server = http.createServer(app);

const allowedOrigins = env.FRONTEND_URL ? env.FRONTEND_URL.split(',') : ['http://localhost:5173'];
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/sprints', sprintRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/testing', testingRoutes);
app.use('/api/work-logs', workLogRoutes);
app.use('/api/test-cases', testCaseRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/seed', async (req, res) => {
  try {
    const User = require('./models/User');
    const Company = require('./models/Company');
    const existing = await User.findOne({ email: 'admin@cios.com' });
    if (existing) return res.json({ message: 'Already seeded' });

    await Company.create({ name: "Admin's Company", domain: 'admin@cios.com', plan: 'enterprise' });
    await User.create({ name: 'Admin User', email: 'admin@cios.com', password: 'password123', role: 'admin', domain: 'admin@cios.com' });
    await User.create({ name: 'Project Manager', email: 'pm@cios.com', password: 'password123', role: 'project_manager', domain: 'admin@cios.com' });
    await User.create({ name: 'Developer User', email: 'dev@cios.com', password: 'password123', role: 'developer', domain: 'admin@cios.com' });
    await User.create({ name: 'QA Tester', email: 'qa@cios.com', password: 'password123', role: 'qa_tester', domain: 'admin@cios.com' });
    await User.create({ name: 'Intern User', email: 'intern@cios.com', password: 'password123', role: 'intern', domain: 'admin@cios.com' });
    res.json({ message: 'Seeded! Login: admin@cios.com / password123' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use(errorHandler);
setupSocket(io);

cron.schedule('*/15 * * * *', () => { runStatusEngine().catch(console.error); });

async function autoSyncIntegrations() {
  try {
    const integrations = await Integration.find({ isConnected: true });
    for (const int of integrations) {
      try {
        const service = integrationController.getSyncService(int.name);
        if (service && typeof service.sync === 'function') {
          await service.sync();
          await Integration.findOneAndUpdate({ name: int.name }, { lastSync: new Date() });
        }
      } catch (err) { console.error(`Auto-sync failed for ${int.name}:`, err.message); }
    }
  } catch (err) { console.error('Auto-sync error:', err.message); }
}

cron.schedule('*/30 * * * *', () => { autoSyncIntegrations(); });
console.log('CIOS backend starting...');

const PORT = env.PORT;
connectDB().then(() => {
  server.listen(PORT, () => { console.log(`CIOS backend running on port ${PORT}`); });
});

module.exports = { app, server, io };
