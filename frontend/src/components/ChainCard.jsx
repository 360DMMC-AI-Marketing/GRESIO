import { useNavigate } from 'react-router-dom';

const TYPE_ICONS = {
  software: '💻', design: '🎨', business: '📊', content: '📝', research: '🔬',
};

const STATUS_LABEL = {
  on_track: 'On Track', at_risk: 'At Risk', delayed: 'Delayed',
  blocked: 'Blocked', ready_to_test: 'Ready to Test', completed: 'Completed',
};

export default function ChainCard({ chain, onEdit, onDelete, onProjectClick }) {
  const navigate = useNavigate();
  const projects = chain.projects || [];
  const allDelivered = projects.length > 0 && projects.every(p => p.phase === 'delivered');

  return (
    <div style={{
      background:'white',
      border: allDelivered ? '0.5px solid #86efac' : '0.5px solid #e5e7eb',
      borderLeft: allDelivered ? '3px solid #22c55e' : '0.5px solid #e5e7eb',
      borderRadius:10,padding:'14px 16px',
    }}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <span style={{fontSize:12,fontWeight:700,color:'#111827'}}>{chain.name}</span>
          {allDelivered && (
            <span style={{fontSize:9,background:'#f0fdf4',color:'#22c55e',padding:'2px 7px',borderRadius:10,fontWeight:600}}>
              ✓ Completed
            </span>
          )}
          <span style={{fontSize:9,color:'#9ca3af'}}>{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
        </div>
        {!allDelivered && (
        <div style={{display:'flex',gap:4}}>
          {onEdit && (
            <button onClick={onEdit}
              style={{padding:'3px 8px',background:'#f3f4f6',color:'#374151',borderRadius:4,fontSize:9,border:'none',cursor:'pointer'}}>
              Edit
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete}
              style={{padding:'3px 8px',background:'#fff1f2',color:'#ef4444',borderRadius:4,fontSize:9,border:'none',cursor:'pointer'}}>
              Delete
            </button>
          )}
        </div>
        )}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:0,overflowX:'auto',paddingBottom:4}}>
        {projects.map((p, i) => (
          <div key={p._id} style={{display:'flex',alignItems:'center',flexShrink:0}}>
            <div
              onClick={() => onProjectClick?.(p._id)}
              style={{
                padding:'8px 12px',borderRadius:8,cursor:'pointer',minWidth:110,
                border: p.phase === 'delivered' ? '0.5px solid #86efac' : '0.5px solid #e5e7eb',
                background: p.phase === 'delivered' ? '#f0fdf4' : p.phase === 'launched' ? '#fffbeb' : 'white',
                transition:'box-shadow 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.1)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow='none'}
            >
              <div style={{display:'flex',alignItems:'center',gap:3,marginBottom:3}}>
                <span style={{fontSize:12}}>{TYPE_ICONS[p.projectType] || '📁'}</span>
                <span style={{fontSize:10,fontWeight:600,color:'#111827',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:80}}>{p.name}</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:4}}>
                <span style={{
                  fontSize:8,padding:'1px 5px',borderRadius:10,fontWeight:600,textTransform:'capitalize',
                  background: p.phase === 'delivered' ? '#22c55e' : p.phase === 'launched' ? '#eab308' : '#f3f4f6',
                  color: p.phase === 'delivered' ? 'white' : p.phase === 'launched' ? '#854d0e' : '#6b7280',
                }}>
                  {p.phase?.replace(/_/g,' ')}
                </span>
                {p.progress !== undefined && (
                  <span style={{fontSize:8,color:'#9ca3af'}}>{p.progress}%</span>
                )}
              </div>
            </div>
            {i < projects.length - 1 && (
              <div style={{display:'flex',alignItems:'center',margin:'0 6px',color:'#d1d5db',fontSize:16}}>→</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
