import { useState, useEffect, useRef, useCallback } from 'react';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import executeCommand from '../services/voiceActionRouter';

const STYLES = `
@keyframes radiance-pulse {
  0%, 100% { transform: scale(1); opacity: 0.6; box-shadow: 0 0 60px rgba(35, 71, 232, 0.15), 0 0 120px rgba(35, 71, 232, 0.05); }
  50% { transform: scale(1.04); opacity: 1; box-shadow: 0 0 80px rgba(35, 71, 232, 0.25), 0 0 160px rgba(35, 71, 232, 0.1); }
}
@keyframes radiance-confirm {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.9; box-shadow: 0 0 120px rgba(35, 71, 232, 0.4); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes radiance-fade-in {
  from { opacity: 0; transform: translateY(10px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes radiance-success {
  0% { transform: scale(1); opacity: 1; }
  30% { transform: scale(1.3); opacity: 0.8; box-shadow: 0 0 200px rgba(35, 71, 232, 0.6); }
  100% { transform: scale(0.95); opacity: 0; }
}
`;

export default function VoiceController() {
  const { isSupported, isListening, transcript, interimTranscript, wakeWordDetected, command, start, stop, reset, clearCommand } = useSpeechRecognition();
  const [phase, setPhase] = useState('idle');
  const [pendingAction, setPendingAction] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackType, setFeedbackType] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const activatedRef = useRef(false);
  const feedbackTimerRef = useRef(null);

  const activate = useCallback(() => {
    start();
    setPhase('listening');
    activatedRef.current = true;
  }, [start]);

  const deactivate = useCallback(() => {
    stop();
    setPhase('idle');
    setPendingAction(null);
    activatedRef.current = false;
  }, [stop]);

  const showFeedback = useCallback((text, type) => {
    setFeedbackText(text);
    setFeedbackType(type);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedbackText('');
      setFeedbackType('');
    }, 3000);
  }, []);

  // Auto-execute pending command after cross-page navigation
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('voice_pending');
      if (stored) {
        sessionStorage.removeItem('voice_pending');
        const { command: pending } = JSON.parse(stored);
        if (pending) {
          activate();
          const tryExecute = (attempts) => {
            setPhase('executing');
            const result = executeCommand(pending);
            if (!result.success && result.message && result.message.includes('Could not find') && attempts > 0) {
              setPhase('listening');
              setTimeout(() => tryExecute(attempts - 1), 400);
              return;
            }
            if (result.stopListening) {
              setTimeout(() => deactivate(), 300);
              return;
            }
            showFeedback(result.message, result.success ? 'success' : 'error');
            setTimeout(() => { if (activatedRef.current) setPhase('listening'); }, 600);
          };
          tryExecute(8);
        }
      }
    } catch {}
  }, []);

  const isConfirmation = useCallback((text) => {
    const t = text.trim().toLowerCase();
    const confirmWords = /\b(yes|proceed|confirm|yep|yeah|sure|ok(?:ay)?)\b/i;
    const confirmPhrases = ['do it', 'go ahead', 'do that'];
    return confirmWords.test(t) || confirmPhrases.some(p => t.includes(p));
  }, []);

  const isRejection = useCallback((text) => {
    const t = text.trim().toLowerCase();
    const rejectWords = /\b(no|cancel|stop|nope|nevermind|abort|quit|exit|don'?t)\b/i;
    const rejectPhrases = ['forget it'];
    return rejectWords.test(t) || rejectPhrases.some(p => t.includes(p));
  }, []);

  const isDismissCommand = useCallback((text) => {
    const t = text.trim().toLowerCase();
    return /\bthank\s*you\s*gresio\b/i.test(t) || /\bstop\s*listening\b/i.test(t) || /\bgo\s*to\s*sleep\b/i.test(t);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!pendingAction) return;
    setPhase('executing');
    const result = executeCommand(pendingAction);
    if (result.stopListening) {
      setTimeout(() => deactivate(), 300);
      return;
    }
    showFeedback(result.message, result.success ? 'success' : 'error');
    clearCommand();
    setPendingAction(null);
    setTimeout(() => {
      if (activatedRef.current) setPhase('listening');
    }, 500);
  }, [pendingAction, deactivate, showFeedback, clearCommand]);

  const handleCancel = useCallback(() => {
    showFeedback('Cancelled', 'cancel');
    clearCommand();
    setPendingAction(null);
    setTimeout(() => {
      if (activatedRef.current) setPhase('listening');
    }, 200);
  }, [showFeedback, clearCommand]);

  useEffect(() => {
    if (!command) return;
    if (phase === 'listening') {
      // Dismiss commands bypass confirmation
      if (isDismissCommand(command)) {
        setPhase('executing');
        const result = executeCommand(command);
        clearCommand();
        setTimeout(() => deactivate(), 300);
        return;
      }
      setPhase('confirming');
      setPendingAction(command);
    } else if (phase === 'confirming' && pendingAction) {
      // Also handle dismiss during confirmation
      if (isDismissCommand(command)) {
        setPhase('executing');
        clearCommand();
        setPendingAction(null);
        setTimeout(() => deactivate(), 300);
        return;
      }
      if (isConfirmation(command)) {
        handleConfirm();
      } else if (isRejection(command)) {
        handleCancel();
      }
    }
  }, [command, phase, pendingAction, isConfirmation, isRejection, isDismissCommand, handleConfirm, handleCancel, clearCommand, deactivate]);

  useEffect(() => {
    const onKey = (e) => {
      if (phase === 'confirming') {
        if (e.key === 'Enter') handleConfirm();
        if (e.key === 'Escape') handleCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, handleConfirm, handleCancel]);

  useEffect(() => {
    if (wakeWordDetected && !activatedRef.current) {
      activate();
      showFeedback('I\'m listening...', 'wake');
      window.dispatchEvent(new CustomEvent('voice-activated'));
    }
  }, [wakeWordDetected, activate, showFeedback]);

  useEffect(() => {
    const handler = () => { if (activatedRef.current) deactivate(); };
    window.addEventListener('voice-chat-opened', handler);
    return () => window.removeEventListener('voice-chat-opened', handler);
  }, [deactivate]);

  useEffect(() => {
    const handler = (e) => {
      setAiResponse(e.detail);
      showFeedback(e.detail, 'ai');
    };
    window.addEventListener('voice-ai-response', handler);
    return () => window.removeEventListener('voice-ai-response', handler);
  }, [showFeedback]);

  if (!isSupported) return null;

  const isActive = phase !== 'idle';

  return (
    <>
      <style>{STYLES}</style>

      {/* Activation hint — visible only when idle */}
      {!isActive && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 99999, display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)',
          borderRadius: 40, padding: '6px 10px',
          boxShadow: '0 2px 20px rgba(0,0,0,0.06)', border: '0.5px solid rgba(0,0,0,0.04)',
          fontSize: 11, color: '#9ca3af', userSelect: 'none',
        }}>
          <span style={{ fontSize: 12, lineHeight: 1 }}>🎤</span>
          <span>Say <span style={{ color: '#2347e8', fontWeight: 500 }}>"hey gresio"</span> for voice</span>
          <span style={{ width: 1, height: 10, background: '#e5e7eb', margin: '0 4px' }} />
          <span style={{ fontSize: 12 }}>💬</span>
          <span style={{ color: '#6b7280' }}><span style={{ color: '#2347e8', fontWeight: 500 }}>Alt+V</span> for chat</span>
        </div>
      )}

      {/* Main Radiance overlay */}
      {isActive && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99998,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          {/* Backdrop blur layer */}
          <div style={{
            position: 'absolute', inset: 0,
            background: phase === 'executing' ? 'rgba(35,71,232,0.03)' : 'rgba(0,0,0,0.02)',
            backdropFilter: 'blur(1px)',
            transition: 'all 0.5s ease',
          }} />

          {/* Radiance ring */}
          <div style={{
            position: 'relative', marginBottom: 100,
            animation: phase === 'executing'
              ? 'radiance-success 0.8s ease forwards'
              : phase === 'confirming'
              ? 'radiance-confirm 1.2s ease-in-out infinite'
              : 'radiance-pulse 3s ease-in-out infinite',
            pointerEvents: 'auto',
          }}>
            {/* Outer glow */}
            <div style={{
              width: 240, height: 240, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(35,71,232,0.12) 0%, rgba(35,71,232,0.04) 50%, transparent 70%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 8,
            }}>
              {/* Inner ring */}
              <div style={{
                width: 160, height: 160, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.7) 60%, transparent 100%)',
                boxShadow: '0 0 40px rgba(35,71,232,0.08), inset 0 0 30px rgba(35,71,232,0.03)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 4, padding: 20,
                animation: 'radiance-fade-in 0.3s ease',
                textAlign: 'center',
              }}>

                {/* Phase: listening */}
                {phase === 'listening' && !pendingAction && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#2347e8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Listening
                    </div>
                    <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.4, maxWidth: 130, wordBreak: 'break-word' }}>
                      {transcript || interimTranscript || 'Say something...'}
                    </div>
                    {!transcript && !interimTranscript && (
                      <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#2347e8', animation: 'radiance-pulse 1s ease-in-out infinite' }} />
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#2347e8', animation: 'radiance-pulse 1s ease-in-out infinite 0.15s' }} />
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#2347e8', animation: 'radiance-pulse 1s ease-in-out infinite 0.3s' }} />
                      </div>
                    )}
                  </>
                )}

                {/* Phase: confirming */}
                {phase === 'confirming' && pendingAction && (
                  <>
                    <div style={{ fontSize: 9, fontWeight: 600, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      I understood
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#111827', lineHeight: 1.4, maxWidth: 160, wordBreak: 'break-word' }}>
                      "{pendingAction}"
                    </div>
                    <div style={{ fontSize: 8, color: '#9ca3af', marginTop: 2 }}>Say "yes" or click</div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                      <button onClick={handleConfirm}
                        style={{ padding: '4px 16px', background: '#2347e8', color: 'white', borderRadius: 20, fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>
                        Proceed ✓
                      </button>
                      <button onClick={handleCancel}
                        style={{ padding: '4px 16px', background: 'transparent', color: '#6b7280', borderRadius: 20, fontSize: 10, fontWeight: 500, border: '0.5px solid #e5e7eb', cursor: 'pointer', transition: 'all 0.2s' }}>
                        Cancel
                      </button>
                    </div>
                  </>
                )}

                {/* Phase: executing */}
                {phase === 'executing' && (
                  <div style={{ fontSize: 11, color: '#374151', fontWeight: 500 }}>
                    Processing...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback toast */}
      {feedbackText && (
        <div style={{
          position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 99999, padding: '8px 20px', borderRadius: 24, fontSize: 12, fontWeight: 500,
          background: feedbackType === 'success' ? '#f0fdf4' : feedbackType === 'error' ? '#fef2f2' : feedbackType === 'ai' ? '#eef2ff' : '#f9fafb',
          color: feedbackType === 'success' ? '#16a34a' : feedbackType === 'error' ? '#dc2626' : feedbackType === 'ai' ? '#2347e8' : '#374151',
          border: `0.5px solid ${
            feedbackType === 'success' ? '#bbf7d0' : feedbackType === 'error' ? '#fecaca' : feedbackType === 'ai' ? '#c7d2fe' : '#e5e7eb'
          }`,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          animation: 'radiance-fade-in 0.2s ease',
          backdropFilter: 'blur(12px)',
        }}>
          {feedbackType === 'success' && '✓ '}
          {feedbackType === 'error' && '✕ '}
          {feedbackText}
        </div>
      )}
    </>
  );
}
