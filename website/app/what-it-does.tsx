import { ArrowRight, Award, Mic, MapPin } from "lucide-react";

/**
 * What Saksham does, in one glance.
 *
 * Sits directly under the hero because the reader we care about most — a rural
 * beneficiary with limited literacy — will not scroll to find out what this is.
 * It shows one real journey end to end rather than describing the service:
 * the actual sentence someone says, the actual qualification it maps to, and
 * the actual place they can train.
 *
 * Written in plain English, short enough to take in at a glance. The spoken
 * example stays in the beneficiary's own words because that is the point of
 * the service — the phrase is what they would actually say out loud.
 */
const STAGES = [
  {
    icon: Mic,
    tint: "bg-accent/10 text-accent",
    title: "Say what you do",
    sub: "In your own language, out loud",
    detail: "“main mitti ke bartan banata hoon”",
    detailEn: "“I make clay pots”",
  },
  {
    icon: Award,
    tint: "bg-emphasis/10 text-emphasis",
    title: "Get a government match",
    sub: "Your skill, formally recognised",
    detail: "Potter (Kumhar) — NSQF 3",
    detailEn: "A real course code you can check",
  },
  {
    icon: MapPin,
    tint: "bg-brand/10 text-brand",
    title: "Find work near home",
    sub: "Training and jobs close by",
    detail: "Bulandshahr · ₹10,000–16,000",
    detailEn: "Per month, near your district",
  },
];

export function WhatItDoes() {
  return (
    <section className="border-b border-border py-10">
      <h2 className="text-center text-2xl font-extrabold leading-tight sm:text-3xl">
        Your skill already counts. Let us prove it.
      </h2>
      <p className="mt-1.5 text-center text-sm text-foreground-dim">
        Say your work out loud. Saksham finds the government course it matches, and the training near you.
      </p>

      <div className="mt-8 flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
        {STAGES.map((s, i) => (
          <div key={s.sub} className="flex flex-1 items-center gap-3">
            <div className="flex-1 rounded-2xl border border-border bg-surface p-5 text-center shadow-sm">
              <div className={`mx-auto flex h-11 w-11 items-center justify-center rounded-xl ${s.tint}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-base font-bold">{s.title}</p>
              <p className="text-xs text-foreground-faint">{s.sub}</p>
              <p className="mt-3 text-sm font-semibold text-foreground-dim">{s.detail}</p>
              <p className="text-xs text-foreground-faint">{s.detailEn}</p>
            </div>

            {/* arrow between stages — rotated to point down when stacked */}
            {i < STAGES.length - 1 && (
              <ArrowRight
                aria-hidden
                className="hidden h-5 w-5 shrink-0 text-foreground-faint lg:block"
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
