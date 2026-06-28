import { Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import SuperAdminLayout from './components/SuperAdminLayout';
import AiCommandBar from './components/AiCommandBar';
import MobileNav from './components/MobileNav';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Sprints = lazy(() => import('./pages/Sprints'));
const Users = lazy(() => import('./pages/Users'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Admin = lazy(() => import('./pages/Admin'));
const ClickupImport = lazy(() => import('./pages/ClickupImport'));
const AsanaImport = lazy(() => import('./pages/AsanaImport'));
const JiraImport = lazy(() => import('./pages/JiraImport'));
const LinearImport = lazy(() => import('./pages/LinearImport'));
const AzureADImport = lazy(() => import('./pages/AzureADImport'));
const Profile = lazy(() => import('./pages/Profile'));
const Github = lazy(() => import('./pages/Github'));
const Teams = lazy(() => import('./pages/Teams'));
const Outlook = lazy(() => import('./pages/Outlook'));
const WorkLogs = lazy(() => import('./pages/WorkLogs'));
const TestCaseDashboard = lazy(() => import('./pages/TestCaseDashboard'));
const OnboardingGuide = lazy(() => import('./pages/OnboardingGuide'));
const WorkDNA = lazy(() => import('./pages/WorkDNA'));
const About = lazy(() => import('./pages/About'));
const Blog = lazy(() => import('./pages/Blog'));
const Careers = lazy(() => import('./pages/Careers'));
const Landing = lazy(() => import('./pages/Landing'));
const FeaturesPage = lazy(() => import('./pages/FeaturesPage'));
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const Guides = lazy(() => import('./pages/Guides'));
const MyTasks = lazy(() => import('./pages/MyTasks'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const ReportPreviewPage = lazy(() => import('./pages/ReportPreviewPage'));
const ReportEditPage = lazy(() => import('./pages/ReportEditPage'));
const Calendar = lazy(() => import('./pages/Calendar'));
const PublicReport = lazy(() => import('./pages/PublicReport'));
const TemplateMarketplace = lazy(() => import('./pages/TemplateMarketplace'));
const TemplateDetail = lazy(() => import('./pages/TemplateDetail'));
const CreateTemplate = lazy(() => import('./pages/CreateTemplate'));
const Wiki = lazy(() => import('./pages/Wiki'));
const CompanyOnboarding = lazy(() => import('./pages/CompanyOnboarding'));
const CompanyProfile = lazy(() => import('./pages/CompanyProfile'));
const ProjectCortex = lazy(() => import('./pages/ProjectCortex'));
const CerebrumOracle = lazy(() => import('./pages/CerebrumOracle'));
const CerebrumMemory = lazy(() => import('./pages/CerebrumMemory'));
const CerebrumStrategy = lazy(() => import('./pages/CerebrumStrategy'));
const CerebrumGalaxy = lazy(() => import('./pages/CerebrumGalaxy'));
const SuperAdminDashboard = lazy(() => import('./pages/super-admin/Dashboard'));
const SuperAdminCompanies = lazy(() => import('./pages/super-admin/Companies'));
const SuperAdminCompanyDetail = lazy(() => import('./pages/super-admin/CompanyDetail'));
const SuperAdminAdmins = lazy(() => import('./pages/super-admin/Admins'));
const SuperAdminAnalytics = lazy(() => import('./pages/super-admin/Analytics'));
const SuperAdminHealth = lazy(() => import('./pages/super-admin/Health'));
const SuperAdminNotifications = lazy(() => import('./pages/super-admin/Notifications'));
const SuperAdminProfile = lazy(() => import('./pages/super-admin/Profile'));
const SuperAdminSettings = lazy(() => import('./pages/super-admin/Settings'));
import ScrollToTop from './components/ScrollToTop';
import WelcomeWizard from './components/WelcomeWizard';
import ErrorBoundary from './components/ErrorBoundary';

function SuspenseFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-neutral-500 text-sm">Loading...</p>
      </div>
    </div>
  );
}

function SuspenseWrapper({ children }) {
  return <Suspense fallback={<SuspenseFallback />}>{children}</Suspense>;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { background: 'var(--toast-bg)', color: '#fff', borderRadius: 'var(--radius-lg)', fontSize: '13px', border: '1px solid var(--glass-border)' } }} />
      <BrowserRouter>
        <ScrollToTop />
        <ErrorBoundary>
        <SuspenseWrapper>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/about" element={<About />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/guides" element={<Guides />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/report/:id" element={<ReportPreviewPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/shared-report/:token" element={<PublicReport />} />
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/my-tasks" element={<MyTasks />} />
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
              <Route path="/admin/clickup-import" element={<ClickupImport />} />
              <Route path="/admin/asana-import" element={<AsanaImport />} />
              <Route path="/admin/jira-import" element={<JiraImport />} />
              <Route path="/admin/linear-import" element={<LinearImport />} />
              <Route path="/admin/azure-import" element={<AzureADImport />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/work-dna" element={<WorkDNA />} />
              <Route path="/templates" element={<TemplateMarketplace />} />
              <Route path="/templates/:id" element={<TemplateDetail />} />
              <Route path="/templates/create" element={<CreateTemplate />} />
              <Route path="/wiki" element={<Wiki />} />
              <Route path="/company-onboarding" element={<CompanyOnboarding />} />
              <Route path="/admin/company-profile" element={<CompanyProfile />} />
              <Route path="/project-cortex" element={<ProjectCortex />} />
              <Route path="/cerebrum/oracle" element={<CerebrumOracle />} />
              <Route path="/cerebrum/oracle/:projectId" element={<CerebrumOracle />} />
              <Route path="/cerebrum/memory" element={<CerebrumMemory />} />
              <Route path="/cerebrum/strategy" element={<CerebrumStrategy />} />
              <Route path="/cerebrum/galaxy" element={<CerebrumGalaxy />} />
            </Route>
            <Route element={<SuperAdminLayout />}>
              <Route path="/super/dashboard" element={<SuperAdminDashboard />} />
              <Route path="/super/companies" element={<SuperAdminCompanies />} />
              <Route path="/super/companies/:id" element={<SuperAdminCompanyDetail />} />
              <Route path="/super/admins" element={<SuperAdminAdmins />} />
              <Route path="/super/analytics" element={<SuperAdminAnalytics />} />
              <Route path="/super/health" element={<SuperAdminHealth />} />
              <Route path="/super/notifications" element={<SuperAdminNotifications />} />
              <Route path="/super/profile" element={<SuperAdminProfile />} />
              <Route path="/super/settings" element={<SuperAdminSettings />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </SuspenseWrapper>
        </ErrorBoundary>
        <AiCommandBar />
        <MobileNav />
        <WelcomeWizard />
      </BrowserRouter>
    </AuthProvider>
  );
}
