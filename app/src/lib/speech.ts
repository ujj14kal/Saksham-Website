import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import { synthesizeSpeech } from '@/lib/api';
import type { LanguageCode } from '@/lib/api';
import { speechTagFor } from '@/constants/languages';

let speaking = false;
let player: AudioPlayer | null = null;
let webAudio: HTMLAudioElement | null = null;
let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
// bumped on every speak()/stopSpeaking() so a slow TTS response that resolves
// after the user has moved on doesn't start playing over the next prompt.
let generation = 0;

/** Callbacks so a caller can reveal the reply text in step with the audio. */
export interface SpeakHandlers {
  /** playback position as a 0–1 fraction, fired repeatedly while speaking */
  onProgress?: (fraction: number) => void;
  /** fired once when playback finishes (or is stopped) */
  onDone?: () => void;
}

function clearFallbackTimer() {
  if (fallbackTimer) {
    clearTimeout(fallbackTimer);
    fallbackTimer = null;
  }
}

function cleanupPlayer() {
  if (player) {
    try {
      player.remove();
    } catch {
      // already released
    }
    player = null;
  }
  if (webAudio) {
    try {
      webAudio.pause();
      webAudio.src = '';
    } catch {
      // already released
    }
    webAudio = null;
  }
  clearFallbackTimer();
}

/** Roughly how many characters a second the device voice speaks, per script.
 *
 *  A single figure was used for every language, which drifts badly: Devanagari
 *  and the southern scripts pack a syllable into fewer characters than Latin,
 *  so the same sentence is shorter on screen but takes the same time to say —
 *  the text reveal ran ahead of the voice in exactly the languages most
 *  beneficiaries use. These are still estimates (expo-speech reports no
 *  playback position), but per-script ones. */
const CHARS_PER_SECOND: Partial<Record<LanguageCode, number>> = {
  en: 13,
  // Indic scripts: fewer characters for the same spoken duration
  hi: 9,
  mr: 9,
  bn: 9,
  gu: 9,
  pa: 9,
  or: 9,
  // Dravidian scripts are more agglutinative again
  ta: 8,
  te: 8,
  kn: 8,
};
const DEFAULT_CHARS_PER_SECOND = 10;

function spokenTextForTts(text: string, language: LanguageCode): string {
  if (language !== 'hi') return text;
  return text
    .replace(/साक्षम/g, 'सक्षम')
    .replace(/Saksham/gi, 'सक्षम')
    .replace(/\bAI\b/g, 'ए आई')
    .replace(/\bNSQF\b/g, 'एन एस क्यू एफ')
    .replace(/\bPM-AJAY\b/g, 'पी एम अजय')
    .replace(/\bNCS\b/g, 'एन सी एस');
}

/** On-device TTS. We get no real playback position from expo-speech, so drive
 *  `onProgress` off a wall-clock estimate calibrated per script. */
function deviceSpeak(text: string, language: LanguageCode, myGeneration: number, handlers?: SpeakHandlers) {
  const ttsText = spokenTextForTts(text, language);
  Speech.stop();
  speaking = true;

  const charsPerSecond = CHARS_PER_SECOND[language] ?? DEFAULT_CHARS_PER_SECOND;
  const estimatedMs = Math.max(1200, (ttsText.length / charsPerSecond) * 1000);
  const startedAt = Date.now();
  const tick = () => {
    if (myGeneration !== generation) return;
    const fraction = Math.min(1, (Date.now() - startedAt) / estimatedMs);
    handlers?.onProgress?.(fraction);
    if (fraction < 1) fallbackTimer = setTimeout(tick, 90);
  };
  tick();

  Speech.speak(ttsText, {
    language: speechTagFor(language),
    rate: 0.92,
    pitch: 1.0,
    onDone: () => {
      speaking = false;
      clearFallbackTimer();
      if (myGeneration === generation) {
        handlers?.onProgress?.(1);
        handlers?.onDone?.();
      }
    },
    onStopped: () => {
      speaking = false;
      clearFallbackTimer();
    },
    onError: () => {
      speaking = false;
      clearFallbackTimer();
      if (myGeneration === generation) handlers?.onDone?.();
    },
  });
}

/** Speak text aloud in the given language via Sarvam TTS (proxied through the
 *  backend), falling back to the on-device engine on any failure. Any
 *  in-progress utterance is stopped first. Pass `handlers` to sync UI (e.g. a
 *  typing reveal) to the spoken audio. */
export async function speak(text: string, language: LanguageCode, handlers?: SpeakHandlers) {
  if (!text) return;
  stopSpeaking();
  const myGeneration = generation;
  speaking = true;
  const ttsText = spokenTextForTts(text, language);

  try {
    const { audioUrl, format } = await synthesizeSpeech(ttsText, language);
    if (myGeneration !== generation) return;
    if (format === 'text' || !audioUrl.startsWith('data:audio')) {
      deviceSpeak(ttsText, language, myGeneration, handlers);
      return;
    }

    if (Platform.OS === 'web') {
      const audio = new Audio(audioUrl);
      webAudio = audio;
      audio.ontimeupdate = () => {
        if (myGeneration === generation && audio.duration > 0) {
          handlers?.onProgress?.(Math.min(1, audio.currentTime / audio.duration));
        }
      };
      audio.onended = () => {
        speaking = false;
        if (myGeneration === generation) {
          handlers?.onProgress?.(1);
          handlers?.onDone?.();
        }
      };
      audio.onerror = () => {
        speaking = false;
        if (myGeneration === generation) handlers?.onDone?.();
      };
      await audio.play();
      return;
    }

    const base64 = audioUrl.slice(audioUrl.indexOf(',') + 1);
    const file = new File(Paths.cache, `tts-${Date.now()}.wav`);
    try {
      file.create({ overwrite: true });
    } catch {
      // create() throws only if it already exists without overwrite — ignore
    }
    file.write(base64, { encoding: 'base64' });

    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    if (myGeneration !== generation) {
      try {
        file.delete();
      } catch {
        // best effort
      }
      return;
    }

    player = createAudioPlayer(file.uri, { updateInterval: 100 });
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (myGeneration !== generation) return;
      if (status.duration > 0) {
        handlers?.onProgress?.(Math.min(1, status.currentTime / status.duration));
      }
      if (status.didJustFinish) {
        speaking = false;
        handlers?.onProgress?.(1);
        handlers?.onDone?.();
        sub.remove();
        cleanupPlayer();
        try {
          file.delete();
        } catch {
          // best effort
        }
      }
    });
    player.play();
  } catch (e) {
    console.warn('[speech] Sarvam TTS failed, using on-device voice:', e);
    if (myGeneration === generation) deviceSpeak(ttsText, language, myGeneration, handlers);
  }
}

export function stopSpeaking() {
  generation += 1;
  Speech.stop();
  cleanupPlayer();
  speaking = false;
}

export function isSpeaking() {
  return speaking;
}

/** first `fraction` (0–1) of `text`, rounded to whole words and nudged slightly
 *  ahead of the audio so each word shows just before it is heard. Pair with
 *  `speak(..., { onProgress })` to type a reply out in time with the voice. */
export function revealPortion(text: string, fraction: number): string {
  if (fraction >= 1) return text;
  const words = text.split(' ');
  const count = Math.max(1, Math.floor(words.length * Math.min(1, fraction * 1.08)));
  return words.slice(0, count).join(' ');
}
