import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Skeleton from './Skeleton';
import Header from './super-admin/Header';
import Sidebar from './super-admin/Sidebar';
import { auth } from '../services/api';

export default function SuperAdminLayout() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex bg-[#f9fafb]">
        <div className="w-[250px] bg-white border-r border-surface-200 p-4 space-y-4">
          <Skeleton.Box w="80%" h={20} />
          {[1,2,3,4].map(i => <div key={i} className="flex items-center gap-3"><Skeleton.Box w={20} h={20} round /><Skeleton.Box w="60%" h={14} /></div>)}
        </div>
        <div className="flex-1 flex flex-col">
          <div className="h-14 border-b border-surface-200 bg-white flex items-center px-6">
            <Skeleton.Box w="20%" h={16} />
          </div>
          <div className="flex-1 p-6">
            <Skeleton.PageHeader />
            <Skeleton.Text lines={4} />
          </div>
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
