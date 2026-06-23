import { useState, useEffect } from 'react';
import { companies, users } from '../services/api';
import { ConfirmModal, AlertModal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = {
  admin: 'Admin', team_lead: 'Team Lead', project_manager: 'Proj. Manager',
  manager: 'Manager', qa_tester: 'QA Tester', developer: 'Developer',
  designer: 'Designer', intern: 'Intern', other: 'Other',
};

export default function AzureADImport() {
  const { user } = useAuth();
  const [allCompanies, setAllCompanies] = useState([]);
  const [company, setCompany] = useState(null);
  const [importDomain, setImportDomain] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importedUsers, setImportedUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [deleteUserConfirm, setDeleteUserConfirm] = useState(null);
  const [deletingUsers, setDeletingUsers] = useState(false);
  const [alertModal, setAlertModal] = useState(null);

  const loadImportedUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data } = await users.getAll({ hasOutlook: 'true' });
      setImportedUsers(data);
    } catch (e) {
      console.error('Failed to load imported users', e);
    }
    setLoadingUsers(false);
  };

  useEffect(() => {
    companies.getAll().then(({ data }) => {
      if (data?.length > 0) {
        setAllCompanies(data);
        const c = data[0];
        setCompany(c);
        setImportDomain(c.domain);
      }
    }).catch(() => {});
    loadImportedUsers();
  }, []);

  const handleCompanyChange = (e) => {
    const c = allCompanies.find(c => c._id === e.target.value);
    if (c) {
      setCompany(c);
      setImportDomain(c.domain);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    const domain = importDomain.trim().toLowerCase().replace(/^@/, '');
    if (!domain) return;
    if (!company) return setImportResult({ type: 'error', message: 'No company selected.' });
    setImporting(true);
    setImportResult(null);
    try {
      const res = await companies.importUsers(company._id, { domain });
      setImportResult({ type: 'success', imported: res.data.imported, skipped: res.data.skipped, total: res.data.total });
      if (res.data.imported > 0) loadImportedUsers();
    } catch (e) {
      setImportResult({ type: 'error', message: e.response?.data?.message || e.message || 'Import failed' });
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await users.delete(userId);
      setImportedUsers(prev => prev.filter(u => u._id !== userId));
      setAlertModal({ title: 'Deleted', message: 'User deleted', type: 'success' });
    } catch (e) {
      setAlertModal({ title: 'Error', message: e.response?.data?.message || e.message, type: 'error' });
    } finally {
      setDeleteUserConfirm(null);
    }
  };

  const handleDeleteAllImported = async () => {
    setDeletingUsers(true);
    try {
      let deleted = 0;
      const protectedEmails = ['admin@gresio.com', user?.email].filter(Boolean);
      const toDelete = importedUsers.filter(u => u._id && !protectedEmails.includes(u.email));
      for (const u of toDelete) {
        try { await users.delete(u._id); deleted++; } catch (e) { console.error('Delete failed for', u.email, e.message); }
      }
      setAlertModal({ title: 'Done', message: `Deleted ${deleted} users (protected accounts skipped)`, type: 'success' });
    } catch (e) {
      setAlertModal({ title: 'Error', message: e.message, type: 'error' });
    } finally {
      setDeletingUsers(false);
      loadImportedUsers();
    }
  };

  const isProtected = (u) => u.email === 'admin@gresio.com' || u.email === user?.email;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">👥 Azure AD Import</h1>
        <p className="text-surface-500 text-sm mt-1">Import users from your Microsoft 365 organization</p>
      </div>

      <div className="bg-white rounded-xl border border-surface-200 p-5">
        <h2 className="text-lg font-semibold text-surface-900 mb-1">Import Users</h2>
        <p className="text-xs text-surface-500 mb-4">
          Enter your company's email domain (the part after @ in your users' emails).
          Example: if your users are <strong>name@360dmmc.com</strong>, enter <strong>360dmmc.com</strong>.
          This is <em>not</em> your personal login email.
        </p>

        <div className="mb-4">
          <label className="block text-xs font-medium text-surface-500 mb-1">Company</label>
          <select value={company?._id || ''} onChange={handleCompanyChange}
            className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500">
            {allCompanies.map(c => (
              <option key={c._id} value={c._id}>{c.name} — @{c.domain}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-surface-500 mb-1">Email domain to import</label>
            <div className="flex items-center border border-surface-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500">
              <span className="px-2 text-xs text-surface-400 bg-surface-50 py-1.5 border-r border-surface-200">@</span>
              <input type="text" value={importDomain} onChange={e => setImportDomain(e.target.value)}
                placeholder="yourcompany.com" className="flex-1 px-2 py-1.5 text-xs outline-none bg-white" />
            </div>
          </div>
          <button data-voice="import-users" onClick={handleImport} disabled={importing || !importDomain.trim()}
            className="px-3 py-1.5 text-xs font-medium bg-[#2F2F2F] text-white rounded-lg hover:bg-[#1A1A1A] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
            {importing ? 'Importing...' : 'Import Users'}
          </button>
        </div>
        {importResult && (
          <div className={`mt-3 p-2 rounded-lg text-xs ${importResult.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {importResult.type === 'success'
              ? `✅ ${importResult.imported} imported, ${importResult.skipped} skipped`
              : `❌ ${importResult.message}`}
            <button onClick={() => setImportResult(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-surface-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-900">📧 Users with Outlook email</h2>
          {importedUsers.length > 0 && (
            <button onClick={() => setDeleteUserConfirm('__all__')} disabled={deletingUsers}
              className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50">
              {deletingUsers ? 'Deleting...' : 'Delete All'}
            </button>
          )}
        </div>
        {loadingUsers ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full"></div>
          </div>
        ) : importedUsers.length === 0 ? (
          <div className="text-center py-10 text-surface-400">
            <p className="text-3xl mb-2">📧</p>
            <p className="text-sm">No users with Outlook email configured.</p>
            <p className="text-xs text-surface-400 mt-1">Import users using the form above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {importedUsers.map((u) => (
              <div key={u._id} className="flex items-center justify-between p-3 border border-surface-200 rounded-lg">
                <div>
                  <p className="font-medium text-surface-900 text-sm">{u.name}</p>
                  <p className="text-xs text-surface-400">{u.outlookEmail} · {ROLE_LABELS[u.role] || u.role}</p>
                  {Array.isArray(u.department) && u.department.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {u.department.map(d => (
                        <span key={d} className="text-[10px] bg-surface-100 text-surface-500 px-1.5 py-0.5 rounded">{d}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-surface-100 text-surface-500'}`}>
                    {u.status}
                  </span>
                  {!isProtected(u) && (
                    <button onClick={() => setDeleteUserConfirm(u._id)} className="text-xs text-red-500 hover:text-red-700 underline">Delete</button>
                  )}
                  {isProtected(u) && (
                    <span className="text-xs text-surface-400 italic">Protected</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deleteUserConfirm}
        onClose={() => setDeleteUserConfirm(null)}
        onConfirm={() => deleteUserConfirm === '__all__' ? handleDeleteAllImported() : handleDeleteUser(deleteUserConfirm)}
        title={deleteUserConfirm === '__all__' ? 'Delete All Imported Users' : 'Delete User'}
        message={deleteUserConfirm === '__all__' ? 'This will permanently delete ALL imported users. Are you sure?' : 'This will permanently delete this user. Are you sure?'}
        confirmText={deleteUserConfirm === '__all__' ? 'Delete All' : 'Delete'}
      />
      <AlertModal
        open={!!alertModal}
        onClose={() => setAlertModal(null)}
        title={alertModal?.title}
        message={alertModal?.message}
        type={alertModal?.type}
      />
    </div>
  );
}
