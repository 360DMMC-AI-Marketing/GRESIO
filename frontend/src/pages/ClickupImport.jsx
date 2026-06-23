import { useState, useEffect } from 'react';
import { clickupImport, integrations } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const STEPS = ['Browse', 'Select', 'Analyze', 'Import'];
const STEP_ICONS = ['📋', '✅', '🧠', '🚀'];

export default function ClickupImport() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [teams, setTeams] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [folders, setFolders] = useState([]);
  const [lists, setLists] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedLists, setSelectedLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiPlan, setAiPlan] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [viewMode, setViewMode] = useState('folder');

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const { data } = await clickupImport.getTeams();
      setTeams(data.teams || []);
      if (data.teams?.length === 1) {
        setSelectedTeam(data.teams[0]);
      }
    } catch (e) {
      toast.error('ClickUp API key not configured. Set CLICKUP_API_KEY in .env');
    }
    setLoading(false);
  };

  const loadSpaces = async (teamId) => {
    setLoading(true);
    try {
      const { data } = await clickupImport.getSpaces(teamId);
      setSpaces(data.spaces || []);
    } catch (e) { toast.error('Failed to load spaces'); }
    setLoading(false);
  };

  const loadFolders = async (spaceId) => {
    setLoading(true);
    try {
      const { data } = await clickupImport.getFolders(spaceId);
      setFolders(data.folders || []);
    } catch (e) { toast.error('Failed to load folders'); }
    setLoading(false);
  };

  const loadLists = async (spaceId, folderId) => {
    setLoading(true);
    try {
      const params = {};
      if (folderId) params.folderId = folderId;
      else params.spaceId = spaceId;
      const { data } = await clickupImport.getLists(params);
      setLists(data.lists || []);
    } catch (e) { toast.error('Failed to load lists'); }
    setLoading(false);
  };

  const handleSelectTeam = (team) => {
    setSelectedTeam(team);
    setSelectedSpace(null);
    setSelectedFolder(null);
    setSpaces([]);
    setFolders([]);
    setLists([]);
    setSelectedLists([]);
    setAiPlan(null);
    loadSpaces(team.id);
    setStep(0);
  };

  const handleSelectSpace = (space) => {
    setSelectedSpace(space);
    setSelectedFolder(null);
    setFolders([]);
    setLists([]);
    setSelectedLists([]);
    setAiPlan(null);
    loadFolders(space.id);
    setViewMode('folder');
  };

  const handleSelectFolder = (folder) => {
    setSelectedFolder(folder);
    setLists([]);
    setSelectedLists([]);
    setAiPlan(null);
    loadLists(selectedSpace.id, folder.id);
  };

  const handleViewSpaceLists = () => {
    setSelectedFolder(null);
    setViewMode('list');
    loadLists(selectedSpace.id, null);
  };

  const toggleList = (list) => {
    setSelectedLists(prev => {
      const exists = prev.find(l => l.id === list.id);
      if (exists) return prev.filter(l => l.id !== list.id);
      return [...prev, list];
    });
  };

  const toggleAllLists = () => {
    if (selectedLists.length === lists.length) {
      setSelectedLists([]);
    } else {
      setSelectedLists([...lists]);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedLists.length) return toast.error('Select at least one list');
    setLoading(true);
    setStep(2);
    try {
      const { data } = await clickupImport.analyze(selectedLists);
      if (data.plan) {
        setAiPlan(data.plan);
        setEditingPlan(JSON.parse(JSON.stringify(data.plan)));
      } else {
        toast.error('AI returned no plan');
        setStep(1);
      }
    } catch (e) {
      toast.error('Analysis failed: ' + (e.response?.data?.error || e.message));
      setStep(1);
    }
    setLoading(false);
  };

  const updatePlanItem = (index, field, value) => {
    const updated = [...editingPlan];
    updated[index] = { ...updated[index], [field]: value };
    setEditingPlan(updated);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const { data } = await clickupImport.execute(editingPlan);
      setImportResult(data);
      setStep(3);
      toast.success(`Imported ${data.totalTasks} tasks into ${data.projects.length} projects`);
    } catch (e) {
      toast.error('Import failed: ' + (e.response?.data?.error || e.message));
    }
    setImporting(false);
  };

  const resetAll = () => {
    setStep(0);
    setSelectedTeam(null);
    setSelectedSpace(null);
    setSelectedFolder(null);
    setSelectedLists([]);
    setAiPlan(null);
    setEditingPlan(null);
    setImportResult(null);
    setSpaces([]);
    setFolders([]);
    setLists([]);
    loadTeams();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">📋 ClickUp Import Wizard</h1>
          <p className="text-sm text-surface-500 mt-1">Browse your ClickUp workspace and import projects with AI</p>
        </div>
        {selectedTeam && (
          <button onClick={resetAll} className="text-xs text-surface-400 hover:text-surface-600 underline">
            Reset & Start Over
          </button>
        )}
      </div>

      {/* Steps Progress */}
      <div className="flex items-center gap-2 bg-white rounded-xl border border-surface-200 p-3">
        {STEPS.map((s, i) => (
          <div key={s} className={`flex items-center gap-2 ${i > 0 ? 'ml-2' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step > i ? 'bg-emerald-100 text-emerald-700' :
              step === i ? 'bg-primary-600 text-white' :
              'bg-surface-100 text-surface-400'
            }`}>
              {step > i ? '✓' : STEP_ICONS[i]}
            </div>
            <span className={`text-sm font-medium ${step >= i ? 'text-surface-900' : 'text-surface-400'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-surface-200 ml-2" />}
          </div>
        ))}
      </div>

      {/* Step 0: Browse Teams */}
      {step === 0 && (
        <div className="bg-white rounded-xl border border-surface-200 p-5">
          <h2 className="text-lg font-semibold text-surface-900 mb-4">Select a ClickUp Workspace</h2>
          {loading ? (
            <div className="text-center py-8 text-surface-400">Loading workspaces...</div>
          ) : teams.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-surface-400 mb-3">No workspaces found. Make sure your ClickUp API key is set.</p>
              <p className="text-xs text-surface-400">Set <code className="bg-surface-100 px-1 rounded">CLICKUP_API_KEY</code> in your backend .env file</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {teams.map(team => (
                <button key={team.id} onClick={() => handleSelectTeam(team)}
                  className="p-4 border-2 border-surface-200 rounded-xl hover:border-primary-300 hover:bg-primary-50/30 text-left transition-all">
                  <span className="text-2xl block mb-2">🏢</span>
                  <p className="font-semibold text-surface-900">{team.name}</p>
                  <p className="text-xs text-surface-400 mt-1">ID: {team.id}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 1: Browse & Select Lists */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Breadcrumb */}
          <div className="bg-white rounded-xl border border-surface-200 p-3 flex items-center gap-2 text-sm flex-wrap">
            <button onClick={resetAll} className="text-primary-600 hover:underline font-medium">{selectedTeam.name}</button>
            <span className="text-surface-300">/</span>
            <button onClick={() => { setSelectedSpace(null); setFolders([]); setLists([]); }}
              className={selectedSpace ? 'text-primary-600 hover:underline font-medium' : 'text-surface-900 font-semibold'}>
              {selectedSpace?.name || 'Select space'}
            </button>
            {selectedSpace && (
              <>
                <span className="text-surface-300">/</span>
                {viewMode === 'folder' ? (
                  selectedFolder ? (
                    <button onClick={() => { setSelectedFolder(null); loadFolders(selectedSpace.id); }}
                      className="text-primary-600 hover:underline font-medium">All folders</button>
                  ) : (
                    <span className="text-surface-900 font-semibold">Browse folders</span>
                  )
                ) : (
                  <span className="text-surface-900 font-semibold">All lists</span>
                )}
                {selectedFolder && (
                  <>
                    <span className="text-surface-300">/</span>
                    <span className="text-surface-900 font-semibold">{selectedFolder.name}</span>
                  </>
                )}
              </>
            )}
          </div>

          {/* Space selection */}
          {!selectedSpace && (
            <div className="bg-white rounded-xl border border-surface-200 p-5">
              <h2 className="text-lg font-semibold text-surface-900 mb-4">Select a Space</h2>
              {loading ? (
                <div className="text-center py-4 text-surface-400">Loading spaces...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {spaces.map(space => (
                    <button key={space.id} onClick={() => handleSelectSpace(space)}
                      className="p-4 border-2 border-surface-200 rounded-xl hover:border-primary-300 hover:bg-primary-50/30 text-left transition-all">
                      <span className="text-xl block mb-1">📁</span>
                      <p className="font-semibold text-surface-900 text-sm">{space.name}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Folder list or direct lists */}
          {selectedSpace && !selectedFolder && viewMode === 'folder' && (
            <div className="bg-white rounded-xl border border-surface-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-surface-900">Folders</h2>
                <button onClick={handleViewSpaceLists}
                  className="text-sm text-primary-600 hover:underline font-medium">
                  Or view all lists directly →
                </button>
              </div>
              {loading ? (
                <div className="text-center py-4 text-surface-400">Loading folders...</div>
              ) : folders.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-surface-400 mb-3">No folders in this space</p>
                  <button onClick={handleViewSpaceLists}
                    className="text-sm text-primary-600 hover:underline font-medium">
                    View lists directly in this space
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {folders.map(folder => (
                    <button key={folder.id} onClick={() => handleSelectFolder(folder)}
                      className="p-4 border-2 border-surface-200 rounded-xl hover:border-primary-300 hover:bg-primary-50/30 text-left transition-all">
                      <span className="text-xl block mb-1">📂</span>
                      <p className="font-semibold text-surface-900 text-sm">{folder.name}</p>
                      <p className="text-xs text-surface-400 mt-1">{folder.taskCount || '?'} tasks</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lists selection */}
          {(selectedFolder || viewMode === 'list') && (
            <div className="bg-white rounded-xl border border-surface-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-surface-900">
                  {selectedFolder ? `Lists in "${selectedFolder.name}"` : `Lists in "${selectedSpace.name}"`}
                </h2>
                {!viewMode && selectedFolder && (
                  <button onClick={handleViewSpaceLists}
                    className="text-sm text-primary-600 hover:underline font-medium">
                    View all lists in space
                  </button>
                )}
              </div>
              {loading ? (
                <div className="text-center py-4 text-surface-400">Loading lists...</div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-3 pb-3 border-b border-surface-100">
                    <label className="flex items-center gap-2 text-sm text-surface-600 cursor-pointer">
                      <input type="checkbox" checked={selectedLists.length === lists.length && lists.length > 0}
                        onChange={toggleAllLists} className="rounded border-surface-300 text-primary-600 focus:ring-primary-500" />
                      Select all ({lists.length})
                    </label>
                    <span className="text-xs text-surface-400">{selectedLists.length} selected</span>
                  </div>
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {lists.map(list => {
                      const isSelected = selectedLists.find(l => l.id === list.id);
                      return (
                        <label key={list.id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary-50 border border-primary-200' : 'hover:bg-surface-50 border border-transparent'
                          }`}>
                          <input type="checkbox" checked={!!isSelected}
                            onChange={() => toggleList(list)}
                            className="rounded border-surface-300 text-primary-600 focus:ring-primary-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-surface-900 truncate">{list.name}</p>
                            <p className="text-xs text-surface-400">{list.taskCount || 0} tasks {list.folder?.name ? `· ${list.folder.name}` : ''}</p>
                          </div>
                          {list.taskCount > 0 && (
                            <span className="text-xs bg-surface-100 text-surface-500 px-2 py-0.5 rounded-full">{list.taskCount}</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  {selectedLists.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-surface-200 flex items-center justify-between">
                      <p className="text-sm text-surface-600">
                        <strong>{selectedLists.length}</strong> lists selected
                        ({selectedLists.reduce((sum, l) => sum + (l.taskCount || 0), 0)} total tasks)
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => setStep(0)}
                          className="px-4 py-2 text-sm font-medium text-surface-600 bg-surface-100 rounded-lg hover:bg-surface-200">
                          Back
                        </button>
                        <button onClick={handleAnalyze}
                          className="px-5 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
                          🧠 Analyze with AI
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 2: AI Analysis Review */}
      {step === 2 && (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-xl border border-surface-200 p-12 text-center">
              <div className="w-12 h-12 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-surface-600 font-medium">🧠 AI is analyzing your ClickUp data...</p>
              <p className="text-xs text-surface-400 mt-2">Analyzing task content, statuses, tags, and structure</p>
            </div>
          ) : editingPlan ? (
            <>
              <div className="bg-white rounded-xl border border-surface-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-surface-900">🧠 AI Suggestion — Review & Edit</h2>
                  <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full font-medium">
                    {editingPlan.length} project(s)
                  </span>
                </div>
                <p className="text-sm text-surface-500 mb-5">
                  The AI analyzed your selected lists. Review the plan below — you can edit anything before importing.
                </p>
                {editingPlan.map((item, i) => (
                  <div key={i} className="mb-4 p-4 border border-surface-200 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium bg-surface-100 text-surface-500 px-2 py-0.5 rounded-full">{i + 1}</span>
                        <h3 className="font-semibold text-surface-900">{item.clickupListName}</h3>
                      </div>
                      <select value={item.action} onChange={e => updatePlanItem(i, 'action', e.target.value)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${
                          item.action === 'skip' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        }`}>
                        <option value="create_project">📦 Create Project</option>
                        <option value="skip">⏭️ Skip</option>
                      </select>
                    </div>
                    {item.action !== 'skip' && (
                      <div className="space-y-3 ml-6">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-surface-500 mb-1">Project Name</label>
                            <input value={item.projectName} onChange={e => updatePlanItem(i, 'projectName', e.target.value)}
                              className="s-input w-full text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-surface-500 mb-1">Project Type</label>
                            <select value={item.projectType} onChange={e => updatePlanItem(i, 'projectType', e.target.value)}
                              className="s-input w-full text-sm">
                              <option value="software">Software</option>
                              <option value="design">Design</option>
                              <option value="business">Business</option>
                              <option value="content">Content</option>
                              <option value="research">Research</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-surface-500 mb-1">Description</label>
                          <textarea value={item.description || ''} onChange={e => updatePlanItem(i, 'description', e.target.value)}
                            className="s-input w-full text-sm" rows={2} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-surface-500 mb-1">Phase</label>
                            <select value={item.phase} onChange={e => updatePlanItem(i, 'phase', e.target.value)}
                              className="s-input w-full text-sm">
                              <option value="discovery">Discovery</option>
                              <option value="planning">Planning</option>
                              <option value="development">Development</option>
                              <option value="testing">Testing</option>
                              <option value="review">Review</option>
                              <option value="launched">Launched</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-surface-500 mb-1">Status Mapping</label>
                            {item.statusMapping && Object.keys(item.statusMapping).length > 0 ? (
                              <div className="space-y-1 max-h-24 overflow-y-auto">
                                {Object.entries(item.statusMapping).map(([ck, val]) => (
                                  <div key={ck} className="flex items-center gap-2 text-xs">
                                    <span className="text-surface-500">{ck}:</span>
                                    <span className="text-surface-900 font-medium">{val}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-surface-400">Default mapping applied</p>
                            )}
                          </div>
                        </div>
                        {item.summary && (
                          <div className="bg-surface-50 rounded-lg p-3">
                            <p className="text-xs text-surface-500 italic">{item.summary}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <button onClick={() => setStep(1)}
                  className="px-4 py-2 text-sm font-medium text-surface-600 bg-surface-100 rounded-lg hover:bg-surface-200">
                  ← Back to Selection
                </button>
                <button onClick={handleImport} disabled={importing}
                  className="px-6 py-2.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
                  {importing ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Importing...</>
                  ) : (
                    <><span>🚀</span> Confirm & Import</>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-surface-200 p-8 text-center">
              <p className="text-surface-400">AI analysis returned no results. Try selecting different lists.</p>
              <button onClick={() => setStep(1)} className="mt-4 text-primary-600 hover:underline text-sm font-medium">
                ← Go back
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Import Results */}
      {step === 3 && importResult && (
        <div className="space-y-4">
          <div className={`rounded-xl border p-8 text-center ${
            importResult.errors?.length ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
          }`}>
            <span className="text-5xl block mb-4">{importResult.errors?.length ? '⚠️' : '🎉'}</span>
            <h2 className="text-2xl font-bold text-surface-900 mb-2">Import Complete</h2>
            <p className="text-surface-600 mb-6">
              {importResult.totalTasks} tasks imported across {importResult.projects.length} projects
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto mb-6">
              <div className="bg-white rounded-xl p-4 border border-surface-200">
                <p className="text-2xl font-bold text-primary-600">{importResult.projects.length}</p>
                <p className="text-xs text-surface-500">Projects created</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-surface-200">
                <p className="text-2xl font-bold text-emerald-600">{importResult.totalTasks}</p>
                <p className="text-xs text-surface-500">Tasks imported</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-surface-200">
                <p className="text-2xl font-bold text-red-500">{importResult.errors?.length || 0}</p>
                <p className="text-xs text-surface-500">Errors</p>
              </div>
            </div>
            {importResult.projects.length > 0 && (
              <div className="bg-white rounded-xl border border-surface-200 p-4 text-left max-w-lg mx-auto mb-6">
                <p className="text-sm font-semibold text-surface-700 mb-2">Projects Created:</p>
                {importResult.projects.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-surface-100 last:border-0">
                    <span className="text-sm text-surface-900">{p.name}</span>
                    <span className="text-xs text-surface-400">{p.taskCount} tasks</span>
                  </div>
                ))}
              </div>
            )}
            {importResult.errors?.length > 0 && (
              <details className="max-w-lg mx-auto text-left">
                <summary className="text-sm text-red-600 cursor-pointer font-medium">View {importResult.errors.length} error(s)</summary>
                <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-500 bg-red-50 p-2 rounded">{err}</p>
                  ))}
                </div>
              </details>
            )}
          </div>
          <div className="flex items-center justify-center gap-3">
            <button onClick={resetAll}
              className="px-5 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              Import Another
            </button>
            <a href="/admin"
              className="px-5 py-2 text-sm font-medium text-surface-600 bg-surface-100 rounded-lg hover:bg-surface-200">
              ← Back to Admin
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
