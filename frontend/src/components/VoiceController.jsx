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
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[99999] px-5 py-2.5 rounded-full text-xs font-medium animate-scale-in shadow-elevation border backdrop-blur-md ${
          feedback.type === 'success' ? 'bg-success-50 dark:bg-[var(--success-bg)] text-success-700 dark:text-[var(--success-text)] border-success-200 dark:border-success-800' :
          feedback.type === 'error' ? 'bg-danger-50 text-danger-700 border-danger-200' :
          feedback.type === 'ai' ? 'bg-indigo-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 border-indigo-200 dark:border-brand-800' :
          feedback.type === 'wake' ? 'bg-neutral-50 dark:bg-[var(--bg-tertiary)] text-neutral-700 dark:text-[var(--text-secondary)] border-neutral-200 dark:border-[var(--border-primary)]' :
          'bg-neutral-50 dark:bg-[var(--bg-tertiary)] text-neutral-600 dark:text-[var(--text-secondary)] border-neutral-200 dark:border-[var(--border-primary)]'
        }`}>
          {feedback.type === 'success' && '✓ '}
          {feedback.type === 'error' && '✕ '}
          {feedback.text}
        </div>
      )}
    </>
  );
}
