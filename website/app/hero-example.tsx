"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";

/**
 * The hero's worked example, rotating through several trades.
 *
 * Every field is real: each phrase was run through the live backend
 * (/api/nsqf/map and /api/assistant/converse) and these are the qualifications
 * and vacancies it actually returned, QP codes included. The card claims
 * "Real match", so it should not be showing invented data.
 *
 * Rotation is client-side rather than fetched on load: the landing page should
 * not depend on the backend waking from a cold start before it can render its
 * own hero.
 */
interface Example {
  /** what the beneficiary says, in their own language */
  said: string;
  /** plain-English gloss underneath */
  gloss: string;
  qualification: string;
  nsqfLevel: number;
  qpCode: string;
  vacancy: string;
}

const EXAMPLES: Example[] = [
  {
    said: "main mitti ke bartan banata hoon",
    gloss: "I make clay pots",
    qualification: "Potter (Kumhar)",
    nsqfLevel: 3,
    qpCode: "NG-2.5-HC-00756-2023-V1-HCSSC",
    vacancy: "Cluster Producer Group, Bulandshahr, ₹10,000–16,000/month",
  },
  {
    said: "main silai karta hoon",
    gloss: "I do stitching work",
    qualification: "Tailor (Darzi)",
    nsqfLevel: 3,
    qpCode: "NG-2.5-AP-00739-2023-V1-AMHSSC",
    vacancy: "Khadi Gramodyog Bhandar, Murshidabad, ₹10,000–16,000/month",
  },
  {
    said: "raj mistri ka kaam",
    gloss: "I work as a mason",
    qualification: "Concrete Mason – Basic",
    nsqfLevel: 3,
    qpCode: "NG-2.5-CO-00748-2023-V1-CSDCI",
    vacancy: "Nirman Infra Works, Gwalior, ₹10,000–16,000/month",
  },
  {
    said: "main madhumakhi palta hoon",
    gloss: "I keep bees",
    qualification: "Honey Bee Farmer (Small Unit)",
    nsqfLevel: 2,
    qpCode: "QG-02-AG-01001-2023-V1-ASCI",
    vacancy: "Dairy Cooperative Society, Sambalpur, ₹8,000–12,000/month",
  },
];

const ROTATE_MS = 4500;

export function HeroExample() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  // honour the OS "reduce motion" setting — a card that rewrites itself every
  // few seconds is exactly the kind of movement that setting exists to stop
  const [animate, setAnimate] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setAnimate(!query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!animate) return;
    const id = setInterval(() => {
      // fade out, swap, fade back in
      setVisible(false);
      timer.current = setTimeout(() => {
        setIndex((i) => (i + 1) % EXAMPLES.length);
        setVisible(true);
      }, 320);
    }, ROTATE_MS);
    return () => {
      clearInterval(id);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [animate]);

  const ex = EXAMPLES[index];

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground-faint">Example</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-emphasis">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Real match
        </span>
      </div>

      {/* aria-live so a screen reader announces each new example rather than
          silently replacing the one it was reading */}
      <div
        aria-live="polite"
        className="transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <p className="mt-3 text-base italic">&ldquo;{ex.said}&rdquo;</p>
        <p className="text-xs text-foreground-faint">&ldquo;{ex.gloss}&rdquo;</p>
        <p className="mt-4 text-lg font-bold text-emphasis">
          {ex.qualification} — NSQF Level {ex.nsqfLevel}
        </p>
        <p className="mt-1 text-sm text-foreground-dim">Real vacancy: {ex.vacancy}</p>
        <p className="mt-4 border-t border-border pt-3 text-xs text-foreground-faint">
          {ex.qpCode} — nqr.gov.in
        </p>
      </div>

      {/* which example is showing, and a way to jump straight to one */}
      <div className="mt-4 flex items-center gap-1.5">
        {EXAMPLES.map((e, i) => (
          <button
            key={e.qpCode}
            type="button"
            aria-label={`Show example: ${e.gloss}`}
            aria-current={i === index}
            onClick={() => {
              setIndex(i);
              setVisible(true);
            }}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-brand" : "w-1.5 bg-border hover:bg-foreground-faint"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
