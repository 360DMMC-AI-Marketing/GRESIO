import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { companyProfile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { LoadingState, ErrorState } from '../components/StateComponents';
import { Building2, Users, Briefcase } from 'lucide-react';

const STEPS = [
  { id: 'describe', icon: Building2, label: 'Describe' },
  { id: 'departments', icon: Users, label: 'Departments' },
  { id: 'projects', icon: Briefcase, label: 'Project Types' },
];

const PRESET_DEPARTMENTS = [
  { name: 'Development', headcount: 3, type: 'engineering' },
  { name: 'Design', headcount: 1, type: 'design' },
  { name: 'Marketing', headcount: 1, type: 'marketing' },
  { name: 'Sales', headcount: 2, type: 'sales' },
  { name: 'Operations', headcount: 1, type: 'operations' },
];

const PROJECT_TYPES = [
  'Mobile App', 'Web App', 'Website', 'API / Backend',
  'Infrastructure', 'Data / ML', 'Design System', 'Research',
];

export default function CompanyOnboarding() {
  const navigate = useNavigate();
  const { user, refreshCompany } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    industry: '',
    description: '',
    tagline: '',
    website: '',
    country: '',
    timezone: '',
    departments: PRESET_DEPARTMENTS.map(d => ({ ...d })),
    typicalProjects: [],
    techStack: [],
  });

  useEffect(() => {
    companyProfile.get()
      .then(({ data }) => {
        if (data.profile.profileCompleted) {
          navigate('/dashboard', { replace: true });
          return;
        }
        if (data.profile.industry) setForm(prev => ({ ...prev, industry: data.profile.industry }));
        if (data.profile.description) setForm(prev => ({ ...prev, description: data.profile.description }));
        if (data.profile.departments?.length) setForm(prev => ({ ...prev, departments: data.profile.departments }));
        if (data.profile.typicalProjects?.length) setForm(prev => ({ ...prev, typicalProjects: data.profile.typicalProjects }));
        if (data.profile.techStack?.length) setForm(prev => ({ ...prev, techStack: data.profile.techStack }));
        if (data.profile.tagline) setForm(prev => ({ ...prev, tagline: data.profile.tagline }));
        if (data.profile.website) setForm(prev => ({ ...prev, website: data.profile.website }));
        if (data.profile.country) setForm(prev => ({ ...prev, country: data.profile.country }));
        if (data.profile.timezone) setForm(prev => ({ ...prev, timezone: data.profile.timezone }));
      })
      .catch(e => setError(e.message || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await companyProfile.update(form);
      if (refreshCompany) await refreshCompany();
      toast.success('Company profile saved!');
      navigate('/dashboard', { replace: true });
    } catch (e) {
      toast.error(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleProjectType = (type) => {
    setForm(prev => ({
      ...prev,
      typicalProjects: prev.typicalProjects.includes(type)
        ? prev.typicalProjects.filter(t => t !== type)
        : [...prev.typicalProjects, type],
    }));
  };

  const updateDept = (index, field, value) => {
    setForm(prev => {
      const depts = [...prev.departments];
      depts[index] = { ...depts[index], [field]: value };
      return { ...prev, departments: depts };
    });
  };

  const addDepartment = () => {
    setForm(prev => ({
      ...prev,
      departments: [...prev.departments, { name: '', headcount: 1, type: '' }],
    }));
  };

  const removeDepartment = (index) => {
    setForm(prev => ({
      ...prev,
      departments: prev.departments.filter((_, i) => i !== index),
    }));
  };

  const canProceed = () => {
    if (step === 0) return form.description.trim().length > 10;
    if (step === 1) return form.departments.some(d => d.name.trim());
    return form.typicalProjects.length > 0;
  };

  if (loading) return <LoadingState message="Loading..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#0B1120] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to CIOS</h1>
          <p className="text-sm text-slate-400">Let me get to know your company so I can help you better</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                i === step ? 'bg-brand-500 text-white' : i < step ? 'bg-success-500/20 text-success-400' : 'bg-slate-800 text-slate-500'
              }`}>
                <s.icon className="w-3.5 h-3.5" />
                {s.label}
              </div>
              {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < step ? 'bg-success-500' : 'bg-slate-700'}`} />}
            </div>
          ))}
        </div>

        <div className="glass-panel bg-slate-900/60 border border-slate-700/50 rounded-xl p-8">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1.5">Industry</label>
                <input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}
                  placeholder="e.g. Foodtech, Fintech, Healthcare, SaaS..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1.5">Describe your company</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Tell me about your company — what you do, your market, your team..."
                  rows={4}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all resize-none" />
                <p className="text-xs text-slate-500 mt-1">{form.description.length} characters</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-1.5">Tagline</label>
                  <input value={form.tagline} onChange={e => setForm({ ...form, tagline: e.target.value })}
                    placeholder="Short tagline"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-1.5">Website</label>
                  <input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })}
                    placeholder="https://"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all" />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-400 mb-4">Add the departments in your company and how many people work in each.</p>
              {form.departments.map((dept, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={dept.name} onChange={e => updateDept(i, 'name', e.target.value)}
                    placeholder="Department name"
                    className="flex-1 px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all" />
                  <input type="number" min={0} value={dept.headcount} onChange={e => updateDept(i, 'headcount', parseInt(e.target.value) || 0)}
                    className="w-20 px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all text-center" />
                  <span className="text-xs text-slate-500 w-12">people</span>
                  {form.departments.length > 1 && (
                    <button onClick={() => removeDepartment(i)}
                      className="px-2 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer bg-transparent border-none">
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addDepartment}
                className="w-full py-2 text-sm text-slate-400 hover:text-white border border-dashed border-slate-700 rounded-lg hover:border-slate-500 transition-all cursor-pointer bg-transparent">
                + Add department
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400 mb-4">What types of projects do you typically work on?</p>
              <div className="grid grid-cols-2 gap-2">
                {PROJECT_TYPES.map(type => (
                  <button key={type} onClick={() => toggleProjectType(type)}
                    className={`px-4 py-3 text-sm font-medium rounded-lg border transition-all cursor-pointer ${
                      form.typicalProjects.includes(type)
                        ? 'bg-brand-500/20 border-brand-500 text-brand-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}>
                    {type}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1.5">Tech stack (optional)</label>
                <input value={form.techStack.join(', ')} onChange={e => setForm({ ...form, techStack: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder="React, Node.js, Python, AWS..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all" />
                <p className="text-xs text-slate-500 mt-1">Comma-separated</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-700/50">
            <button onClick={() => step > 0 ? setStep(step - 1) : navigate('/dashboard')}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-all cursor-pointer bg-transparent border-none">
              {step === 0 ? 'Skip' : 'Back'}
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">Step {step + 1} of 3</span>
              {step < STEPS.length - 1 ? (
                <button onClick={() => setStep(step + 1)} disabled={!canProceed()}
                  className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer border-none ${
                    canProceed() ? 'btn-premium text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}>
                  Next
                </button>
              ) : (
                <button onClick={handleSave} disabled={saving || !canProceed()}
                  className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer border-none ${
                    !saving && canProceed() ? 'btn-premium text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}>
                  {saving ? 'Saving...' : 'Complete'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
