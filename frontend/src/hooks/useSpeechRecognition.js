import { useState, useRef, useCallback, useEffect } from 'react';

const SILENCE_TIMEOUT = 2000;

export default function useSpeechRecognition() {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [command, setCommand] = useState('');

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const commandAccumulatorRef = useRef('');
  const listeningRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      if (commandAccumulatorRef.current.trim()) {
        setCommand(commandAccumulatorRef.current.trim());
        commandAccumulatorRef.current = '';
      }
    }, SILENCE_TIMEOUT);
  }, []);

  const start = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recognitionRef.current) {
      listeningRef.current = false;
      recognitionRef.current.stop();
    }

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
        commandAccumulatorRef.current += (commandAccumulatorRef.current ? ' ' : '') + final;
        setTranscript(commandAccumulatorRef.current);
        resetSilenceTimer();
      }
    };

    recognition.onerror = () => {};

    recognition.onend = () => {
      if (listeningRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    listeningRef.current = true;
    setIsListening(true);

    try {
      recognition.start();
    } catch {}
  }, [resetSilenceTimer]);

  const stop = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    listeningRef.current = false;
    setIsListening(false);
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
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    command,
    start,
    stop,
    reset,
    clearCommand,
  };
}
