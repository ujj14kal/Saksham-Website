import { env } from "./env.js";

/**
 * Shared Groq configuration.
 *
 * The model id, endpoint and token budgets used to be copy-pasted into every
 * service that called the LLM, so changing model meant finding three separate
 * literals. They live here instead, and the model is env-overridable so it can
 * be swapped per deployment without a code change.
 */
export const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

export const GROQ_CHAT_MODEL = process.env.GROQ_CHAT_MODEL ?? "openai/gpt-oss-120b";
export const GROQ_WHISPER_MODEL = process.env.GROQ_WHISPER_MODEL ?? "whisper-large-v3";

/**
 * Token budgets per call.
 *
 * gpt-oss-120b is a reasoning model: it spends tokens on an internal pass
 * before emitting any answer. A budget that only covers the visible reply gets
 * consumed entirely by that pass and returns empty content with
 * finish_reason "length" — which is how the profile extractor silently failed
 * at the original cap of 10. Each of these leaves room for both.
 */
export const GROQ_MAX_TOKENS = {
  /** a few `trade:confidence` lines */
  skillClassification: 300,
  /** one word, one number, or a short name */
  profileField: 150,
  /** a short grounded answer with a citation marker */
  ragAnswer: 400,
} as const;

export function groqHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${env.groqApiKey}`, "Content-Type": "application/json" };
}
