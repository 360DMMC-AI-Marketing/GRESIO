import { useState, useEffect, useRef, useCallback } from 'react';
import executeCommand from '../services/voiceActionRouter';
import Logo from './Logo';

const STYLES = `
@keyframes chat-pop {
  from { opacity: 0; transform: scale(0.92) translateY(12px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes chat-bubble-in {
  from { opacity: 0; transform: translateY(8px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes chat-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(35,71,232,0.15), 0 0 40px rgba(35,71,232,0.05); }
  50% { box-shadow: 0 0 30px rgba(35,71,232,0.25), 0 0 60px rgba(35,71,232,0.1); }
}
`;

export default function ChatInterface() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation, loading]);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 200);
  }, [open]);

  const toggle = useCallback(() => {
    setOpen(prev => {
      if (!prev) {
        window.dispatchEvent(new CustomEvent('voice-chat-opened'));
      }
      return !prev;
    });
    setInput('');
  }, []);

  useEffect(() => {
    const handler = () => { if (open) setOpen(false); };
    window.addEventListener('voice-activated', handler);
    return () => window.removeEventListener('voice-activated', handler);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && !e.target.closest('[data-chat-toggle]')) {
        setOpen(false);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (open && e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setConversation(prev => [...prev, { role: 'user', text }]);
    setLoading(true);
    const result = executeCommand(text);
    if (result.isAi) {
      const responseHandler = (e) => {
        window.removeEventListener('voice-ai-response', responseHandler);
        setLoading(false);
        const msg = typeof e.detail === 'string' ? e.detail : e.detail?.message || 'Done';
        const success = typeof e.detail === 'object' ? e.detail.success !== false : true;
        setConversation(prev => [...prev, { role: 'system', text: msg, type: success ? 'success' : 'error' }]);
      };
      window.addEventListener('voice-ai-response', responseHandler);
      setTimeout(() => {
        window.removeEventListener('voice-ai-response', responseHandler);
        setLoading(false);
      }, 15000);
    } else {
      setConversation(prev => [...prev, { role: 'system', text: result.message || 'Done', type: result.success ? 'success' : 'error' }]);
      setLoading(false);
    }
  };

  return (
    <>
      <style>{STYLES}</style>

      {/* Toggle button */}
      <button data-chat-toggle data-voice="open-chat" onClick={toggle}
        title={open ? 'Close chat' : 'Open chat'}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 100000,
          width: 52, height: 52, borderRadius: 16,
          background: 'linear-gradient(135deg, #2347e8 0%, #1a36c4 100%)',
          color: 'white', border: 'none', cursor: 'pointer',
          animation: 'chat-glow 3s ease-in-out infinite',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, transition: 'all 0.25s cubic-bezier(.4,0,.2,1)',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
        }}>
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        )}
      </button>

      {/* Chat popover */}
      {open && (
        <div ref={panelRef} style={{
          position: 'fixed', bottom: 88, right: 24,
          zIndex: 99999,
          width: 360, maxHeight: 520,
          background: '#ffffff',
          borderRadius: 20,
          boxShadow: '0 8px 48px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.04)',
          border: '0.5px solid rgba(0,0,0,0.04)',
          animation: 'chat-pop 0.2s cubic-bezier(.4,0,.2,1)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '14px 16px',
            borderBottom: '0.5px solid #f0f0f0',
          }}>
            <Logo size="sm" showTagline tagline="Type a command, get it done" />
            <div style={{ flex: 1 }} />
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 8,
            background: '#fafafa',
          }}>
            {conversation.length === 0 && (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 6,
                color: '#c4c4c4', fontSize: 12, padding: '20px 0',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span>Type a command to get started</span>
              </div>
            )}
            {conversation.map((msg, i) => (
              <div key={i} style={{
                animation: 'chat-bubble-in 0.2s ease',
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
              }}>
                <div style={{
                  padding: '8px 13px',
                  borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: msg.role === 'user' ? '#2347e8' : msg.type === 'error' ? '#fee2e2' : '#ffffff',
                  color: msg.role === 'user' ? '#ffffff' : msg.type === 'error' ? '#dc2626' : '#1f2937',
                  fontSize: 12.5, lineHeight: 1.5,
                  boxShadow: msg.role === 'user' ? 'none' : '0 1px 4px rgba(0,0,0,0.04), 0 0.5px 1px rgba(0,0,0,0.02)',
                  border: msg.role === 'system' ? '0.5px solid #f0f0f0' : 'none',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{
                alignSelf: 'flex-start', animation: 'chat-bubble-in 0.2s ease',
              }}>
                <div style={{
                  padding: '10px 14px', borderRadius: '14px 14px 14px 4px',
                  background: '#ffffff', border: '0.5px solid #f0f0f0',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  display: 'flex', gap: 4, alignItems: 'center',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#2347e8', animation: 'radiance-pulse 1s ease-in-out infinite' }} />
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#2347e8', animation: 'radiance-pulse 1s ease-in-out infinite 0.15s' }} />
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#2347e8', animation: 'radiance-pulse 1s ease-in-out infinite 0.3s' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px 12px',
            borderTop: '0.5px solid #f0f0f0',
            background: '#ffffff',
          }}>
            <div style={{
              display: 'flex', gap: 8, alignItems: 'center',
              background: '#f5f5f5', borderRadius: 12,
              padding: '2px 2px 2px 14px',
              border: '0.5px solid transparent',
              transition: 'border-color 0.2s',
            }}>
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="Type a command..."
                style={{
                  flex: 1, border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 13, color: '#111', padding: '8px 0',
                }}
              />
              <button onClick={handleSubmit} disabled={loading || !input.trim()}
                style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: loading || !input.trim() ? '#e5e7eb' : '#2347e8',
                  color: 'white', border: 'none', cursor: loading || !input.trim() ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
