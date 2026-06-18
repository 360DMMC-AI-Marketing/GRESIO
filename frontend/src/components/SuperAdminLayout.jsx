import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from './super-admin/Header';
import Sidebar from './super-admin/Sidebar';
import { auth } from '../services/api';

export default function SuperAdminLayout() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-neutral-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== 'super_admin') return <Navigate to="/dashboard" replace />;

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <Sidebar />
      <div className="ml-60">
        <Header user={user} onLogout={handleLogout} />
        <main className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
