import { useState, useEffect, useRef, useCallback } from 'react';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import executeCommand from '../services/voiceActionRouter';
import { useAuth } from '../context/AuthContext';

const STYLES = `
@keyframes radiance-pulse {
  0%, 100% { box-shadow: 0 0 60px rgba(35,71,232,0.06), 0 0 120px rgba(35,71,232,0.02); }
  50% { box-shadow: 0 0 80px rgba(35,71,232,0.1), 0 0 160px rgba(35,71,232,0.04); }
}
@keyframes bubble-in {
  from { opacity: 0; transform: translateY(20px) scale(0.92); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes card-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes wave-move {
  0%, 100% { transform: translateY(0) scaleY(1); }
  25% { transform: translateY(-5px) scaleY(1.15); }
  50% { transform: translateY(0) scaleY(0.85); }
  75% { transform: translateY(3px) scaleY(1.05); }
}
@keyframes pulse-dot {
  0%, 100% { opacity: 0.3; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.1); }
}
`;

function WaveAnimation() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 4, height: 36,
    }}>
      {[0,1,2,3,4,5,6,7].map(i => (
        <div key={i} style={{
          width: 3, borderRadius: 3,
          background: 'linear-gradient(to top, #6088ff, #8aaaff)',
          height: 12 + Math.sin(i * 0.8) * 10 + 6,
          animation: `wave-move 1.4s ease-in-out infinite`,
          animationDelay: `${i * 0.1}s`,
          opacity: 0.6,
        }} />
      ))}
    </div>
  );
}

function VoiceIndicator() {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[0,1,2].map(i => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: '50%',
          background: '#4ade80',
          animation: `pulse-dot 1.4s ease-in-out infinite`,
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  );
}

export default function AiAssistantPanel() {
  const [mode, setMode] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceMode, setVoiceMode] = useState('idle');
  const inputRef = useRef(null);
  const bottomRef = useRef(null);
  const panelRef = useRef(null);

  const speech = useSpeechRecognition();
  const { company } = useAuth();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, loading]);

  useEffect(() => {
    if (!mode) return;
    setTimeout(() => inputRef.current?.focus(), 200);
  }, [mode]);

  const openChat = useCallback(() => {
    if (speech.isListening) speech.stop();
    window.dispatchEvent(new CustomEvent('assistant-opened'));
    setMode('chat');
    setVoiceMode('idle');
    setVoiceTranscript('');
  }, [speech]);

  const openVoice = useCallback(() => {
    window.dispatchEvent(new CustomEvent('assistant-opened'));
    setMode('voice');
    setVoiceMode('listening');
    setVoiceTranscript('');
    speech.start(true);
  }, [speech]);

  const close = useCallback(() => {
    if (speech.isListening) speech.stop();
    setMode(null);
    setVoiceMode('idle');
    setVoiceTranscript('');
  }, [speech]);

  useEffect(() => {
    const handler = () => { if (mode) close(); };
    window.addEventListener('assistant-opened', handler);
    return () => window.removeEventListener('assistant-opened', handler);
  }, [mode, close]);

  useEffect(() => {
    if (!mode) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)
        && !e.target.closest('[data-assist-toggle]')) {
        close();
      }
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [mode, close]);

  useEffect(() => {
    const handler = (e) => {
      if (mode && e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mode, close]);

  useEffect(() => {
    const handler = () => { if (mode) close(); };
    window.addEventListener('voice-activated', handler);
    return () => window.removeEventListener('voice-activated', handler);
  }, [mode, close]);

  useEffect(() => {
    if (mode !== 'voice') return;
    if (speech.transcript) {
      setVoiceTranscript(speech.transcript);
    }
  }, [speech.transcript, mode]);

  useEffect(() => {
    if (mode !== 'voice' || !speech.command) return;
    setVoiceMode('executing');
    const cmd = speech.command;
    speech.clearCommand();
    executeAndShow(cmd);
  }, [speech.command, mode]);

  const isDismissCommand = useCallback((text) => {
    const t = text.trim().toLowerCase();
    return /\bthank\s*you\s*gresio\b/i.test(t)
      || /\bstop\s*listening\b/i.test(t)
      || /\bgo\s*to\s*sleep\b/i.test(t)
      || /\bcancel\b/i.test(t)
      || /\bnever\s*mind\b/i.test(t);
  }, []);

  const executeAndShow = useCallback((text) => {
    if (!text.trim()) return;
    if (isDismissCommand(text)) {
      executeCommand(text);
      close();
      return;
    }
    setConversation(prev => [...prev, { role: 'user', text }]);
    setLoading(true);
    setVoiceTranscript('');

    const result = executeCommand(text);
    if (result.isAi) {
      const handler = (e) => {
        window.removeEventListener('voice-ai-response', handler);
        setLoading(false);
        const msg = typeof e.detail === 'string' ? e.detail : e.detail?.message || 'Done';
        const success = typeof e.detail === 'object' ? e.detail.success !== false : true;
        setConversation(prev => [...prev, { role: 'system', text: msg, type: success ? 'success' : 'error' }]);
        setVoiceMode('done');
        setTimeout(() => { if (mode === 'voice') setVoiceMode('listening'); }, 800);
      };
      window.addEventListener('voice-ai-response', handler);
      setTimeout(() => {
        window.removeEventListener('voice-ai-response', handler);
        setLoading(false);
        setVoiceMode('listening');
      }, 15000);
    } else {
      setConversation(prev => [...prev, { role: 'system', text: result.message || 'Done', type: result.success ? 'success' : 'error' }]);
      setLoading(false);
      setVoiceMode('listening');
    }
  }, [isDismissCommand, close, mode]);

  const handleSubmit = useCallback(() => {
    const text = textInput.trim();
    if (!text || loading) return;
    setTextInput('');
    executeAndShow(text);
  }, [textInput, loading, executeAndShow]);

  useEffect(() => {
    if (mode === 'voice' && voiceMode === 'listening' && !speech.isListening) {
      speech.start(true);
    }
  }, [mode, voiceMode, speech]);

  useEffect(() => {
    if (mode === 'voice' && (voiceMode === 'idle' || voiceMode === 'done')) {
      if (speech.isListening && voiceMode === 'idle') speech.stop();
    }
  }, [mode, voiceMode, speech]);

  if (!company || company.plan !== 'enterprise') return null;

  const isVoiceActive = mode === 'voice';
  const isChatActive = mode === 'chat';

  return (
    <>
      <style>{STYLES}</style>

      {/* Attached Control Bar - centered at bottom, cloned inline design for both */}
      <div data-assist-toggle style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 100000,
        display: 'flex', alignItems: 'center',
        background: '#ffffff',
        borderRadius: 40,
        border: '0.5px solid #f3f4f6',
        boxShadow: '0 2px 16px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.02)',
        overflow: 'hidden',
      }}>
        <button data-assist-toggle onClick={openVoice}
          style={{
            padding: '8px 18px', background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, color: isVoiceActive ? '#2347e8' : '#6b7280', fontWeight: 500,
            transition: 'all 0.12s',
          }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#4ade80',
            animation: isVoiceActive ? 'pulse-dot 1.4s ease-in-out infinite' : 'none',
          }} />
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
          </svg>
          <span>Say "hey gresio" for voice</span>
        </button>

        <div style={{ width: 1, height: 18, background: '#f3f4f6', borderRadius: 1 }} />

        <button data-assist-toggle onClick={openChat}
          style={{
            padding: '8px 18px', background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, color: isChatActive ? '#2347e8' : '#6b7280', fontWeight: 500,
            transition: 'all 0.12s',
          }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#6088ff',
            animation: isChatActive ? 'pulse-dot 1.4s ease-in-out infinite' : 'none',
          }} />
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span>Chat</span>
        </button>
      </div>

      {/* Unified Centered Radiance Bubble - same container for Voice and Chat */}
      {mode && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          {/* Subtle backdrop */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(255,255,255,0.3)',
            backdropFilter: 'blur(2px)',
          }} />

          {/* Radiance glow ring */}
          <div style={{
            position: 'relative',
            animation: 'radiance-pulse 3s ease-in-out infinite',
            pointerEvents: 'auto',
          }}>
            <div ref={panelRef} style={{
              width: 370,
              minHeight: 380,
              borderRadius: 24,
              background: '#ffffff',
              boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
              border: '0.5px solid rgba(255,255,255,0.5)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              animation: 'bubble-in 0.25s cubic-bezier(.4,0,.2,1)',
              fontFamily: 'Inter, system-ui, sans-serif',
              position: 'relative',
            }}>
              {/* Close button */}
              <button onClick={close}
                style={{
                  position: 'absolute', top: 14, right: 14, zIndex: 2,
                  width: 28, height: 28, borderRadius: 8,
                  background: '#f9fafb', border: '0.5px solid #f3f4f6',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#9ca3af',
                  transition: 'all 0.12s',
                }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>

              {/* VOICE MODE */}
              {isVoiceActive && (
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 20, padding: 40, minHeight: 380,
                  textAlign: 'center',
                  background: 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.98) 0%, rgba(249,250,251,0.9) 100%)',
                }}>
                  {/* Header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 7,
                      background: 'linear-gradient(135deg, #6088ff 0%, #2347e8 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 600, color: '#fff',
                    }}>G</div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1f2937' }}>GRESIO Voice</span>
                    <VoiceIndicator />
                  </div>

                  {/* Wave + transcript when no conversation yet */}
                  {conversation.length === 0 && (
                    <>
                      <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
                      }}>
                        <WaveAnimation />
                        <div style={{
                          fontSize: 12, color: '#6b7280', fontWeight: 450,
                        }}>
                          {voiceTranscript || "I'm listening..."}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 10, color: '#9ca3af', lineHeight: 1.5, maxWidth: 200,
                      }}>
                        Say "thank you gresio" to finish
                      </div>
                    </>
                  )}

                  {/* Transcript after command */}
                  {voiceTranscript && conversation.length > 0 && (
                    <div style={{
                      background: '#ffffff',
                      borderRadius: 10, padding: '10px 16px',
                      border: '0.5px solid #f3f4f6',
                      fontSize: 12, color: '#6b7280',
                      display: 'flex', alignItems: 'center', gap: 8, maxWidth: '90%',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6088ff" strokeWidth="1.5">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      </svg>
                      <span style={{ color: '#1f2937', fontWeight: 450 }}>"{voiceTranscript}"</span>
                    </div>
                  )}

                  {/* Conversation results */}
                  {conversation.map((msg, i) => (
                    <div key={i} style={{ width: '100%', animation: 'card-in 0.2s ease' }}>
                      {msg.role === 'user' ? (
                        <div style={{
                          background: '#ffffff',
                          borderRadius: 12, padding: '10px 15px',
                          border: '0.5px solid #e5e7eb',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                          fontSize: 12, color: '#1f2937', lineHeight: 1.5,
                          display: 'flex', alignItems: 'flex-start', gap: 8, textAlign: 'left',
                        }}>
                          <span style={{ color: '#6088ff', fontWeight: 500, fontSize: 11 }}>&gt;</span>
                          <span>{msg.text}</span>
                        </div>
                      ) : (
                        <div style={{
                          background: msg.type === 'error' ? '#fef8f8' : '#ffffff',
                          borderRadius: 12, padding: '10px 15px',
                          border: msg.type === 'error' ? '0.5px solid #fce4e4' : '0.5px solid #e5e7eb',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                          fontSize: 12, color: msg.type === 'error' ? '#b91c1c' : '#4b5563',
                          lineHeight: 1.5, textAlign: 'left',
                          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        }}>
                          {msg.text}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Loading */}
                  {loading && (
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '4px 0' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6088ff', animation: 'pulse-dot 1s ease-in-out infinite' }} />
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6088ff', animation: 'pulse-dot 1s ease-in-out infinite 0.15s' }} />
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6088ff', animation: 'pulse-dot 1s ease-in-out infinite 0.3s' }} />
                    </div>
                  )}
                </div>
              )}

              {/* CHAT MODE */}
              {isChatActive && (
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  width: '100%', height: '100%', minHeight: 380,
                }}>
                  {/* Header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '16px 18px',
                    borderBottom: '0.5px solid #f3f4f6',
                    background: '#ffffff',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 9,
                      background: 'linear-gradient(135deg, #6088ff 0%, #2347e8 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 600, color: '#fff',
                    }}>G</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1f2937' }}>GRESIO Assistant</div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>Type a command</div>
                    </div>
                  </div>

                  {/* Scrollable content area */}
                  <div style={{
                    flex: 1, overflowY: 'auto', padding: '14px 16px',
                    display: 'flex', flexDirection: 'column', gap: 10,
                    background: '#f9fafb',
                  }}>
                    {conversation.length === 0 && (
                      <>
                        <div style={{
                          background: '#ffffff', borderRadius: 12, padding: 16,
                          border: '0.5px solid #f3f4f6',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                          animation: 'card-in 0.25s ease',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6088ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                            </svg>
                            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#1f2937' }}>Quick Actions</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {[
                              { label: 'Create project', cmd: 'create a project called new project' },
                              { label: 'Add task', cmd: 'add task implement feature to current project' },
                              { label: 'Generate report', cmd: 'generate a weekly report' },
                              { label: 'Launch', cmd: 'launch the current project' },
                            ].map((a, i) => (
                              <button key={i}
                                onClick={() => { setTextInput(a.cmd); inputRef.current?.focus(); }}
                                style={{
                                  fontSize: 10, padding: '5px 11px', borderRadius: 7,
                                  background: '#f8faff', border: '0.5px solid #dce6ff',
                                  color: '#2347e8', cursor: 'pointer', fontWeight: 500,
                                }}>
                                {a.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div style={{
                          background: '#ffffff', borderRadius: 12, padding: 16,
                          border: '0.5px solid #f3f4f6',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                          animation: 'card-in 0.25s ease 0.05s both',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6088ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                            </svg>
                            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#1f2937' }}>Try saying</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.8 }}>
                            "Assign login task to Sarah"<br />
                            "Create sprint 5 with goal launch MVP"<br />
                            "Mark task fix auth as done"
                          </div>
                        </div>
                      </>
                    )}

                    {conversation.map((msg, i) => (
                      <div key={i} style={{ animation: 'card-in 0.2s ease' }}>
                        {msg.role === 'user' ? (
                          <div style={{
                            background: '#ffffff', borderRadius: 12, padding: '11px 15px',
                            border: '0.5px solid #e5e7eb',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                            fontSize: 12, color: '#1f2937', lineHeight: 1.5,
                            display: 'flex', alignItems: 'flex-start', gap: 8,
                          }}>
                            <span style={{ color: '#6088ff', fontWeight: 500, fontSize: 11 }}>&gt;</span>
                            <span>{msg.text}</span>
                          </div>
                        ) : (
                          <div style={{
                            background: msg.type === 'error' ? '#fef8f8' : '#ffffff',
                            borderRadius: 12, padding: '11px 15px',
                            border: msg.type === 'error' ? '0.5px solid #fce4e4' : '0.5px solid #e5e7eb',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                            fontSize: 12, color: msg.type === 'error' ? '#b91c1c' : '#4b5563',
                            lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                          }}>
                            {msg.text}
                          </div>
                        )}
                      </div>
                    ))}

                    {loading && (
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '10px 0' }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6088ff', animation: 'pulse-dot 1s ease-in-out infinite' }} />
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6088ff', animation: 'pulse-dot 1s ease-in-out infinite 0.15s' }} />
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6088ff', animation: 'pulse-dot 1s ease-in-out infinite 0.3s' }} />
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>

                  {/* Input */}
                  <div style={{
                    padding: '12px 16px 14px',
                    borderTop: '0.5px solid #f3f4f6',
                    background: '#ffffff',
                  }}>
                    <div style={{
                      display: 'flex', gap: 8, alignItems: 'center',
                      background: '#f9fafb', borderRadius: 10,
                      padding: '2px 2px 2px 14px',
                      border: '0.5px solid #f3f4f6',
                    }}>
                      <input ref={inputRef} value={textInput}
                        onChange={e => setTextInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                        placeholder="Ask or command..."
                        style={{
                          flex: 1, border: 'none', outline: 'none',
                          background: 'transparent', fontSize: 12, color: '#374151',
                          padding: '7px 0',
                        }}
                      />
                      <button onClick={handleSubmit} disabled={loading || !textInput.trim()}
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: loading || !textInput.trim() ? '#f3f4f6' : '#2347e8',
                          color: loading || !textInput.trim() ? '#d1d5db' : '#fff',
                          border: 'none', cursor: loading || !textInput.trim() ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.12s',
                        }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
