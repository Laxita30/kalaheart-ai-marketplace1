import { useEffect, useRef, useState } from "react";

// Minimal types for the Web Speech API (vendor-prefixed)
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function useSpeechRecognition(language: string) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalRef = useRef("");

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    setSupported(!!Ctor);
  }, []);

  const start = () => {
    setError(null);
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setError("Speech recognition not supported in this browser. Try Chrome or Edge.");
      return;
    }
    const recog = new Ctor();
    recog.lang = language;
    recog.continuous = true;
    recog.interimResults = true;
    finalRef.current = transcript ? transcript + " " : "";

    recog.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finalRef.current += res[0].transcript + " ";
        else interim += res[0].transcript;
      }
      setTranscript((finalRef.current + interim).trim());
    };
    recog.onerror = (e) => {
      setError(e.error || "Microphone error");
      setListening(false);
    };
    recog.onend = () => setListening(false);

    try {
      recog.start();
      recognitionRef.current = recog;
      setListening(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start microphone");
    }
  };

  const stop = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const reset = () => {
    finalRef.current = "";
    setTranscript("");
    setError(null);
  };

  const setExternalText = (text: string) => {
    finalRef.current = text;
    setTranscript(text);
  };

  return { supported, listening, transcript, error, start, stop, reset, setExternalText };
}