import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useState } from 'react';

/** Saudi Arabic is the locale Riyadh phones ship with; Egyptian speech is understood by it too. */
const SPEECH_LOCALE = 'ar-SA';

const QUIET_ERRORS = ['aborted', 'no-speech'];

export interface VoiceInput {
  readonly isAvailable: boolean;
  readonly isListening: boolean;
  /** Words heard so far, while the person is still talking. */
  readonly partial: string;
  readonly problem: string;
  start: () => Promise<void>;
  stop: () => void;
}

function recognitionAvailable(): boolean {
  try {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false;
  }
}

/** Listens through the microphone and hands over the finished sentence. */
export function useVoiceInput(onSentence: (text: string) => void): VoiceInput {
  const [isListening, setIsListening] = useState(false);
  const [partial, setPartial] = useState('');
  const [problem, setProblem] = useState('');

  useSpeechRecognitionEvent('result', (event) => {
    const heard = event.results[0]?.transcript ?? '';
    if (!event.isFinal) return setPartial(heard);
    setPartial('');
    if (heard.trim() !== '') onSentence(heard.trim());
  });
  useSpeechRecognitionEvent('end', () => setIsListening(false));
  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    setPartial('');
    if (QUIET_ERRORS.includes(event.error)) return;
    setProblem(event.error === 'not-allowed' ? 'اسمح للتطبيق باستخدام الميكروفون من إعدادات الموبايل.' : 'ما قدرتش أسمعك. جرّب تاني.');
  });

  const start = async (): Promise<void> => {
    setProblem('');
    Speech.stop();
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) return setProblem('اسمح للتطبيق باستخدام الميكروفون من إعدادات الموبايل.');
    setIsListening(true);
    ExpoSpeechRecognitionModule.start({ lang: SPEECH_LOCALE, interimResults: true });
  };
  const stop = (): void => ExpoSpeechRecognitionModule.stop();

  return { isAvailable: recognitionAvailable(), isListening, partial, problem, start, stop };
}

/** Reads a reply aloud in Arabic. Silently does nothing when the phone has no Arabic voice. */
export function speak(text: string): void {
  Speech.stop();
  if (text.trim() !== '') Speech.speak(text, { language: SPEECH_LOCALE });
}

export function stopSpeaking(): void {
  Speech.stop();
}
