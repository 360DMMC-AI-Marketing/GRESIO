import { useState, useEffect } from 'react';
import { companyProfile } from '../services/api';
import toast from 'react-hot-toast';
import { LoadingState, ErrorState } from '../components/StateComponents';
import {
  Building2, Globe, Users, Code2, MapPin, Clock, Edit3, Save, ExternalLink,
  Plus, X, Target, Eye, Heart, Calendar, Sparkles, Layers, Link, AtSign, Palette
} from 'lucide-react';

const PROJECT_TYPES = [
  'Mobile App', 'Web App', 'Website', 'API / Backend',
  'Infrastructure', 'Data / ML', 'Design System', 'Research',
];

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];
const VALUE_PRESETS = ['Innovation', 'Quality', 'Speed', 'Transparency', 'Collaboration', 'Customer First', 'Data Driven', 'Ownership'];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function CompanyProfile() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [domain, setDomain] = useState('');
  const [form, setForm] = useState({
    industry: '', description: '', tagline: '', website: '',
    country: '', timezone: '', departments: [],
    typicalProjects: [], techStack: [],
    foundedYear: null, companySize: '', mission: '', vision: '',
    coreValues: [], linkedin: '', twitter: '', github: '', brandColor: '#6366f1',
  });

  useEffect(() => {
    companyProfile.get()
      .then(({ data }) => {
        const p = data.profile;
        setDomain(p.domain || '');
        setForm(prev => ({
          ...prev,
          industry: p.industry || '',
          description: p.description || '',
          tagline: p.tagline || '',
          website: p.website || '',
          country: p.country || '',
          timezone: p.timezone || '',
          departments: p.departments?.length ? p.departments : [],
          typicalProjects: p.typicalProjects || [],
          techStack: p.techStack || [],
          foundedYear: p.foundedYear || null,
          companySize: p.companySize || '',
          mission: p.mission || '',
          vision: p.vision || '',
          coreValues: p.coreValues || [],
          linkedin: p.linkedin || '',
          twitter: p.twitter || '',
          github: p.github || '',
          brandColor: p.brandColor || '#6366f1',
        }));
      })
      .catch(e => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await companyProfile.update(form);
      toast.success('Profile saved');
      setEditing(false);
    } catch (e) {
      toast.error(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  const addDept = () => setForm(prev => ({
    ...prev,
    departments: [...prev.departments, { name: '', headcount: 1, type: '' }],
  }));

  const updateDept = (i, field, value) => setForm(prev => {
    const depts = [...prev.departments];
    depts[i] = { ...depts[i], [field]: value };
    return { ...prev, departments: depts };
  });

  const removeDept = (i) => setForm(prev => ({
    ...prev,
    departments: prev.departments.filter((_, j) => j !== i),
  }));

  const toggleProjectType = (type) => setForm(prev => ({
    ...prev,
    typicalProjects: prev.typicalProjects.includes(type)
      ? prev.typicalProjects.filter(t => t !== type)
      : [...prev.typicalProjects, type],
  }));

  const toggleValue = (val) => setForm(prev => ({
    ...prev,
    coreValues: prev.coreValues.includes(val)
      ? prev.coreValues.filter(v => v !== val)
      : [...prev.coreValues, val],
  }));

  const totalHeadcount = form.departments.reduce((s, d) => s + (d.headcount || 0), 0);
  const initials = (domain || 'C').charAt(0).toUpperCase();
  const brandColor = form.brandColor || '#6366f1';

  if (loading) return <LoadingState message="Loading profile..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const hasData = form.industry || form.tagline || form.description || form.departments.length > 0;
  const foundedStr = form.foundedYear ? `${MONTHS[Math.floor(Math.random() * 12)]} ${form.foundedYear}` : '';
  const sizeStr = form.companySize ? `${form.companySize} employees` : '';

  const ProfileCard = () => (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-neutral-100 shadow-xl shadow-neutral-200/30">
      {/* Hero gradient */}
      <div className="relative h-36" style={{background: `linear-gradient(135deg, ${brandColor}dd, ${brandColor}33 70%, transparent)`}}>
        <div className="absolute inset-0" style={{
          background: `radial-gradient(circle at 20% 30%, rgba(255,255,255,0.2) 0%, transparent 60%),
                       radial-gradient(circle at 80% 70%, rgba(255,255,255,0.1) 0%, transparent 50%)`
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
      </div>

      {/* Content */}
      <div className="px-8 pb-8 -mt-16 relative z-10">
        {/* Logo + Edit */}
        <div className="flex items-end justify-between mb-5">
          <div className="flex items-end gap-5">
            <div className="w-24 h-24 rounded-2xl shadow-lg border-[3px] border-white flex items-center justify-center text-white text-3xl font-bold"
              style={{background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)`, boxShadow: `0 8px 32px ${brandColor}44`}}>
              {initials}
            </div>
            <div className="pb-1">
              <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{domain || 'Your Company'}</h1>
              {form.tagline && <p className="text-sm text-neutral-400 mt-0.5 font-medium">{form.tagline}</p>}
            </div>
          </div>
          <button onClick={() => setEditing(!editing)}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer border-none"
            style={{
              background: editing ? '#fee2e2' : `${brandColor}12`,
              color: editing ? '#dc2626' : brandColor,
            }}>
            {editing ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
            {editing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        {/* Quick stats row */}
        <div className="flex items-center gap-6 mb-5 text-xs">
          {form.industry && (
            <div className="flex items-center gap-1.5 text-neutral-500">
              <Building2 className="w-3.5 h-3.5" style={{color: brandColor}} />
              <span className="font-medium text-neutral-700">{form.industry}</span>
            </div>
          )}
          {form.country && (
            <div className="flex items-center gap-1.5 text-neutral-500">
              <MapPin className="w-3.5 h-3.5" style={{color: brandColor}} />
              <span>{form.country}</span>
            </div>
          )}
          {foundedStr && (
            <div className="flex items-center gap-1.5 text-neutral-500">
              <Calendar className="w-3.5 h-3.5" style={{color: brandColor}} />
              <span>Founded {foundedStr}</span>
            </div>
          )}
          {sizeStr && (
            <div className="flex items-center gap-1.5 text-neutral-500">
              <Users className="w-3.5 h-3.5" style={{color: brandColor}} />
              <span>{sizeStr}</span>
            </div>
          )}
          {form.departments.length > 0 && (
            <div className="flex items-center gap-1.5 text-neutral-500">
              <Layers className="w-3.5 h-3.5" style={{color: brandColor}} />
              <span>{form.departments.length} departments</span>
            </div>
          )}
        </div>

        {/* Description */}
        {form.description && (
          <p className="text-sm text-neutral-600 leading-relaxed mb-5 max-w-2xl">{form.description}</p>
        )}

        {/* Mission & Vision */}
        {(form.mission || form.vision) && (
          <div className="grid grid-cols-2 gap-4 mb-5">
            {form.mission && (
              <div className="p-4 rounded-xl" style={{background: `${brandColor}06`, border: `1px solid ${brandColor}12`}}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Target className="w-3.5 h-3.5" style={{color: brandColor}} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{color: brandColor}}>Mission</span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">{form.mission}</p>
              </div>
            )}
            {form.vision && (
              <div className="p-4 rounded-xl" style={{background: `${brandColor}06`, border: `1px solid ${brandColor}12`}}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Eye className="w-3.5 h-3.5" style={{color: brandColor}} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{color: brandColor}}>Vision</span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">{form.vision}</p>
              </div>
            )}
          </div>
        )}

        {/* Core Values */}
        {form.coreValues.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            <Heart className="w-3.5 h-3.5 text-neutral-300 mt-0.5" />
            {form.coreValues.map((v, i) => (
              <span key={i} className="text-[10px] px-2.5 py-1 rounded-lg font-medium"
                style={{background: `${brandColor}0c`, color: brandColor}}>
                {v}
              </span>
            ))}
          </div>
        )}

        {/* Tech Stack */}
        {form.techStack.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            <Code2 className="w-3.5 h-3.5 text-neutral-300" />
            {form.techStack.map((tech, i) => (
              <span key={i} className="text-[10px] px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-600 font-mono">{tech}</span>
            ))}
          </div>
        )}

        {/* Project types */}
        {form.typicalProjects.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {form.typicalProjects.map((type, i) => (
              <span key={i} className="text-[10px] px-2.5 py-1 rounded-full font-medium"
                style={{background: `${brandColor}0c`, color: brandColor}}>
                {type}
              </span>
            ))}
          </div>
        )}

        {/* Departments */}
        {form.departments.length > 0 && (
          <div className="mb-5">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-2">Departments</div>
            <div className="space-y-1.5">
              {form.departments.map((d, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-neutral-50">
                  <span className="text-xs font-medium text-neutral-700">{d.name || 'Unnamed'}</span>
                  <span className="text-[10px] text-neutral-400">{d.headcount || 0} people</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom meta row */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
          <div className="flex items-center gap-3">
            {form.timezone && (
              <span className="flex items-center gap-1 text-[10px] text-neutral-400">
                <Clock className="w-3 h-3" />{form.timezone}
              </span>
            )}
            {form.website && (
              <a href={form.website.startsWith('http') ? form.website : `https://${form.website}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-brand-600 transition-all no-underline">
                <Globe className="w-3 h-3" />Website <ExternalLink className="w-2 h-2" />
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            {form.linkedin && (
              <a href={form.linkedin.startsWith('http') ? form.linkedin : `https://${form.linkedin}`}
                target="_blank" rel="noopener noreferrer" className="text-neutral-300 hover:text-[#0a66c2] transition-all">
                <Link className="w-3.5 h-3.5" />
              </a>
            )}
            {form.twitter && (
              <a href={form.twitter.startsWith('http') ? form.twitter : `https://${form.twitter}`}
                target="_blank" rel="noopener noreferrer" className="text-neutral-300 hover:text-[#1da1f2] transition-all">
                <AtSign className="w-3.5 h-3.5" />
              </a>
            )}
            {form.github && (
              <a href={form.github.startsWith('http') ? form.github : `https://${form.github}`}
                target="_blank" rel="noopener noreferrer" className="text-neutral-300 hover:text-neutral-700 transition-all">
                <Code2 className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Empty state */}
        {!hasData && (
          <div className="mt-5 p-6 rounded-xl text-center" style={{background: `${brandColor}06`, border: `1px dashed ${brandColor}20`}}>
            <Sparkles className="w-8 h-8 mx-auto mb-2" style={{color: `${brandColor}44`}} />
            <p className="text-sm font-medium text-neutral-500">Your company identity isn't set up yet</p>
            <p className="text-xs text-neutral-400 mt-1">Click "Edit Profile" to define your brand, mission, and team structure.</p>
          </div>
        )}
      </div>
    </div>
  );

  const EditForm = () => (
    <div className="rounded-2xl bg-white border border-neutral-100 shadow-lg overflow-hidden">
      <div className="px-7 py-4 border-b border-neutral-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4" style={{color: brandColor}} />
          <h2 className="text-sm font-bold text-neutral-800">Edit Company Details</h2>
        </div>
        <span className="text-[10px] text-neutral-400 bg-neutral-50 px-2 py-0.5 rounded-full">Admin only</span>
      </div>
      <div className="p-7 space-y-6">
        <div className="grid grid-cols-3 gap-5">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1.5 block">Industry</label>
            <input value={form.industry} onChange={e => setForm({...form, industry: e.target.value})}
              placeholder="e.g. FinTech, HealthTech, E-Commerce"
              className="w-full px-3.5 py-2.5 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 transition-all"
              style={{focusRingColor: brandColor}} />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1.5 block">Tagline</label>
            <input value={form.tagline} onChange={e => setForm({...form, tagline: e.target.value})}
              placeholder="A short brand statement"
              className="w-full px-3.5 py-2.5 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 transition-all" />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1.5 block">Brand Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.brandColor} onChange={e => setForm({...form, brandColor: e.target.value})}
                className="w-10 h-10 rounded-xl border border-neutral-200 cursor-pointer bg-transparent p-0.5" />
              <span className="text-xs text-neutral-400 font-mono">{form.brandColor}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1.5 block">Description</label>
          <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
            rows={3} placeholder="Tell the story of your company..."
            className="w-full px-3.5 py-2.5 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 transition-all resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1.5 block">Mission</label>
            <textarea value={form.mission} onChange={e => setForm({...form, mission: e.target.value})}
              rows={2} placeholder="What drives your company?"
              className="w-full px-3.5 py-2.5 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 transition-all resize-none" />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1.5 block">Vision</label>
            <textarea value={form.vision} onChange={e => setForm({...form, vision: e.target.value})}
              rows={2} placeholder="Where are you heading?"
              className="w-full px-3.5 py-2.5 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 transition-all resize-none" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-2 block">Core Values</label>
          <div className="flex flex-wrap gap-1.5">
            {VALUE_PRESETS.map(val => (
              <button key={val} onClick={() => toggleValue(val)}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                  form.coreValues.includes(val)
                    ? 'border-transparent text-white'
                    : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
                }`}
                style={form.coreValues.includes(val) ? {background: brandColor, borderColor: brandColor} : {}}>
                {val}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1.5 block">Founded Year</label>
            <input type="number" min={1900} max={2030} value={form.foundedYear || ''} onChange={e => setForm({...form, foundedYear: parseInt(e.target.value) || null})}
              placeholder="2020"
              className="w-full px-3.5 py-2.5 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 transition-all" />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1.5 block">Company Size</label>
            <select value={form.companySize} onChange={e => setForm({...form, companySize: e.target.value})}
              className="w-full px-3.5 py-2.5 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 transition-all">
              <option value="">Select size</option>
              {COMPANY_SIZES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1.5 block">Country</label>
            <input value={form.country} onChange={e => setForm({...form, country: e.target.value})}
              placeholder="e.g. United States"
              className="w-full px-3.5 py-2.5 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 transition-all" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1.5 block">Website</label>
            <input value={form.website} onChange={e => setForm({...form, website: e.target.value})}
              placeholder="https://example.com"
              className="w-full px-3.5 py-2.5 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 transition-all" />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1.5 block">Time Zone</label>
            <input value={form.timezone} onChange={e => setForm({...form, timezone: e.target.value})}
              placeholder="UTC / America/New_York"
              className="w-full px-3.5 py-2.5 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 transition-all" />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1.5 block">Department Count</label>
            <div className="text-sm text-neutral-600 py-2.5">{form.departments.length} departments · {totalHeadcount} total people</div>
          </div>
        </div>

        {/* Social links */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-2 block">Social Links</label>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Link className="w-4 h-4 text-[#0a66c2]" />
              <input value={form.linkedin} onChange={e => setForm({...form, linkedin: e.target.value})}
                placeholder="LinkedIn URL"
                className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 transition-all" />
            </div>
            <div className="flex items-center gap-2">
              <AtSign className="w-4 h-4 text-[#1da1f2]" />
              <input value={form.twitter} onChange={e => setForm({...form, twitter: e.target.value})}
                placeholder="Twitter / X URL"
                className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 transition-all" />
            </div>
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-neutral-600" />
              <input value={form.github} onChange={e => setForm({...form, github: e.target.value})}
                placeholder="GitHub URL"
                className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 transition-all" />
            </div>
          </div>
        </div>

        {/* Departments */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Departments</label>
            <button onClick={addDept}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 transition-all cursor-pointer bg-transparent border-none">
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <div className="space-y-1.5">
            {form.departments.map((dept, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={dept.name} onChange={e => updateDept(i, 'name', e.target.value)}
                  placeholder="Department name"
                  className="flex-1 px-3.5 py-2 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 transition-all" />
                <input type="number" min={0} value={dept.headcount} onChange={e => updateDept(i, 'headcount', parseInt(e.target.value) || 0)}
                  className="w-24 px-3.5 py-2 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 transition-all text-center" />
                <span className="text-xs text-neutral-400 w-10">people</span>
                <button onClick={() => removeDept(i)}
                  className="flex items-center justify-center w-8 h-8 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all cursor-pointer bg-transparent border-none">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Typical projects */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-2 block">Typical Projects</label>
          <div className="flex flex-wrap gap-1.5">
            {PROJECT_TYPES.map(type => (
              <button key={type} onClick={() => toggleProjectType(type)}
                className={`px-3.5 py-2 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                  form.typicalProjects.includes(type)
                    ? 'border-transparent text-white'
                    : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
                }`}
                style={form.typicalProjects.includes(type) ? {background: brandColor, borderColor: brandColor} : {}}>
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Tech stack */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1.5 block">Tech Stack</label>
          <input value={form.techStack.join(', ')} onChange={e => setForm({...form, techStack: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
            placeholder="React, Node.js, Python, AWS..."
            className="w-full px-3.5 py-2.5 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 transition-all" />
        </div>
      </div>

      {/* Footer */}
      <div className="px-7 py-4 border-t border-neutral-100 flex items-center justify-between">
        <p className="text-[10px] text-neutral-400">Your profile powers Project Cortex analysis</p>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl text-white transition-all cursor-pointer border-none disabled:opacity-50"
          style={{background: brandColor}}>
          <Save className="w-3.5 h-3.5" />{saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="page-enter max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 pb-1">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background: `${brandColor}12`}}>
          <Building2 className="w-5 h-5" style={{color: brandColor}} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-neutral-900">Company Identity</h1>
          <p className="text-xs text-neutral-400">Your brand profile powers Project Cortex intelligence</p>
        </div>
      </div>

      <ProfileCard />

      {editing && <EditForm />}
    </div>
  );
}
