import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function WelcomeWizard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading || !user || user.onboardingCompleted) return null;
  if (location.pathname === '/onboarding-guide') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden px-8 py-10 text-center">
        <span className="text-5xl block mb-4">{'\u{1F44B}'}</span>
        <h2 className="text-xl font-bold text-neutral-900 mb-2">
          Welcome to GRESIO, {user?.name?.split(' ')[0] || 'there'}!
        </h2>
        <p className="text-xs text-neutral-500 mb-3">
          You're logged in as <span className="font-semibold text-neutral-700 capitalize">{user?.role?.replace(/_/g, ' ')}</span>
        </p>
        <p className="text-sm text-neutral-500 leading-relaxed max-w-sm mx-auto mb-6">
          Your internal OS for managing projects, sprints, tasks, and QA testing.
        </p>
        <div className="flex items-center justify-center gap-4 text-xs text-neutral-500 mb-6">
          <span className="flex items-center gap-1.5">{'\u{1F4CB}'} Adapted project phases</span>
          <span className="flex items-center gap-1.5">{'\u26A1'} Sprints & Tasks</span>
          <span className="flex items-center gap-1.5">{'\u{1F9EA}'} QA Testing</span>
        </div>
        <button onClick={() => navigate('/onboarding-guide')}
          className="px-6 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors cursor-pointer border-none">
          Get Started {'\u2192'}
        </button>
      </div>
    </div>
  );
}
