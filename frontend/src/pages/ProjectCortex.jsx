import { useState, useEffect, useRef, useCallback } from 'react';
import { projectCortex, projects } from '../services/api';
import toast from 'react-hot-toast';
import { ErrorState } from '../components/StateComponents';
import { BrainCircuit, Send, Activity, Thermometer, Wind, AlertTriangle, FileSearch, MessageSquare, GitCompare, History, Sparkles, Zap, Clock, Shield } from 'lucide-react';

const SUGGESTIONS = [
  'What is the current health of this project?',
  'What are the biggest risks right now?',
  'Summarize recent activity',
  'Who is overloaded?',
  'Are we on track for the next deadline?',
  'What blockers need attention?',
  'Recommend next priorities',
  'How can we improve velocity?',
];

const GAUGE_CIRC = 226.194; // 2 * PI * 36

function RadialGauge({ score, color, label, icon: Icon, animate, size = 80 }) {
  const r = 36;
  const circ = GAUGE_CIRC;
  const offset = circ - (score / 100) * circ;
  const [animatedOffset, setAnimatedOffset] = useState(circ);

  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => setAnimatedOffset(offset), 100);
      return () => clearTimeout(timer);
    } else setAnimatedOffset(offset);
  }, [score, animate]);

  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    if (!animate) { setDisplayValue(score); return; }
    let start = 0;
    const duration = 1000;
    const step = 16;
    const increment = score / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= score) { setDisplayValue(score); clearInterval(timer); }
      else setDisplayValue(Math.round(start));
    }, step);
    return () => clearInterval(timer);
  }, [score, animate]);

  return (
    <div className="glass-panel relative overflow-hidden" style={{padding:'16px',borderRadius:'var(--radius-lg)'}}>
      {Icon === Activity && animate && (
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-success-500 animate-heartbeat" />
      )}
      <svg width={size} height={size} viewBox="0 0 80 80" className="mx-auto">
        <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="6"
          className="text-neutral-100" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={animatedOffset}
          transform="rotate(-90, 40, 40)"
          style={{transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)'}} />
        {Icon && (
          <foreignObject x="28" y="18" width="24" height="20">
            <Icon className="w-5 h-5 mx-auto" style={{color}} />
          </foreignObject>
        )}
        <text x="40" y="52" textAnchor="middle" fill="currentColor"
          className="text-neutral-800 text-lg font-bold" fontSize="16" fontWeight="700">
          {displayValue}
        </text>
        <text x="40" y="62" textAnchor="middle" fill="currentColor"
          className="text-neutral-400" fontSize="7">
          {label}
        </text>
      </svg>
      <p className="text-center text-[10px] text-neutral-400 mt-1 capitalize">{label}</p>
    </div>
  );
}

function TypewriterText({ text, speed = 25, onDone }) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayed('');
    const timer = setInterval(() => {
      indexRef.current++;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) {
        clearInterval(timer);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return <span>{displayed}<span className="typewriter-cursor" /></span>;
}

function SkeletonLoading() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="flex-1 glass-panel p-4" style={{borderRadius:'var(--radius-lg)'}}>
            <div className="skeleton-pulse w-16 h-16 rounded-full mx-auto mb-3" />
            <div className="skeleton-pulse w-12 h-4 mx-auto rounded" />
          </div>
        ))}
      </div>
      <div className="glass-panel p-4" style={{borderRadius:'var(--radius-lg)'}}>
        <div className="skeleton-pulse w-32 h-4 mb-3 rounded" />
        <div className="skeleton-pulse w-full h-8 rounded" />
      </div>
    </div>
  );
}

export default function ProjectCortex() {
  const [projectList, setProjectList] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vitals, setVitals] = useState(null);
  const [predict, setPredict] = useState(null);
  const [autopsy, setAutopsy] = useState(null);
  const [events, setEvents] = useState([]);
  const [similarProjects, setSimilarProjects] = useState([]);
  const [teamMemory, setTeamMemory] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [analyzing, setAnalyzing] = useState(false);
  const [animating, setAnimating] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    projects.getAll()
      .then(({ data }) => setProjectList(data))
      .catch(e => setError(e.message || 'Failed to load projects'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, chatLoading]);

  const analyzeProject = async (projectId) => {
    if (!projectId) return;
    setAnalyzing(true);
    setAnimating(false);
    try {
      const [vitalsRes, predictRes, eventsRes] = await Promise.all([
        projectCortex.getVitals(projectId).catch(() => ({ data: { vitals: null } })),
        projectCortex.getPredict(projectId).catch(() => ({ data: null })),
        projectCortex.getEvents(projectId).catch(() => ({ data: { events: [] } })),
      ]);
      setVitals(vitalsRes.data.vitals);
      setPredict(predictRes.data);
      setEvents(eventsRes.data.events || []);

      const autopsyRes = await projectCortex.getAutopsy(projectId).catch(() => ({ data: { autopsy: null } }));
      setAutopsy(autopsyRes.data.autopsy);

      const [similarRes, memoryRes] = await Promise.all([
        projectCortex.getSimilar(projectId).catch(() => ({ data: { similar: [] } })),
        projectCortex.getTeamMemory().catch(() => ({ data: { memory: [] } })),
      ]);
      setSimilarProjects(similarRes.data.similar || []);
      setTeamMemory(memoryRes.data.memory || []);
    } catch (e) {
      toast.error('Analysis failed');
    } finally {
      setAnalyzing(false);
      setTimeout(() => setAnimating(true), 50);
    }
  };

  const handleProjectChange = (projectId) => {
    setSelectedProject(projectId);
    setVitals(null);
    setPredict(null);
    setAutopsy(null);
    setEvents([]);
    setSimilarProjects([]);
    setTeamMemory([]);
    setMessages([]);
    if (projectId) {
      setActiveTab('chat');
      analyzeProject(projectId);
    }
  };

  const handleChat = useCallback(async (msg) => {
    const message = msg || chatInput;
    if (!message.trim() || !selectedProject || chatLoading) return;
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setChatLoading(true);
    try {
      const { data } = await projectCortex.chat(selectedProject, message);
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I had trouble with that question. Try asking differently.' }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, selectedProject, chatLoading]);

  const handleCollectEvent = async (eventType, reason) => {
    if (!selectedProject) return;
    try {
      await projectCortex.collectEvent({ projectId: selectedProject, eventType, reason });
      toast.success('Event recorded');
      setActiveTab('chat');
      setMessages(prev => [...prev, { role: 'assistant', content: `📝 **${eventType}** logged — I'll factor this into my analysis.` }]);
      analyzeProject(selectedProject);
    } catch (e) {
      toast.error('Failed to record event');
    }
  };

  if (loading) return <SkeletonLoading />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const selectedProjectName = projectList.find(p => p._id === selectedProject)?.name;

  return (
    <div className="page-enter max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="glass-panel glow-card" style={{padding:'14px 18px',borderRadius:'var(--radius-lg)'}}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-neutral-900">Project Cortex</h1>
              <p className="text-[11px] text-neutral-400">AI-powered project intelligence</p>
            </div>
          </div>
          <select value={selectedProject} onChange={e => handleProjectChange(e.target.value)}
            className="select max-w-xs text-sm">
            <option value="">Select a project...</option>
            {projectList.map(p => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty state */}
      {!selectedProject && (
        <div className="glass-panel flex flex-col items-center justify-center py-20 animate-scale-in" style={{borderRadius:'var(--radius-lg)'}}>
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500/20 to-indigo-500/20 flex items-center justify-center mb-5 animate-float">
            <BrainCircuit className="w-10 h-10 text-brand-500" />
          </div>
          <h2 className="text-xl font-bold text-neutral-800 mb-2">Your AI Project Analyst</h2>
          <p className="text-sm text-neutral-400 max-w-md text-center leading-relaxed mb-8">
            Select a project above to get instant AI-powered analysis. I'll monitor vitals, predict risks, and answer any question about your projects.
          </p>
          {projectList.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center max-w-lg stagger">
              {projectList.slice(0, 6).map(p => (
                <button key={p._id} onClick={() => handleProjectChange(p._id)}
                  className="button-lift px-4 py-2 text-xs font-medium rounded-xl bg-neutral-100 text-neutral-600 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 border border-transparent cursor-pointer">
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active project */}
      {selectedProject && (
        <div className="flex gap-4">

          {/* Main — Chat */}
          <div className="flex-1 min-w-0">
            <div className="glass-panel flex flex-col glow-card" style={{borderRadius:'var(--radius-lg)', minHeight:'500px'}}>
              {/* Chat header */}
              <div className="px-5 py-3 border-b border-neutral-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-md animate-glow-pulse">
                  <BrainCircuit className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-neutral-800">Cortex</span>
                  <span className="text-[10px] text-neutral-400 ml-2">analyzing <strong className="text-neutral-600">{selectedProjectName}</strong></span>
                </div>
                {analyzing && <div className="ml-auto w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{maxHeight:'400px'}}>
                {messages.length === 0 && !chatLoading && (
                  <div className="flex flex-col items-center justify-center h-64 text-center animate-fade-in">
                    <Sparkles className="w-10 h-10 text-brand-500/30 mb-3" />
                    <p className="text-sm text-neutral-500 font-medium mb-3">Ask me anything about <strong>{selectedProjectName}</strong></p>
                    <div className="grid grid-cols-2 gap-1.5 w-full max-w-md stagger">
                      {SUGGESTIONS.map((s, i) => (
                        <button key={i} onClick={() => handleChat(s)}
                          className="button-lift text-left px-3 py-2 text-xs text-neutral-500 bg-neutral-50 hover:bg-brand-50 hover:text-brand-700 rounded-xl cursor-pointer border border-neutral-100 hover:border-brand-200">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2.5 animate-bubble-spring ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    style={{animationDelay: `${i * 50}ms`}}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm ${
                      msg.role === 'user' ? 'bg-neutral-100 text-neutral-500' : 'bg-gradient-to-br from-brand-500 to-indigo-600 text-white animate-glow-pulse'
                    }`}>
                      {msg.role === 'user' ? 'U' : 'C'}
                    </div>
                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-tr-md shadow-md'
                        : 'bg-neutral-50 text-neutral-700 rounded-tl-md shadow-sm'
                    }`}>
                      {msg.role === 'assistant' && i === messages.length - 1 && !chatLoading
                        ? <TypewriterText text={msg.content} speed={20} />
                        : msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex gap-2.5 animate-bubble-spring">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm animate-glow-pulse">C</div>
                    <div className="bg-neutral-50 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                      <div className="flex gap-1.5">
                        {[0,1,2].map(i => (
                          <div key={i} className="w-2 h-2 bg-brand-400 rounded-full animate-thinking-bounce"
                            style={{animationDelay: `${i * 200}ms`}} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-neutral-100">
                <div className="flex gap-2">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleChat()}
                    placeholder={`Ask about ${selectedProjectName}...`}
                    className="flex-1 px-4 py-2.5 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm" />
                  <button onClick={() => handleChat()} disabled={chatLoading || !chatInput.trim()}
                    className="button-lift px-4 py-2.5 bg-gradient-to-r from-brand-500 to-indigo-600 text-white rounded-xl cursor-pointer border-none disabled:opacity-40 disabled:transform-none">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-72 shrink-0 space-y-3">
            <div className="glass-panel p-2 flex flex-col gap-1 glow-card" style={{borderRadius:'var(--radius-lg)'}}>
              {[
                { id: 'chat', label: 'Chat', icon: MessageSquare },
                { id: 'vitals', label: 'Vitals', icon: Activity },
                { id: 'predict', label: 'Predict', icon: Zap },
                { id: 'autopsy', label: 'Autopsy', icon: FileSearch },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`button-lift flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl cursor-pointer border-none w-full text-left ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-brand-500/10 to-indigo-500/10 text-brand-700 border border-brand-200/50 shadow-sm'
                      : 'text-neutral-500 hover:bg-neutral-50'
                  }`}>
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="glass-panel p-3 glow-card" style={{borderRadius:'var(--radius-lg)'}}>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-2">Quick Log</div>
              <div className="flex flex-col gap-1">
                {[
                  { label: 'Decision', type: 'decision', color: 'bg-neutral-50 text-neutral-600 hover:bg-brand-50 hover:text-brand-700' },
                  { label: 'Blocker', type: 'blocker', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
                  { label: 'Note', type: 'note', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
                ].map(btn => (
                  <button key={btn.type} onClick={() => handleCollectEvent(btn.type, `Manual ${btn.label.toLowerCase()} logged`)}
                    className={`button-lift px-3 py-1.5 text-xs font-medium rounded-xl cursor-pointer border-none text-left transition-all ${btn.color}`}>
                    + {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vitals */}
      {selectedProject && !analyzing && activeTab === 'vitals' && (
        <div className="tab-enter">
          {!vitals ? (
            <div className="glass-panel text-center py-10 animate-fade-in" style={{borderRadius:'var(--radius-lg)'}}>
              <Activity className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">No vital data yet</p>
              <p className="text-[10px] text-neutral-400 mt-1">Events will populate vitals as the project progresses</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 stagger">
              {Object.entries(vitals).map(([key, vital], idx) => {
                const color = vital.score > 70 ? '#22c55e' : vital.score > 40 ? '#f59e0b' : '#ef4444';
                const Icon = key === 'pulse' ? Activity : key === 'temperature' ? Thermometer : Wind;
                return (
                  <div key={key} className="animate-count-up" style={{animationDelay: `${idx * 120}ms`}}>
                    <RadialGauge score={vital.score} color={color} label={vital.label} icon={Icon} animate={animating} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Predict */}
      {selectedProject && !analyzing && activeTab === 'predict' && (
        <div className="tab-enter">
          {!predict ? (
            <div className="glass-panel text-center py-10 animate-fade-in" style={{borderRadius:'var(--radius-lg)'}}>
              <AlertTriangle className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">Not enough data to assess risk</p>
              <p className="text-[10px] text-neutral-400 mt-1">Continue working — predictions improve with more events</p>
            </div>
          ) : (
            <div className="glass-panel glow-card" style={{padding:'20px',borderRadius:'var(--radius-lg)'}}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-semibold text-neutral-700">Risk Assessment</h3>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-0.5">{predict.projectDays} days of data</p>
                </div>
                <div className={`px-3 py-1.5 rounded-xl text-sm font-bold tab-enter ${
                  predict.riskLabel === 'Low' ? 'bg-success-50 text-success-700' :
                  predict.riskLabel === 'Medium' ? 'bg-warning-50 text-warning-700' : 'bg-danger-50 text-danger-700'
                }`}>
                  {predict.riskScore}/100
                </div>
              </div>
              <div className="flex items-center gap-6 mb-5">
                <div className="relative w-28 h-28 shrink-0">
                  <svg width="112" height="112" viewBox="0 0 112 112">
                    <path d="M 16 56 A 40 40 0 1 1 96 56" fill="none" stroke="#e5e7eb" strokeWidth="8" strokeLinecap="round" />
                    <path d="M 16 56 A 40 40 0 1 1 96 56" fill="none" stroke={
                      predict.riskScore > 70 ? '#ef4444' : predict.riskScore > 40 ? '#f59e0b' : '#22c55e'
                    } strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${(predict.riskScore / 100) * 125.6} 125.6`}
                      style={{transition: 'stroke-dasharray 1.2s cubic-bezier(0.4, 0, 0.2, 1)', transitionDelay: '0.1s'}} />
                    <text x="56" y="62" textAnchor="middle" fill="currentColor" fontSize="22" fontWeight="700"
                      className="animate-count-up" style={{animationDelay: '0.3s'}}>
                      {predict.riskScore}
                    </text>
                    <text x="56" y="76" textAnchor="middle" fill="#9ca3af" fontSize="8">RISK</text>
                  </svg>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                    {['Low', 'Medium', 'High'].map((lvl, i) => (
                      <span key={lvl} className={`text-[8px] font-medium px-1.5 py-0.5 rounded ${
                        predict.riskLabel === lvl
                          ? lvl === 'Low' ? 'bg-success-50 text-success-700'
                            : lvl === 'Medium' ? 'bg-warning-50 text-warning-700'
                            : 'bg-danger-50 text-danger-700'
                          : 'text-neutral-300'
                      }`}>{lvl}</span>
                    ))}
                  </div>
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  {predict.patterns?.length > 0 && predict.patterns.map((p, i) => (
                    <div key={i} className={`flex items-start gap-2 p-2.5 rounded-xl text-xs tab-enter ${
                      p.severity === 'high' ? 'bg-danger-50 text-danger-700' : 'bg-warning-50 text-warning-700'
                    }`} style={{animationDelay: `${i * 100}ms`}}>
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{p.message}</span>
                    </div>
                  ))}
                  <div className="p-3 rounded-xl text-xs text-brand-800 overflow-hidden relative" style={{background:'linear-gradient(135deg, #f0f4ff 0%, #e8edff 100%)'}}>
                    <div className="animate-shimmer-slow absolute inset-0 pointer-events-none" />
                    <strong>Recommendation:</strong> {predict.recommendation}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Autopsy */}
      {selectedProject && !analyzing && activeTab === 'autopsy' && (
        <div className="space-y-3 tab-enter">
          {!autopsy ? (
            <div className="glass-panel text-center py-10 animate-fade-in" style={{borderRadius:'var(--radius-lg)'}}>
              <FileSearch className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">Not enough data for autopsy yet</p>
              <p className="text-[10px] text-neutral-400 mt-1">Events are automatically collected as the project progresses</p>
            </div>
          ) : (
            <>
              <div className="glass-panel glow-card" style={{padding:'18px',borderRadius:'var(--radius-lg)'}}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-700">Autopsy Report</h3>
                    <p className="text-[10px] text-neutral-400">{autopsy.totalEvents} events · {autopsy.projectDurationDays} days</p>
                  </div>
                  <div className="w-20">
                    <svg width="80" height="80" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="32" fill="none" stroke="#e5e7eb" strokeWidth="5" />
                      <circle cx="40" cy="40" r="32" fill="none" stroke={
                        autopsy.healthScore > 70 ? '#22c55e' : autopsy.healthScore > 40 ? '#f59e0b' : '#ef4444'
                      } strokeWidth="5" strokeLinecap="round"
                        strokeDasharray={GAUGE_CIRC}
                        strokeDashoffset={animating ? GAUGE_CIRC - (autopsy.healthScore / 100) * GAUGE_CIRC : GAUGE_CIRC}
                        transform="rotate(-90, 40, 40)"
                        style={{transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)'}} />
                      <text x="40" y="44" textAnchor="middle" fill="currentColor" fontSize="18" fontWeight="700"
                        className="text-neutral-800">{autopsy.healthScore}</text>
                      <text x="40" y="56" textAnchor="middle" fill="#9ca3af" fontSize="7">Health</text>
                    </svg>
                  </div>
                </div>
                {autopsy.rootCauses?.length > 0 && (
                  <div className="space-y-1.5">
                    {autopsy.rootCauses.map((cause, i) => (
                      <div key={i} className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 animate-slide-in-left glow-card"
                        style={{animationDelay: `${i * 100}ms`}}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">#{cause.rank}</span>
                          <span className="text-xs font-semibold text-neutral-700">{cause.cause}</span>
                        </div>
                        <p className="text-[10px] text-neutral-500 ml-7">{cause.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Timeline */}
              {autopsy.timeline?.length > 0 && (
                <div className="glass-panel p-4 glow-card" style={{borderRadius:'var(--radius-lg)'}}>
                  <h4 className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-3">
                    <Clock className="w-3 h-3 inline mr-1" />Full Timeline
                  </h4>
                  <div className="space-y-1 max-h-60 overflow-y-auto stagger-left">
                    {autopsy.timeline.map((entry, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs py-1.5 border-b border-neutral-50 last:border-0">
                        <span className="text-neutral-300 w-20 shrink-0 tab-enter" style={{animationDelay: `${i * 30}ms`}}>
                          {new Date(entry.date).toLocaleDateString('en', {month:'short',day:'numeric'})}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-600 capitalize tab-enter" style={{animationDelay: `${i * 30 + 50}ms`}}>
                          {entry.type?.replace(/_/g, ' ')}
                        </span>
                        <span className="text-neutral-500 truncate tab-enter" style={{animationDelay: `${i * 30 + 100}ms`}}>{entry.actor}</span>
                        {entry.reason && <span className="text-neutral-400 truncate ml-auto tab-enter" style={{animationDelay: `${i * 30 + 150}ms`}}>"{entry.reason}"</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Similar Projects */}
              {similarProjects.length > 0 && (
                <div className="glass-panel p-3 glow-card animate-slide-in-left" style={{borderRadius:'var(--radius-lg)'}}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <GitCompare className="w-3.5 h-3.5 text-brand-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Similar Projects</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {similarProjects.map((sp, i) => (
                      <div key={i} className={`p-2 rounded-xl text-[10px] animate-slide-in-left glow-card ${
                        sp.similarity > 70 ? 'bg-danger-50 text-danger-700' : 'bg-warning-50 text-warning-700'
                      }`} style={{animationDelay: `${i * 80}ms`}}>
                        <div className="font-semibold mb-0.5">{sp.project.name}</div>
                        <span className="font-bold">{sp.similarity}%</span> similar · {sp.project.status}
                        {sp.warnings?.[0] && <div className="mt-0.5 opacity-75">⚠ {sp.warnings[0]}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Team Memory */}
              {teamMemory.length > 0 && (
                <div className="glass-panel p-3 glow-card animate-slide-in-left" style={{borderRadius:'var(--radius-lg)', animationDelay:'200ms'}}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <History className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Team Memory</span>
                  </div>
                  {teamMemory.map((mem, i) => (
                    <div key={i} className="p-2 rounded-xl mb-1 last:mb-0 bg-neutral-50 animate-slide-in-left" style={{animationDelay: `${i * 80 + 200}ms`}}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-semibold text-neutral-700">{mem.project}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-500">{mem.outcome}</span>
                      </div>
                      <div className="text-[9px] text-neutral-400">Early signals: {mem.earlySignals.map(s => `${s.type} (×${s.count})`).join(', ')}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
