import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

export default function WelcomeWizard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading || !user || user.role === 'super_admin' || user.onboardingCompleted) return null;
  if (location.pathname === '/onboarding-guide') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass-panel bg-[var(--bg-secondary)] border border-[var(--glass-border)] shadow-2xl max-w-lg w-full mx-4 overflow-hidden px-8 py-10 text-center animate-scale-in">
        <div className="flex justify-center mb-5">
          <Logo size="lg" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          Welcome, {user?.name?.split(' ')[0] || 'there'}!
        </h2>
        <p className="text-xs text-[var(--text-tertiary)] mb-3">
          You're logged in as <span className="font-semibold text-[var(--text-primary)] capitalize">{user?.role?.replace(/_/g, ' ')}</span>
        </p>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto mb-6">
          Your internal OS for managing projects, sprints, tasks, and QA testing.
        </p>
        <div className="flex items-center justify-center gap-4 text-xs text-[var(--text-tertiary)] mb-6">
          <span className="flex items-center gap-1.5">{'\u{1F4CB}'} Adapted project phases</span>
          <span className="flex items-center gap-1.5">{'\u26A1'} Sprints & Tasks</span>
          <span className="flex items-center gap-1.5">{'\u{1F9EA}'} QA Testing</span>
        </div>
        <button onClick={() => navigate('/onboarding-guide')}
          className="px-6 py-2.5 text-sm font-semibold btn-premium rounded-[var(--radius-lg)] transition-all cursor-pointer border-none">
          Get Started {'\u2192'}
        </button>
      </div>
    </div>
  );
}
