import { useState, useEffect } from 'react';

export default function CreateChainModal({ projects, initial, onSave, onClose }) {
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (initial) {
      setName(initial.name || '');
      setSelectedIds((initial.projects || []).map(p => p._id));
    }
  }, [initial]);

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleProject = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const moveUp = (id) => {
    const idx = selectedIds.indexOf(id);
    if (idx <= 0) return;
    const copy = [...selectedIds];
    [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
    setSelectedIds(copy);
  };

  const moveDown = (id) => {
    const idx = selectedIds.indexOf(id);
    if (idx === -1 || idx >= selectedIds.length - 1) return;
    const copy = [...selectedIds];
    [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
    setSelectedIds(copy);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), projects: selectedIds });
  };

  return (
    <div style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,0.3)',zIndex:1000,
      display:'flex',alignItems:'center',justifyContent:'center',padding:20,
    }} onClick={onClose}>
      <div style={{
        background:'white',borderRadius:12,padding:20,maxWidth:520,width:'100%',
        boxShadow:'0 10px 40px rgba(0,0,0,0.15)',maxHeight:'90vh',overflow:'auto',
      }} onClick={e => e.stopPropagation()}>
        <div style={{fontSize:14,fontWeight:700,color:'#111827',marginBottom:4}}>
          {initial ? 'Edit Chain' : 'New Chain'}
        </div>
        <div style={{fontSize:10,color:'#6b7280',marginBottom:14}}>
          {initial ? 'Update the chain name and project order.' : 'Create a project pipeline chain.'}
        </div>

        <div style={{marginBottom:12}}>
          <label style={{display:'block',fontSize:10,fontWeight:600,color:'#374151',marginBottom:4}}>Chain name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Winter Campaign Flow"
            style={{width:'100%',padding:'7px 10px',fontSize:11,border:'0.5px solid #d1d5db',borderRadius:6,outline:'none',boxSizing:'border-box'}}
            autoFocus
          />
        </div>

        <div style={{marginBottom:8}}>
          <label style={{display:'block',fontSize:10,fontWeight:600,color:'#374151',marginBottom:4}}>Projects (in order)</label>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects…"
            style={{width:'100%',padding:'6px 10px',fontSize:10,border:'0.5px solid #d1d5db',borderRadius:6,outline:'none',boxSizing:'border-box',marginBottom:6}}
          />
          <div style={{maxHeight:240,overflowY:'auto',border:'0.5px solid #e5e7eb',borderRadius:6}}>
            {filtered.length === 0 ? (
              <div style={{padding:12,textAlign:'center',fontSize:10,color:'#9ca3af'}}>No projects found</div>
            ) : (
              filtered.map(p => {
                const checked = selectedIds.includes(p._id);
                const idx = selectedIds.indexOf(p._id);
                return (
                  <div key={p._id}
                    style={{
                      display:'flex',alignItems:'center',gap:6,padding:'5px 8px',fontSize:10,
                      background: checked ? '#eff6ff' : 'transparent',
                      borderBottom:'0.5px solid #f3f4f6',cursor:'pointer',
                    }}
                    onClick={() => toggleProject(p._id)}
                  >
                    <input type="checkbox" checked={checked} readOnly
                      style={{accentColor:'#2347e8',margin:0}} />
                    <span style={{flex:1,color:'#111827',fontWeight:checked?600:400}}>{p.name}</span>
                    {p.projectType && <span style={{fontSize:8,color:'#9ca3af'}}>{p.projectType}</span>}
                    {checked && (
                      <span style={{display:'flex',gap:2,marginLeft:'auto'}}>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveUp(p._id); }}
                          disabled={idx === 0}
                          style={{padding:'1px 4px',fontSize:10,background:'#f3f4f6',border:'none',borderRadius:3,cursor:idx===0?'not-allowed':'pointer',color:'#374151',opacity:idx===0?0.4:1}}
                        >↑</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveDown(p._id); }}
                          disabled={idx === selectedIds.length - 1}
                          style={{padding:'1px 4px',fontSize:10,background:'#f3f4f6',border:'none',borderRadius:3,cursor:idx===selectedIds.length-1?'not-allowed':'pointer',color:'#374151',opacity:idx===selectedIds.length-1?0.4:1}}
                        >↓</button>
                        <span style={{fontSize:9,color:'#2347e8',fontWeight:600,marginLeft:4}}>#{idx + 1}</span>
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
          {selectedIds.length > 0 && (
            <div style={{marginTop:6,fontSize:9,color:'#6b7280'}}>
              {selectedIds.length} project{selectedIds.length > 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        <div style={{display:'flex',gap:6,justifyContent:'flex-end',marginTop:14}}>
          <button onClick={onClose}
            style={{padding:'6px 14px',background:'#f3f4f6',color:'#374151',borderRadius:6,fontSize:10,border:'none',cursor:'pointer',fontWeight:500}}>
            Cancel
          </button>
          <button onClick={handleSave}
            disabled={!name.trim()}
            style={{
              padding:'6px 14px',background: name.trim() ? '#2347e8' : '#d1d5db',
              color:'white',borderRadius:6,fontSize:10,border:'none',cursor: name.trim() ? 'pointer' : 'not-allowed',fontWeight:600,
            }}>
            {initial ? 'Save Changes' : 'Create Chain'}
          </button>
        </div>
      </div>
    </div>
  );
}
