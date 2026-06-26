import { useState, useEffect, useRef, useCallback } from 'react';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import executeCommand from '../services/voiceActionRouter';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

function WaveAnimation() {
  return (
    <div className="flex items-center justify-center gap-[3px] h-9">
      {[0,1,2,3,4,5,6,7].map(i => (
        <div key={i} className="w-[3px] rounded-[3px] bg-gradient-to-t from-brand-400 to-brand-300"
          style={{
            height: `${12 + Math.sin(i * 0.8) * 10 + 6}px`,
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
    <div className="flex gap-[3px] items-center">
      {[0,1,2].map(i => (
        <span key={i} className="w-[5px] h-[5px] rounded-full bg-success-400"
          style={{
            animation: 'pulse-dot 1.4s ease-in-out infinite',
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
    speech.start();
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
    return /\bthank\s*you\b/i.test(t)
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
      speech.start();
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
      {/* Control Bar */}
      <div data-assist-toggle
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100000] flex items-center bg-white dark:bg-[var(--bg-primary)] rounded-full border border-neutral-200 dark:border-[var(--border-primary)] shadow-elevation overflow-hidden backdrop-blur-md glass-panel">
        <button data-assist-toggle onClick={openVoice}
          className={`flex items-center gap-2 px-4 py-2 bg-transparent border-none cursor-pointer text-xs font-medium transition-all ${
            isVoiceActive ? 'text-brand-600 dark:text-brand-400' : 'text-neutral-500 dark:text-[var(--text-tertiary)] hover:text-neutral-700 dark:hover:text-[var(--text-secondary)]'
          }`}>
          <span className="w-[7px] h-[7px] rounded-full bg-success-400"
            style={{ animation: isVoiceActive ? 'pulse-dot 1.4s ease-in-out infinite' : 'none' }} />
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
          </svg>
          <span>Voice</span>
        </button>

        <div className="w-px h-4 bg-neutral-200 dark:bg-[var(--border-primary)] rounded-full" />

        <button data-assist-toggle onClick={openChat}
          className={`flex items-center gap-2 px-4 py-2 bg-transparent border-none cursor-pointer text-xs font-medium transition-all ${
            isChatActive ? 'text-brand-600 dark:text-brand-400' : 'text-neutral-500 dark:text-[var(--text-tertiary)] hover:text-neutral-700 dark:hover:text-[var(--text-secondary)]'
          }`}>
          <span className="w-[7px] h-[7px] rounded-full bg-brand-400"
            style={{ animation: isChatActive ? 'pulse-dot 1.4s ease-in-out infinite' : 'none' }} />
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span>Chat</span>
        </button>
      </div>

      {/* Voice / Chat Panel */}
      {mode && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center"
          style={{ pointerEvents: 'none' }}>
          <div className="absolute inset-0 bg-black/10 dark:bg-black/30 backdrop-blur-sm" />

          <div className="relative animate-scale-in"
            style={{ pointerEvents: 'auto' }}>
            <div ref={panelRef}
              className="w-[370px] min-h-[380px] flex flex-col overflow-hidden rounded-[var(--radius-xl)] bg-white dark:bg-[var(--bg-primary)] border border-neutral-200 dark:border-[var(--glass-border)] shadow-elevation glow-card"
              style={{ animation: 'bubble-in 0.25s cubic-bezier(.4,0,.2,1)' }}>

              {/* Close button */}
              <button onClick={close}
                className="absolute top-3 right-3 z-10 w-7 h-7 rounded-[var(--radius-md)] bg-neutral-50 dark:bg-[var(--bg-tertiary)] border border-neutral-200 dark:border-[var(--border-primary)] cursor-pointer flex items-center justify-center text-neutral-400 dark:text-[var(--text-muted)] hover:text-neutral-600 dark:hover:text-[var(--text-secondary)] transition-all">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>

              {/* VOICE MODE */}
              {isVoiceActive && (
                <div className="flex flex-col items-center justify-center gap-5 p-10 min-h-[380px] text-center"
                  style={{background: 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.98) 0%, rgba(249,250,251,0.9) 100%)'}}>
                  <div className="flex items-center gap-2">
                    <Logo variant="iconOnly" size="sm" />
                    <span className="text-xs font-semibold text-neutral-900 dark:text-[var(--text-primary)]">Voice</span>
                    <VoiceIndicator />
                  </div>

                  {conversation.length === 0 && (
                    <>
                      <div className="flex flex-col items-center gap-3.5">
                        <WaveAnimation />
                        <div className="text-xs text-neutral-500 dark:text-[var(--text-tertiary)] font-medium">
                          {voiceTranscript || "I'm listening..."}
                        </div>
                      </div>
                      <div className="text-[10px] text-neutral-400 dark:text-[var(--text-muted)] leading-relaxed max-w-[180px]">
                        Say your command — "create a task", "go to dashboard", etc.
                      </div>
                    </>
                  )}

                  {voiceTranscript && conversation.length > 0 && (
                    <div className="card-premium bg-white dark:bg-[var(--bg-primary)] border border-neutral-200 dark:border-[var(--border-primary)] px-4 py-2.5 rounded-[var(--radius-lg)] text-xs text-neutral-500 dark:text-[var(--text-tertiary)] flex items-center gap-2 max-w-[90%]">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand-500 shrink-0">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      </svg>
                      <span className="text-neutral-800 dark:text-[var(--text-primary)] font-medium">"{voiceTranscript}"</span>
                    </div>
                  )}

                  {conversation.map((msg, i) => (
                    <div key={i} className="w-full animate-fade-in">
                      {msg.role === 'user' ? (
                        <div className="card-premium bg-white dark:bg-[var(--bg-primary)] border border-neutral-200 dark:border-[var(--border-primary)] px-3.5 py-2.5 rounded-[var(--radius-lg)] text-xs text-neutral-800 dark:text-[var(--text-primary)] leading-relaxed flex items-start gap-2 text-left shadow-sm">
                          <span className="text-brand-500 font-semibold text-[11px]">&gt;</span>
                          <span>{msg.text}</span>
                        </div>
                      ) : (
                        <div className={`px-3.5 py-2.5 rounded-[var(--radius-lg)] text-xs leading-relaxed text-left shadow-sm ${
                          msg.type === 'error' ? 'bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-400' :
                          'bg-white dark:bg-[var(--bg-primary)] border border-neutral-200 dark:border-[var(--border-primary)] text-neutral-600 dark:text-[var(--text-secondary)]'
                        }`}>
                          {msg.text}
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div className="flex gap-[5px] items-center py-1">
                      <span className="w-[5px] h-[5px] rounded-full bg-brand-400 animate-pulse-dot" />
                      <span className="w-[5px] h-[5px] rounded-full bg-brand-400 animate-pulse-dot" style={{ animationDelay: '0.15s' }} />
                      <span className="w-[5px] h-[5px] rounded-full bg-brand-400 animate-pulse-dot" style={{ animationDelay: '0.3s' }} />
                    </div>
                  )}
                </div>
              )}

              {/* CHAT MODE */}
              {isChatActive && (
                <div className="flex flex-col w-full h-full min-h-[380px]">
                  <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-neutral-100 dark:border-[var(--border-secondary)] bg-white dark:bg-[var(--bg-primary)]">
                    <Logo variant="iconOnly" size="sm" />
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-neutral-900 dark:text-[var(--text-primary)]">Assistant</div>
                      <div className="text-[10px] text-neutral-400 dark:text-[var(--text-muted)]">Type a command</div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-3.5 flex flex-col gap-2.5 bg-neutral-50 dark:bg-[var(--bg-secondary)]">
                    {conversation.length === 0 && (
                      <>
                        <div className="card-premium bg-white dark:bg-[var(--bg-primary)] border border-neutral-200 dark:border-[var(--border-primary)] p-4 rounded-[var(--radius-lg)] animate-fade-in">
                          <div className="flex items-center gap-2 mb-2.5">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500">
                              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                            </svg>
                            <span className="text-[11.5px] font-semibold text-neutral-800 dark:text-[var(--text-primary)]">Quick Actions</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: 'Create project', cmd: 'create a project called new project' },
                              { label: 'Add task', cmd: 'add task implement feature to current project' },
                              { label: 'Generate report', cmd: 'generate a weekly report' },
                              { label: 'Launch', cmd: 'launch the current project' },
                            ].map((a, i) => (
                              <button key={i} onClick={() => { setTextInput(a.cmd); inputRef.current?.focus(); }}
                                className="text-[10px] px-2.5 py-1 rounded-[var(--radius-md)] bg-indigo-50 dark:bg-brand-900/20 border border-indigo-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 cursor-pointer font-medium hover:bg-indigo-100 dark:hover:bg-brand-900/30 transition-all">
                                {a.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="card-premium bg-white dark:bg-[var(--bg-primary)] border border-neutral-200 dark:border-[var(--border-primary)] p-4 rounded-[var(--radius-lg)] animate-fade-in" style={{ animationDelay: '0.05s' }}>
                          <div className="flex items-center gap-2 mb-2.5">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500">
                              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                            </svg>
                            <span className="text-[11.5px] font-semibold text-neutral-800 dark:text-[var(--text-primary)]">Try saying</span>
                          </div>
                          <div className="text-[11px] text-neutral-500 dark:text-[var(--text-tertiary)] leading-relaxed">
                            "Assign login task to Sarah"<br />
                            "Create sprint 5 with goal launch MVP"<br />
                            "Mark task fix auth as done"
                          </div>
                        </div>
                      </>
                    )}

                    {conversation.map((msg, i) => (
                      <div key={i} className="animate-fade-in">
                        {msg.role === 'user' ? (
                          <div className="card-premium bg-white dark:bg-[var(--bg-primary)] border border-neutral-200 dark:border-[var(--border-primary)] px-3.5 py-2.5 rounded-[var(--radius-lg)] text-xs text-neutral-800 dark:text-[var(--text-primary)] leading-relaxed flex items-start gap-2 shadow-sm">
                            <span className="text-brand-500 font-semibold text-[11px]">&gt;</span>
                            <span>{msg.text}</span>
                          </div>
                        ) : (
                          <div className={`px-3.5 py-2.5 rounded-[var(--radius-lg)] text-xs leading-relaxed shadow-sm ${
                            msg.type === 'error' ? 'bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-400' :
                            'bg-white dark:bg-[var(--bg-primary)] border border-neutral-200 dark:border-[var(--border-primary)] text-neutral-600 dark:text-[var(--text-secondary)]'
                          }`}>
                            {msg.text}
                          </div>
                        )}
                      </div>
                    ))}

                    {loading && (
                      <div className="flex gap-[5px] items-center py-2.5">
                        <span className="w-[5px] h-[5px] rounded-full bg-brand-400 animate-pulse-dot" />
                        <span className="w-[5px] h-[5px] rounded-full bg-brand-400 animate-pulse-dot" style={{ animationDelay: '0.15s' }} />
                        <span className="w-[5px] h-[5px] rounded-full bg-brand-400 animate-pulse-dot" style={{ animationDelay: '0.3s' }} />
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>

                  {/* Input */}
                  <div className="px-4 py-3 border-t border-neutral-100 dark:border-[var(--border-secondary)] bg-white dark:bg-[var(--bg-primary)]">
                    <div className="flex gap-2 items-center bg-neutral-50 dark:bg-[var(--bg-secondary)] rounded-[var(--radius-lg)] p-0.5 pl-3.5 border border-neutral-100 dark:border-[var(--border-secondary)]">
                      <input ref={inputRef} value={textInput}
                        onChange={e => setTextInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                        placeholder="Ask or command..."
                        className="flex-1 border-none outline-none bg-transparent text-xs text-neutral-700 dark:text-[var(--text-secondary)] py-[7px] placeholder-neutral-400 dark:placeholder-[var(--text-muted)]"
                      />
                      <button onClick={handleSubmit} disabled={loading || !textInput.trim()}
                        className={`w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center border-none transition-all ${
                          loading || !textInput.trim() ? 'bg-neutral-100 dark:bg-[var(--bg-tertiary)] text-neutral-300 dark:text-[var(--text-muted)]' : 'bg-brand-600 text-white cursor-pointer hover:bg-brand-700'
                        }`}>
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
