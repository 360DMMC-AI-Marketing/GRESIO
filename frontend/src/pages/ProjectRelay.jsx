import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projects, chains } from '../services/api';
import ChainCard from '../components/ChainCard';
import CreateChainModal from '../components/CreateChainModal';

export default function ProjectRelay() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chainList, setChainList] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingChain, setEditingChain] = useState(null);

  const canManage = ['admin', 'project_manager', 'manager', 'team_lead'].includes(user?.role);

  useEffect(() => {
    chains.getAll().then(r => setChainList(r.data || [])).catch(() => {});
    projects.getAll().then(r => setAllProjects(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const linkedIds = new Set(
    chainList.flatMap(c => (c.projects || []).map(p => p._id))
  );
  const orphanProjects = allProjects.filter(p => !linkedIds.has(p._id));

  const handleCreate = async (data) => {
    try {
      const res = await chains.create(data);
      setChainList(prev => [res.data, ...prev]);
      setShowCreate(false);
    } catch (e) { console.error(e); }
  };

  const handleUpdate = async (id, data) => {
    try {
      const res = await chains.update(id, data);
      setChainList(prev => prev.map(c => c._id === id ? res.data : c));
      setEditingChain(null);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    try {
      await chains.remove(id);
      setChainList(prev => prev.filter(c => c._id !== id));
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span style={{fontSize:20}}>⚡</span>
            <span className="text-lg font-bold text-neutral-900">Project Relay</span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">
            Manage project pipelines and automatic handoffs
          </div>
        </div>
        {canManage && (
          <button data-voice="new-chain" onClick={() => setShowCreate(true)}
            style={{padding:'7px 14px',background:'#2347e8',color:'white',borderRadius:7,fontSize:11,fontWeight:600,border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
            + New Chain
          </button>
        )}
      </div>

      {chainList.length === 0 && orphanProjects.length === 0 ? (
        <div className="text-center py-20 text-neutral-400">
          <p className="text-3xl mb-2">⚡</p>
          <p style={{fontSize:13}}>No projects yet. Create a project first, then build your relay chain.</p>
        </div>
      ) : chainList.length === 0 ? (
        <div className="text-center py-16 text-neutral-400">
          <p className="text-3xl mb-2">🔗</p>
          <p style={{fontSize:13}}>No relay chains yet.</p>
          {canManage && (
            <button onClick={() => setShowCreate(true)}
              style={{marginTop:8,padding:'6px 14px',background:'#2347e8',color:'white',borderRadius:6,fontSize:11,fontWeight:600,border:'none',cursor:'pointer'}}>
              Create your first chain
            </button>
          )}
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {chainList.map(chain => (
            <ChainCard
              key={chain._id}
              chain={chain}
              onEdit={canManage ? () => setEditingChain(chain) : null}
              onDelete={canManage ? () => handleDelete(chain._id) : null}
              onProjectClick={(pid) => navigate(`/projects/${pid}`)}
            />
          ))}
        </div>
      )}

      {orphanProjects.length > 0 && chainList.length > 0 && (
        <div style={{marginTop:20}}>
          <div style={{fontSize:11,fontWeight:600,color:'#6b7280',marginBottom:8}}>
            Unlinked Projects ({orphanProjects.length})
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {orphanProjects.map(p => (
              <div key={p._id} onClick={() => navigate(`/projects/${p._id}`)}
                style={{padding:'5px 10px',background:'#f9fafb',border:'0.5px solid #e5e7eb',borderRadius:6,fontSize:10,color:'#374151',cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
                <span style={{fontSize:9,color:'#9ca3af'}}>{p.projectType}</span>
                {p.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chains section for future reference */}

      {showCreate && (
        <CreateChainModal
          projects={allProjects}
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
      {editingChain && (
        <CreateChainModal
          projects={allProjects}
          initial={editingChain}
          onSave={(data) => handleUpdate(editingChain._id, data)}
          onClose={() => setEditingChain(null)}
        />
      )}
    </div>
  );
}
