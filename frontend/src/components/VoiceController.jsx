import { useState, useEffect, useRef, useCallback } from 'react';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import executeCommand from '../services/voiceActionRouter';
import { useAuth } from '../context/AuthContext';

const STYLES = `
@keyframes toast-in {
  from { opacity: 0; transform: translateY(10px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
`;

export default function VoiceController() {
  const { isSupported, isListening, transcript, interimTranscript, wakeWordDetected, command, start, stop, reset, clearCommand } = useSpeechRecognition();
  const { company } = useAuth();
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackType, setFeedbackType] = useState('');
  const activatedRef = useRef(false);
  const feedbackTimerRef = useRef(null);
  const deactivatedAtRef = useRef(0);

  const activate = useCallback(() => {
    start(true);
    activatedRef.current = true;
  }, [start]);

  const deactivate = useCallback(() => {
    stop();
    activatedRef.current = false;
    deactivatedAtRef.current = Date.now();
    setTimeout(() => start(), 300);
  }, [stop, start]);

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
            const result = executeCommand(pending);
            if (!result.success && result.message && result.message.includes('Could not find') && attempts > 0) {
              setTimeout(() => tryExecute(attempts - 1), 400);
              return;
            }
            showFeedback(result.message, result.success ? 'success' : 'error');
          };
          tryExecute(8);
        }
      }
    } catch {}
  }, []);

  // Alt+V toggles voice on/off
  useEffect(() => {
    const handler = (e) => {
      if (e.altKey && e.key === 'v') {
        e.preventDefault();
        if (activatedRef.current) {
          deactivate();
          showFeedback('Voice off', 'info');
        } else {
          activate();
          showFeedback('Voice activated', 'wake');
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activate, deactivate, showFeedback]);

  const isDismissCommand = useCallback((text) => {
    const t = text.trim().toLowerCase();
    return /\bthank\s*you\s*gresio\b/i.test(t) || /\bstop\s*listening\b/i.test(t) || /\bgo\s*to\s*sleep\b/i.test(t);
  }, []);

  // Execute command directly
  useEffect(() => {
    if (!command) return;
    if (!activatedRef.current) return;

    if (isDismissCommand(command)) {
      executeCommand(command);
      clearCommand();
      setTimeout(() => deactivate(), 300);
      showFeedback('Voice off', 'info');
      return;
    }

    const result = executeCommand(command);
    clearCommand();
    showFeedback(result.message, result.success ? 'success' : 'error');
  }, [command, isDismissCommand, deactivate, showFeedback, clearCommand]);

  // Wake word
  useEffect(() => {
    if (wakeWordDetected && !activatedRef.current) {
      if (Date.now() - deactivatedAtRef.current < 1500) return;
      activatedRef.current = true;
      showFeedback('Listening...', 'wake');
      window.dispatchEvent(new CustomEvent('voice-activated'));
    }
  }, [wakeWordDetected, showFeedback]);

  // Chat opened = stop listening
  useEffect(() => {
    const handler = () => {
      stop();
      activatedRef.current = false;
      deactivatedAtRef.current = Date.now();
    };
    window.addEventListener('voice-chat-opened', handler);
    return () => window.removeEventListener('voice-chat-opened', handler);
  }, [stop]);

  // Assistant panel opened = stop VoiceController's SR (panel has its own)
  useEffect(() => {
    const handler = () => {
      stop();
      activatedRef.current = false;
      deactivatedAtRef.current = Date.now();
    };
    window.addEventListener('assistant-opened', handler);
    return () => window.removeEventListener('assistant-opened', handler);
  }, [stop]);

  // AI response feedback
  useEffect(() => {
    const handler = (e) => {
      const detail = e.detail;
      const message = typeof detail === 'string' ? detail : detail?.message || '';
      showFeedback(message, 'ai');
    };
    window.addEventListener('voice-ai-response', handler);
    return () => window.removeEventListener('voice-ai-response', handler);
  }, [showFeedback]);

  if (!company || company.plan !== 'enterprise') return null;
  if (!isSupported) return null;

  return (
    <>
      <style>{STYLES}</style>

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
          animation: 'toast-in 0.2s ease',
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
