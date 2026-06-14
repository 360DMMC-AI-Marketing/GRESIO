import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, AlertTriangle, Users, Activity, ArrowRight } from 'lucide-react';
import DashboardCard from '../components/DashboardCard';
import DataTable from '../components/DataTable';
import HighRiskCard from '../components/HighRiskCard';
import ActivityItem from '../components/ActivityItem';
import PlanBadge from '../components/PlanBadge';
import { api } from '../api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [dateTime, setDateTime] = useState({ date: '', time: '' });

  useEffect(() => {
    const fmt = () => {
      const now = new Date();
      const opts = { weekday:'long', month:'long', day:'numeric', year:'numeric' };
      return { date: now.toLocaleDateString('en-US', opts), time: now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }) };
    };
    setDateTime(fmt());
    const id = setInterval(() => setDateTime(fmt()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    api.getCompanies().then(setCompanies).catch(console.error);
    api.getUsers().then(setAdmins).catch(console.error);
  }, []);

  const active = companies.filter(c => c.isActive !== false);
  const completed = companies.filter(c => c.status === 'completed');
  const atRisk = companies.filter(c => c.status === 'at_risk' || c.status === 'delayed' || c.overdue > 0);
  const onlineAdmins = admins.filter(a => a.status === 'active');

  const highRiskCompanies = companies.filter(c => c.status === 'at_risk' || c.status === 'delayed' || (c.overdue || 0) > 0);

  const tableColumns = [
    { key:'name', label:'Name' },
    { key:'plan', label:'Plan', render:(val) => <PlanBadge plan={val} /> },
    { key:'type', label:'Type', render:(val) => <span className="inline-block rounded-md px-2 py-0.5 text-xs font-medium bg-surface-100 text-surface-600 capitalize">{val || '—'}</span> },
    { key:'overdue', label:'Overdue Tasks' },
    { key:'progress', label:'Progress', render:(val) => (
      <div className="flex items-center gap-2">
        <div className="w-20 h-2 bg-[#e5e7eb] rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-[#2347e8] transition-all" style={{ width: `${val || 0}%` }} />
        </div>
        <span className="text-xs font-medium text-surface-600">{val || 0}%</span>
      </div>
    )},
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Super Dashboard</h1>
          <p className="text-xs text-surface-400 mt-0.5">{dateTime.date} · {dateTime.time}</p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg border border-surface-200 px-3 py-2 text-xs text-surface-500">
          <Activity size={14} /> <span>All systems monitored</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <DashboardCard icon={Building2} label="Active Companies" value={String(active.length)} subtext="monitored" color="blue" />
        <DashboardCard icon={CheckCircle2} label="Completed" value={String(completed.length)} subtext={`out of ${active.length}`} color="green" />
        <DashboardCard icon={AlertTriangle} label="At Risk" value={String(atRisk.length)} subtext="needs attention" color="red" />
        <DashboardCard icon={Users} label="Active Admins" value={String(onlineAdmins.length)} subtext={`${admins.length - onlineAdmins.length} offline`} color="purple" />
      </div>

      {highRiskCompanies.length > 0 && (
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-red-500" />
            <h2 className="text-sm font-semibold text-surface-900">High Risk Companies</h2>
            <span className="text-xs bg-red-100 text-red-700 rounded-md px-2 py-0.5 font-medium">{highRiskCompanies.length}</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {highRiskCompanies.map((company) => (
              <div key={company._id} className="min-w-[220px] shrink-0">
                <HighRiskCard company={company} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-[1fr_300px] gap-4">
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-surface-900">Companies</h2>
            <button onClick={() => navigate('/companies')}
              className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 bg-transparent border-none cursor-pointer">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <DataTable columns={tableColumns} data={companies.slice(0, 5)} onRowClick={(row) => navigate(`/companies/${row._id}`)} />
        </div>

        <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={14} className="text-surface-400" />
            <h2 className="text-sm font-semibold text-surface-900">Recent Activity</h2>
          </div>
          <div className="flex flex-col gap-1">
            {admins.slice(0, 6).map((a) => (
              <ActivityItem key={a._id} activity={{ user: a.name, action: `Last login: ${new Date(a.lastActive || a.createdAt).toLocaleDateString()}`, time: '—' }} />
            ))}
          </div>
        </div>
      </div>

      <footer className="border-t border-surface-200 pt-4 pb-2 text-center text-xs text-surface-400">
        CIOS | &copy; 2026 All rights reserved. | Consult@360DMMC.com | Powered by 360 DMMC
      </footer>
    </div>
  );
}
