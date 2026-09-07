import { env, hasBhashini, hasGroq, hasSarvam } from "../lib/env.js";
import { GROQ_TRANSCRIPTION_URL, GROQ_WHISPER_MODEL } from "../lib/groq.js";
import type { Language } from "@prisma/client";

/**
 * Speech-to-text and text-to-speech.
 *
 * STT priority: Sarvam (best accuracy for Indian languages) -> Groq Whisper
 * (multilingual fallback, used only if a configured Sarvam call actually
 * fails). Real recordings must never be replaced with canned text.
 */

export interface TranscribeResult {
  transcript: string;
  language: Language;
  provider: "sarvam" | "groq" | "bhashini";
  /** Only present when the provider actually reports one (Sarvam's
   *  language_probability). Absent means unknown — never a stand-in value. */
  confidence?: number;
}

export interface SynthesizeResult {
  /** base64 `data:` URI (sarvam/mock) or CDN URL (bhashini) of the spoken audio */
  audioUrl: string;
  provider: "sarvam" | "bhashini" | "mock";
  format: "wav" | "mp3" | "text";
}

export class TranscriptionUnavailableError extends Error {
  constructor() {
    super("Speech transcription is not configured. Add SARVAM_API_KEY or GROQ_API_KEY to server/.env, then restart the server.");
    this.name = "TranscriptionUnavailableError";
  }
}

const SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text";
const SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech";

const SARVAM_LANGUAGE_CODES: Record<Language, string> = {
  en: "en-IN",
  hi: "hi-IN",
  bn: "bn-IN",
  ta: "ta-IN",
  te: "te-IN",
  mr: "mr-IN",
  kn: "kn-IN",
  gu: "gu-IN",
  pa: "pa-IN",
  or: "od-IN",
};

const LANGUAGE_BY_SARVAM_CODE: Record<string, Language> = Object.fromEntries(
  Object.entries(SARVAM_LANGUAGE_CODES).map(([language, sarvamCode]) => [sarvamCode, language as Language]),
) as Record<string, Language>;

interface SarvamSpeechResponse {
  transcript?: string;
  language_code?: string | null;
  language_probability?: number | null;
}

interface TranscribeOptions {
  autoDetect?: boolean;
  mimeType?: string;
  fileName?: string;
}

export async function transcribeAudio(
  audio: Buffer | undefined,
  language: Language = "hi",
  options: TranscribeOptions = {},
): Promise<TranscribeResult> {
  if (audio?.length) {
    if (hasSarvam) {
      try {
        return await callSarvamASR(audio, language, options);
      } catch (err) {
        if (!hasGroq) throw err;
        console.error("[speech] Sarvam STT failed, falling back to Groq:", err);
      }
    }
    if (hasGroq) {
      return callGroqASR(audio, language, options);
    }
  }
  // Bhashini was never implemented. Leaving an empty `if (hasBhashini)` here
  // made the config look wired: setting Bhashini keys and nothing else would
  // fall straight through to the error below with no indication why.
  if (hasBhashini) {
    console.error(
      "[speech] BHASHINI_API_KEY is set but Bhashini ASR is not implemented — set SARVAM_API_KEY or GROQ_API_KEY instead",
    );
  }
  throw new TranscriptionUnavailableError();
}

/** `audio/m4a` isn't in Sarvam's accepted MIME list (it wants `audio/x-m4a`), but
 *  that's exactly what iOS/Android report for m4a recordings — normalize it. */
function normalizeMimeType(mimeType: string | undefined): string | undefined {
  if (mimeType === "audio/m4a") return "audio/x-m4a";
  return mimeType;
}

async function callSarvamASR(
  audio: Buffer,
  language: Language,
  options: TranscribeOptions,
): Promise<TranscribeResult> {
  const form = new FormData();
  const mimeType = normalizeMimeType(options.mimeType) ?? "audio/x-m4a";
  const fileName = options.fileName ?? "speech.m4a";
  const audioCopy = new Uint8Array(audio.byteLength);
  audioCopy.set(audio);
  form.append("file", new Blob([audioCopy.buffer], { type: mimeType }), fileName);
  form.append("model", "saaras:v3");
  form.append("mode", "transcribe");
  form.append("language_code", options.autoDetect ? "unknown" : SARVAM_LANGUAGE_CODES[language]);

  const res = await fetch(SARVAM_STT_URL, {
    method: "POST",
    headers: { "api-subscription-key": env.sarvamApiKey },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Sarvam transcription failed ${res.status}: ${await res.text()}`);
  }

  const body = (await res.json()) as SarvamSpeechResponse;
  const transcript = body.transcript?.trim();
  if (!transcript) throw new Error("Sarvam returned an empty transcript");

  const detectedLanguage = body.language_code ? LANGUAGE_BY_SARVAM_CODE[body.language_code] : undefined;
  return {
    transcript,
    language: detectedLanguage ?? language,
    provider: "sarvam",
    // absent when Sarvam omits it, rather than a made-up 0.9
    confidence: body.language_probability ?? undefined,
  };
}

// Full (non-turbo) model — this path only runs when Sarvam has already
// failed, so accuracy matters more than shaving off latency here.

/** Whisper's verbose_json response names the detected language in full English
 *  (e.g. "hindi"), not an ISO code — map the ones relevant to Saksham back. */
const WHISPER_LANGUAGE_NAMES: Partial<Record<string, Language>> = {
  english: "en",
  hindi: "hi",
  bengali: "bn",
  tamil: "ta",
  telugu: "te",
  marathi: "mr",
  kannada: "kn",
  gujarati: "gu",
  punjabi: "pa",
  panjabi: "pa",
  odia: "or",
  oriya: "or",
};

interface GroqTranscriptionResponse {
  text?: string;
  language?: string;
}

/** Fallback STT via Groq's hosted Whisper — only invoked when a configured
 *  Sarvam call throws. Whisper's language codes are ISO-639-1, which is
 *  exactly what our `Language` type already uses, so it's passed through
 *  as-is when not auto-detecting. */
async function callGroqASR(
  audio: Buffer,
  language: Language,
  options: TranscribeOptions,
): Promise<TranscribeResult> {
  const form = new FormData();
  const mimeType = normalizeMimeType(options.mimeType) ?? "audio/x-m4a";
  const fileName = options.fileName ?? "speech.m4a";
  const audioCopy = new Uint8Array(audio.byteLength);
  audioCopy.set(audio);
  form.append("file", new Blob([audioCopy.buffer], { type: mimeType }), fileName);
  form.append("model", GROQ_WHISPER_MODEL);
  form.append("response_format", "verbose_json");
  if (!options.autoDetect) form.append("language", language);

  const res = await fetch(GROQ_TRANSCRIPTION_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.groqApiKey}` },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Groq transcription failed ${res.status}: ${await res.text()}`);
  }

  const body = (await res.json()) as GroqTranscriptionResponse;
  const transcript = body.text?.trim();
  if (!transcript) throw new Error("Groq returned an empty transcript");

  const detectedLanguage = body.language ? WHISPER_LANGUAGE_NAMES[body.language.toLowerCase()] : undefined;
  return {
    transcript,
    language: detectedLanguage ?? language,
    provider: "groq",
    // Whisper returns no confidence score, so we report none rather than a
    // number that looks measured. This used to be a fixed 0.75, which meant
    // `stt.confidence` silently changed meaning depending on which provider
    // served the request, with nothing saying which.
    confidence: undefined,
  };
}

/** Sarvam quota/auth failures (402/401/403) are not transient — they stay
 *  broken until the account is topped up or the key is replaced. Retrying on
 *  every request only added latency to a call we already knew would fail, so
 *  once we see one we stop calling out for a while and go straight to the
 *  on-device fallback. Cleared by a restart, or after the cool-off. */
let sarvamDisabledUntil = 0;
const SARVAM_COOLOFF_MS = 15 * 60 * 1000;

function spokenTextForTts(text: string, language: Language): string {
  if (language !== "hi") return text;
  return text
    .replace(/साक्षम/g, "सक्षम")
    .replace(/Saksham/gi, "सक्षम")
    .replace(/\bAI\b/g, "ए आई")
    .replace(/\bNSQF\b/g, "एन एस क्यू एफ")
    .replace(/\bPM-AJAY\b/g, "पी एम अजय")
    .replace(/\bNCS\b/g, "एन सी एस");
}

export async function synthesizeSpeech(
  text: string,
  language: Language = "hi",
): Promise<SynthesizeResult> {
  const clean = spokenTextForTts(text, language).trim();
  if (clean && hasSarvam && Date.now() >= sarvamDisabledUntil) {
    try {
      return await callSarvamTTS(clean, language);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // 402 = no credits, 401/403 = bad key: back off instead of retrying
      if (/\b(401|402|403)\b/.test(message)) {
        sarvamDisabledUntil = Date.now() + SARVAM_COOLOFF_MS;
        console.error(
          `[speech] Sarvam TTS unavailable (${message.slice(0, 120)}) — using on-device speech for the next ${SARVAM_COOLOFF_MS / 60000} minutes`,
        );
      } else {
        console.error("[speech] Sarvam TTS failed, falling back to on-device speech:", err);
      }
    }
  }
  // as above: not implemented, so say so rather than silently using the mock
  if (hasBhashini) {
    console.error(
      "[speech] BHASHINI_API_KEY is set but Bhashini TTS is not implemented — falling back to on-device speech",
    );
  }
  // Mock: return the text itself as a "text" audio track. The client (RN app /
  // web) speaks it with the on-device TTS engine (expo-speech / Web Speech API),
  // which keeps payloads tiny for low-bandwidth conditions.
  return {
    audioUrl: `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`,
    provider: "mock",
    format: "text",
  };
}

interface SarvamTTSResponse {
  audios?: string[];
}

/** Sarvam TTS (`bulbul:v2`). Returns the spoken audio as a base64 `data:` URI
 *  so it needs no file hosting — the app writes it to a cache file and plays
 *  it. `bulbul:v2` caps `text` at 1,500 characters. */
async function callSarvamTTS(text: string, language: Language): Promise<SynthesizeResult> {
  const res = await fetch(SARVAM_TTS_URL, {
    method: "POST",
    headers: {
      "api-subscription-key": env.sarvamApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: text.slice(0, 1500),
      target_language_code: SARVAM_LANGUAGE_CODES[language],
      speaker: "priya",
      model: "bulbul:v3",
    }),
  });

  if (!res.ok) {
    throw new Error(`Sarvam TTS failed ${res.status}: ${await res.text()}`);
  }

  const body = (await res.json()) as SarvamTTSResponse;
  const base64 = body.audios?.join("");
  if (!base64) throw new Error("Sarvam TTS returned no audio");

  return {
    audioUrl: `data:audio/wav;base64,${base64}`,
    provider: "sarvam",
    format: "wav",
  };
}
