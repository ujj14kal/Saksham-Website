import { env, hasGroq } from "../lib/env.js";
import { GROQ_CHAT_URL, GROQ_CHAT_MODEL, GROQ_MAX_TOKENS, groqHeaders } from "../lib/groq.js";
import { SKILL_LEXICON } from "./skillLexicon.js";


interface GroqChatResponse {
  choices?: { message?: { content?: string } }[];
}

/** Every skill the pipeline can map to. The model must pick from this list —
 *  anything else is discarded, so it can never invent a trade the catalogue
 *  has no qualification for. */
const ALLOWED = SKILL_LEXICON.map((e) => e.normalized);

/**
 * Fallback for when the keyword lexicon finds nothing.
 *
 * The lexicon only fires on phrases someone thought to write down, so a
 * beneficiary who describes their trade in their own words — "I do something
 * related to honey", "I work with cows all day" — gets no match at all even
 * though the trade is plainly in the catalogue. This asks the model to name
 * the trade instead, constrained to the tokens the lexicon already knows so
 * the rest of the pipeline is unchanged.
 *
 * Returns [] when nothing fits, so the caller still says "I didn't understand"
 * rather than mapping someone onto a trade they never mentioned.
 */
export interface LlmSkillMatch {
  token: string;
  /** how well the transcript actually evidences this trade, 0-1, as judged by
   *  the model. A vague "something related to cotton" should score lower than
   *  "I weave cotton saris on a handloom" — without this every LLM match
   *  carried the same hardcoded number and the ranking meant nothing. */
  confidence: number;
}

export async function classifySkillsWithLlm(transcript: string): Promise<LlmSkillMatch[]> {
  if (!hasGroq || !transcript.trim()) return [];

  try {
    const res = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: groqHeaders(),
      body: JSON.stringify({
        model: GROQ_CHAT_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You identify which traditional trades or occupations a person is describing. " +
              "Their words may be in any Indian language, romanized, or mixed with English, and " +
              "they often describe the work rather than naming it (e.g. \"I do something with honey\" " +
              "is beekeeping; \"I make things from mud\" is pottery; \"I look after cows and sell milk\" " +
              "is dairy-livestock).\n\n" +
              `Choose from this exact list of trades:\n${ALLOWED.join(", ")}\n\n` +
              "Reply with one match per line as `trade:confidence`, where confidence is 0.0-1.0 for how " +
              "clearly the person's words evidence that trade. Judge it honestly: an explicit description " +
              "of the work (\"I weave cotton saris on a handloom\") is high, around 0.85-0.95; a clear " +
              "statement of the trade is around 0.7-0.8; a vague or indirect mention (\"something related " +
              "to cotton\") is low, around 0.3-0.5, because the actual occupation is genuinely uncertain.\n" +
              "Rules: use ONLY trades from that list, copied exactly. At most 3, most relevant first. " +
              "If the person has not described any trade or occupation at all, reply exactly: none",
          },
          { role: "user", content: transcript },
        ],
        temperature: 0,
        // gpt-oss-120b reasons before answering; too low a cap truncates
        // before any content is emitted (see services/profileExtract.ts)
        max_tokens: GROQ_MAX_TOKENS.skillClassification,
      }),
    });
    if (!res.ok) {
      console.error(`[skill-llm] Groq classification failed ${res.status}`);
      return [];
    }

    const body = (await res.json()) as GroqChatResponse;
    const raw = body.choices?.[0]?.message?.content?.trim().toLowerCase() ?? "";
    if (!raw || raw === "none") return [];

    // keep only real lexicon tokens — the model does not get to invent trades
    const allowed = new Set(ALLOWED);
    const seen = new Set<string>();
    const matches: LlmSkillMatch[] = [];
    for (const line of raw.split(/[\n,]/)) {
      const [rawToken, rawScore] = line.split(":").map((x) => x?.trim());
      if (!rawToken || !allowed.has(rawToken) || seen.has(rawToken)) continue;
      seen.add(rawToken);
      const parsed = Number(rawScore);
      // an unparseable score means the model ignored the format; treat that as
      // moderate rather than confident
      const confidence = Number.isFinite(parsed) ? Math.max(0.05, Math.min(0.95, parsed)) : 0.5;
      matches.push({ token: rawToken, confidence });
    }
    return matches.slice(0, 3);
  } catch (err) {
    console.error("[skill-llm] classification error:", err);
    return [];
  }
}

export interface LlmQualificationMatch {
  qpCode: string;
  confidence: number;
}

/**
 * Match a transcript against the real NSQF catalogue.
 *
 * classifySkillsWithLlm above is limited to the ~84 lexicon tokens, so it can
 * only ever return a trade someone already thought to write down — about a
 * tenth of the catalogue. For anything outside that vocabulary it has to force
 * the answer into the nearest existing bucket, which is how "cotton" ends up
 * as generic weaving rather than a cotton qualification.
 *
 * This asks the model to pick from the actual qualifications instead. It is
 * the expensive path (the whole catalogue goes in the prompt, ~17k tokens), so
 * it runs only when the cheap token match has already failed.
 *
 * Returns [] unless the returned code is a real one — the model never gets to
 * invent a qualification.
 */
export async function classifyQualificationWithLlm(
  transcript: string,
  quals: { qpCode: string; title: string; sector: string; nsqfLevel: number }[],
): Promise<LlmQualificationMatch[]> {
  if (!hasGroq || !transcript.trim() || quals.length === 0) return [];

  // Sending all 819 rows in one prompt exceeded Groq's request size limit
  // (413). Narrow by sector first: 29 sector names is a tiny prompt, and the
  // qualifications within the chosen sectors are a small enough set to send in
  // full. Two cheap calls instead of one oversized one, and the smaller
  // candidate list also makes the final choice more accurate.
  const sectors = [...new Set(quals.map((q) => q.sector))];
  const chosenSectors = await pickSectors(transcript, sectors);
  if (chosenSectors.length === 0) return [];

  const candidates = quals.filter((q) => chosenSectors.includes(q.sector));
  if (candidates.length === 0) return [];

  const catalogue = candidates.map((q) => `${q.qpCode}|${q.title}|L${q.nsqfLevel}`).join("\n");
  const byCode = new Map(candidates.map((q) => [q.qpCode.toLowerCase(), q.qpCode]));

  const raw = await askGroq(
    "You match what an Indian beneficiary says about their work to a formal NSQF qualification. " +
      "Their words may be in any Indian language, romanized, or mixed with English, and they usually " +
      "describe the work rather than naming a qualification.\n\n" +
      "Prefer entry-level, hands-on qualifications: these are informal workers, so the person who does " +
      "the trade, not the supervisor or manager of it.\n\n" +
      "Reply with one match per line as `qpCode:confidence`, confidence 0.0-1.0 for how clearly their " +
      "words evidence that qualification. A vague mention of a material or sector is low (0.3-0.5) " +
      "because the actual occupation is uncertain; an explicit description of the work is high (0.85+).\n" +
      "Use ONLY qpCodes from the list below, copied exactly. At most 3, best first. " +
      "If they have not described any occupation, reply exactly: none\n\n" +
      `Qualifications (qpCode|title|level):\n${catalogue}`,
    transcript,
  );
  if (!raw || raw.toLowerCase() === "none") return [];

  const seen = new Set<string>();
  const matches: LlmQualificationMatch[] = [];
  for (const line of raw.split(/[\n,]/)) {
    const [rawCode, rawScore] = line.split(":").map((x) => x?.trim());
    const qpCode = rawCode ? byCode.get(rawCode.toLowerCase()) : undefined;
    if (!qpCode || seen.has(qpCode)) continue;
    seen.add(qpCode);
    const parsed = Number(rawScore);
    const confidence = Number.isFinite(parsed) ? Math.max(0.05, Math.min(0.95, parsed)) : 0.5;
    matches.push({ qpCode, confidence });
  }
  return matches.slice(0, 3);
}

/** Narrow 819 qualifications to the one or two sectors worth searching. */
async function pickSectors(transcript: string, sectors: string[]): Promise<string[]> {
  const raw = await askGroq(
    "Which industry sectors could this person's work belong to? Reply with at most 2 sector names " +
      "from the list below, one per line, copied exactly. If none apply, reply exactly: none\n\n" +
      sectors.join("\n"),
    transcript,
  );
  if (!raw || raw.toLowerCase() === "none") return [];
  const bySector = new Map(sectors.map((x) => [x.toLowerCase(), x]));
  return raw
    .split("\n")
    .map((l) => bySector.get(l.trim().toLowerCase()))
    .filter((x): x is string => !!x)
    .slice(0, 2);
}

/** One Groq chat turn, returning trimmed content or null on any failure. */
async function askGroq(system: string, user: string): Promise<string | null> {
  try {
    const res = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: groqHeaders(),
      body: JSON.stringify({
        model: GROQ_CHAT_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0,
        max_tokens: GROQ_MAX_TOKENS.skillClassification,
      }),
    });
    if (!res.ok) {
      console.error(`[skill-llm] Groq call failed ${res.status}`);
      return null;
    }
    const body = (await res.json()) as GroqChatResponse;
    return body.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (err) {
    console.error("[skill-llm] Groq call error:", err);
    return null;
  }
}
