import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Tasks from './pages/Tasks';
import Sprints from './pages/Sprints';
import Users from './pages/Users';
import Analytics from './pages/Analytics';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import Github from './pages/Github';
import Teams from './pages/Teams';
import Outlook from './pages/Outlook';
import WorkLogs from './pages/WorkLogs';
import TestCaseDashboard from './pages/TestCaseDashboard';
import OnboardingGuide from './pages/OnboardingGuide';
import Landing from './pages/Landing';
import FeaturesPage from './pages/FeaturesPage';
import HowItWorksPage from './pages/HowItWorksPage';
import PricingPage from './pages/PricingPage';
import ContactPage from './pages/ContactPage';
import NotificationsPage from './pages/NotificationsPage';
import PrivacyPage from './pages/PrivacyPage';
import ReportsPage from './pages/ReportsPage';
import ReportPreviewPage from './pages/ReportPreviewPage';
import ReportEditPage from './pages/ReportEditPage';
import ScrollToTop from './components/ScrollToTop';


export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/report/:id" element={<ReportPreviewPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/sprints" element={<Sprints />} />
            <Route path="/work-logs" element={<WorkLogs />} />
            <Route path="/test-cases" element={<TestCaseDashboard />} />
            <Route path="/test-cases/:projectId" element={<TestCaseDashboard />} />
            <Route path="/onboarding-guide" element={<OnboardingGuide />} />
            <Route path="/users" element={<Users />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/github" element={<Github />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/outlook" element={<Outlook />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/projects/:projectId/reports/edit" element={<ReportEditPage />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/profile" element={<Profile />} />

          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
