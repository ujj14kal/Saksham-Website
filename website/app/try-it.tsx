"use client";

import { useState } from "react";
import { CheckCircle2, Quote } from "lucide-react";

const EXAMPLES = [
  {
    said: "main mitti ke bartan banata hoon",
    meaning: "I make clay pots",
    matched: "Potter (Kumhar) — NSQF Level 3",
    qpCode: "NG-2.5-HC-00756-2023-V1-HCSSC",
    outcome: "Real vacancy: Cluster Producer Group, Bulandshahr, ₹10,000–16,000/month",
  },
  {
    said: "silai aur kadhai ka kaam karti hoon",
    meaning: "I do sewing and embroidery",
    matched: "Self Employed Tailor — NSQF Level 3",
    qpCode: "QG-2.5-AP-01868-2024-V1.1-AMHSSC",
    outcome: "Real vacancy: Apparel Export Unit, Gaya, ₹11,000–17,000/month",
  },
  {
    said: "raj mistri ka kaam, diwar aur plaster",
    meaning: "Masonry work, walls and plastering",
    matched: "Concrete Mason (Basic) — NSQF Level 3",
    qpCode: "NG-2.5-CO-00748-2023-V1-CSDCI",
    outcome: "Real vacancy: Shree Balaji Construction, Warangal, ₹11,000–17,000/month",
  },
];

export function TryIt() {
  const [selected, setSelected] = useState(0);
  const ex = EXAMPLES[selected];

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-2">
        {EXAMPLES.map((e, i) => (
          <button
            key={e.said}
            onClick={() => setSelected(i)}
            className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
              i === selected ? "border-brand bg-brand/5" : "border-border bg-surface hover:border-brand/40"
            }`}
          >
            &ldquo;{e.said}&rdquo;
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-faint">Example</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-emphasis">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Real match
          </span>
        </div>
        <div className="mt-3 flex items-start gap-2">
          <Quote className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <div>
            <p className="text-base italic">&ldquo;{ex.said}&rdquo;</p>
            <p className="text-xs text-foreground-faint">&ldquo;{ex.meaning}&rdquo;</p>
          </div>
        </div>
        <p className="mt-4 text-lg font-bold text-emphasis">{ex.matched}</p>
        <p className="mt-1 text-sm text-foreground-dim">{ex.outcome}</p>
        <p className="mt-4 border-t border-border pt-3 text-xs text-foreground-faint">
          NSQF qualification code — {ex.qpCode}
        </p>
      </div>
    </div>
  );
}
