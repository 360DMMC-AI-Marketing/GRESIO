import { useState, useEffect, useRef, useCallback } from 'react';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import executeCommand from '../services/voiceActionRouter';
import { useAuth } from '../context/AuthContext';

export default function VoiceController() {
  const { isSupported, isListening, command, start, stop, clearCommand } = useSpeechRecognition();
  const { company } = useAuth();
  const [feedback, setFeedback] = useState(null);
  const activatedRef = useRef(false);
  const feedbackTimerRef = useRef(null);

  const showFeedback = useCallback((text, type) => {
    setFeedback({ text, type });
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), 3000);
  }, []);

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

  const isDismiss = useCallback((text) => {
    const t = text.trim().toLowerCase();
    return /\bthank\s*you\b/i.test(t) || /\bstop\s*listening\b/i.test(t) || /\bgo\s*to\s*sleep\b/i.test(t) || /\bcancel\b/i.test(t) || /\bnever\s*mind\b/i.test(t);
  }, []);

  const activate = useCallback(() => {
    start();
    activatedRef.current = true;
    showFeedback('Voice activated', 'wake');
  }, [start, showFeedback]);

  const deactivate = useCallback(() => {
    stop();
    activatedRef.current = false;
    setTimeout(() => start(), 300);
  }, [stop, start]);

  useEffect(() => {
    const handler = (e) => {
      if (e.altKey && e.key === 'v') {
        e.preventDefault();
        if (activatedRef.current) {
          deactivate();
          showFeedback('Voice off', 'info');
        } else {
          activate();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activate, deactivate, showFeedback]);

  useEffect(() => {
    if (!command || !activatedRef.current) return;
    if (isDismiss(command)) {
      executeCommand(command);
      clearCommand();
      setTimeout(() => deactivate(), 300);
      showFeedback('Voice off', 'info');
      return;
    }
    const result = executeCommand(command);
    clearCommand();
    showFeedback(result.message, result.success ? 'success' : 'error');
  }, [command, isDismiss, deactivate, showFeedback, clearCommand]);

  useEffect(() => {
    const handler = () => { stop(); activatedRef.current = false; };
    window.addEventListener('voice-chat-opened', handler);
    return () => window.removeEventListener('voice-chat-opened', handler);
  }, [stop]);

  useEffect(() => {
    const handler = () => { stop(); activatedRef.current = false; };
    window.addEventListener('assistant-opened', handler);
    return () => window.removeEventListener('assistant-opened', handler);
  }, [stop]);

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
      {feedback && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[99999]`}>
          <div className={`px-5 py-2.5 rounded-full text-xs font-medium animate-scale-in shadow-2xl border backdrop-blur-md whitespace-nowrap ${
            feedback.type === 'success' ? 'bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-border)]' :
            feedback.type === 'error' ? 'bg-[var(--danger-bg)] text-[var(--danger-text)] border-[var(--danger-border)]' :
            feedback.type === 'ai' ? 'glass-panel bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--glass-border)]' :
            feedback.type === 'wake' ? 'glass-panel bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--glass-border)]' :
            'glass-panel bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--glass-border)]'
          }`}>
            {feedback.type === 'success' && '✓ '}
            {feedback.type === 'error' && '✕ '}
            {feedback.text}
          </div>
        </div>
      )}
    </>
  );
}
