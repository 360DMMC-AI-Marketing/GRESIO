import { useState, useRef, useCallback, useEffect } from 'react';

const SILENCE_TIMEOUT = 2000;

const WAKE_PATTERNS = [
  { re: /\bhey\s*gresio\b/i },
  { re: /\bhey\s*greesio\b/i },
  { re: /\bhey\s*greshio\b/i },
  { re: /\bhey\s*gressio\b/i },
  { re: /\bhey\s*gremio\b/i },
  { re: /\bhey\s*grelio\b/i },
  { re: /\bhey\s*gr[ae]sh?i?o\b/i },
  { re: /\bhello\s*gresio\b/i },
  { re: /\bhello\s*greesio\b/i },
  { re: /\bhello\s*greshio\b/i },
  { re: /\bher\s*gresio\b/i },
  { re: /\bher\s*greesio\b/i },
  { re: /\bher\s*greshio\b/i },
  { re: /\bgresio\b/i },
  { re: /\bgreesio\b/i },
  { re: /\bgreshio\b/i },
];

export default function useSpeechRecognition() {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [wakeWordDetected, setWakeWordDetected] = useState(false);
  const [command, setCommand] = useState('');

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const wakeRef = useRef(false);
  const commandAccumulatorRef = useRef('');

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      if (wakeRef.current && commandAccumulatorRef.current.trim()) {
        setCommand(commandAccumulatorRef.current.trim());
        commandAccumulatorRef.current = '';
      }
    }, SILENCE_TIMEOUT);
  }, []);

  const start = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recognitionRef.current) recognitionRef.current.stop();

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let final = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript.toLowerCase();
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      setInterimTranscript(interim);

      if (final) {
        if (!wakeRef.current) {
          let wakeMatch = null;
          for (const p of WAKE_PATTERNS) {
            const m = final.match(p.re);
            if (m) { wakeMatch = m; break; }
          }
          if (wakeMatch) {
            wakeRef.current = true;
            setWakeWordDetected(true);
            const afterWake = final.slice(wakeMatch.index + wakeMatch[0].length).trim();
            if (afterWake) {
              setCommand(afterWake);
              setTranscript(afterWake);
            } else {
              resetSilenceTimer();
            }
          }
        } else {
          commandAccumulatorRef.current += (commandAccumulatorRef.current ? ' ' : '') + final;
          setTranscript(commandAccumulatorRef.current);
          resetSilenceTimer();
        }
      }
    };

    recognition.onerror = () => {};

    recognition.onend = () => {
      if (isListening) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    setIsListening(true);

    try {
      recognition.start();
    } catch {}
  }, [isListening, resetSilenceTimer]);

  const stop = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setWakeWordDetected(false);
    wakeRef.current = false;
    commandAccumulatorRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setCommand('');
  }, []);

  const clearCommand = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setCommand('');
    commandAccumulatorRef.current = '';
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setCommand('');
    commandAccumulatorRef.current = '';
    setWakeWordDetected(false);
    wakeRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    wakeWordDetected,
    command,
    start,
    stop,
    reset,
    clearCommand,
  };
}
