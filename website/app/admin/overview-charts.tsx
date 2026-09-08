"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

/**
 * Categorical palette, in fixed order — a series keeps its colour whatever the
 * data does, so a slice never changes hue because a rank moved. Validated with
 * the dataviz palette checker against the light surface: lightness band, chroma
 * floor, CVD separation and normal-vision separation all pass. The contrast
 * check warns below 3:1, which is why every mark here carries a visible label
 * rather than relying on colour alone.
 */
const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#4a3aa7"];
const OTHER = "#98a2b3";

export interface Slice {
  name: string;
  count: number;
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arc(cx: number, cy: number, rOuter: number, rInner: number, from: number, to: number) {
  const a = polar(cx, cy, rOuter, to);
  const b = polar(cx, cy, rOuter, from);
  const c = polar(cx, cy, rInner, from);
  const d = polar(cx, cy, rInner, to);
  const large = to - from <= 180 ? 0 : 1;
  return `M ${a.x} ${a.y} A ${rOuter} ${rOuter} 0 ${large} 0 ${b.x} ${b.y} L ${c.x} ${c.y} A ${rInner} ${rInner} 0 ${large} 1 ${d.x} ${d.y} Z`;
}

/**
 * Donut — for a genuine part-of-whole only.
 *
 * `total` is the real total, not the sum of the slices shown: a top-5 charted
 * as a whole pie would claim those five are everything. Whatever the slices do
 * not cover becomes an explicit "Other" wedge, so the ring adds up to something
 * true.
 */
export function Donut({
  title,
  slices,
  total,
  unit,
}: {
  title: string;
  slices: Slice[];
  total: number;
  unit: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = slices.filter((s) => s.count > 0).slice(0, 5);
  const covered = shown.reduce((n, s) => n + s.count, 0);
  const data = covered < total ? [...shown, { name: "Other", count: total - covered }] : shown;

  if (total === 0 || data.length === 0) {
    return (
      <section className="flex h-full flex-col rounded-xl border border-border bg-surface p-5">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="my-auto text-center text-xs text-foreground-faint">No data yet</p>
      </section>
    );
  }

  const size = 190;
  const cx = size / 2;
  const cy = size / 2;
  let cursor = 0;

  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-surface p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-4 flex flex-1 items-center gap-5">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={title}>
          {data.map((s, i) => {
            const sweep = (s.count / total) * 360;
            // 2px of surface between wedges so adjacent fills never touch
            const gap = sweep > 6 ? 1.4 : 0;
            const from = cursor + gap;
            const to = cursor + sweep - gap;
            cursor += sweep;
            const isOther = s.name === "Other";
            return (
              <path
                key={s.name}
                d={arc(cx, cy, hover === i ? 92 : 87, 56, from, Math.max(from, to))}
                fill={isOther ? OTHER : SERIES[i % SERIES.length]}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                className="cursor-default transition-all"
              />
            );
          })}
          <text x={cx} y={cy + 1} textAnchor="middle" className="fill-foreground text-2xl font-bold">
            {hover === null ? total : data[hover].count}
          </text>
          <text x={cx} y={cy + 18} textAnchor="middle" className="fill-foreground-faint text-[10px]">
            {hover === null ? unit : data[hover].name.slice(0, 14)}
          </text>
        </svg>

        {/* legend doubles as the direct labels the contrast check requires */}
        <ul className="min-w-0 flex-1 space-y-2.5">
          {data.map((s, i) => (
            <li
              key={s.name}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className="flex items-center gap-2 text-sm"
            >
              <span
                aria-hidden
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ background: s.name === "Other" ? OTHER : SERIES[i % SERIES.length] }}
              />
              <span className="min-w-0 flex-1 truncate text-foreground-dim" title={s.name}>
                {s.name}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">{s.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * Ranked bars — for a top-N of many, which is not a part-of-whole.
 *
 * These lists are also where values tie (three PM-AJAY courses currently sit at
 * the same count). A pie of equal slices carries no information; length against
 * a shared baseline still reads correctly when values match.
 */
export function RankedBars({
  title,
  rows,
  unit,
  href,
  hrefLabel,
}: {
  title: string;
  rows: Slice[];
  unit: string;
  /** where the full list lives — the top 3 is a summary, not the data */
  href: string;
  hrefLabel: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-surface p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="my-auto text-center text-xs text-foreground-faint">No data yet</p>
      ) : (
        <ul className="mt-4 flex flex-1 flex-col justify-center gap-4">
          {rows.map((r, i) => (
            <li key={r.name} title={`${r.name} — ${r.count} ${unit}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-sm text-foreground-dim">{r.name}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{r.count}</span>
              </div>
              <div className="mt-1.5 h-2.5 w-full rounded-full bg-surface-alt">
                <div
                  className="h-2.5 rounded-full transition-all"
                  style={{
                    width: `${Math.max(4, (r.count / max) * 100)}%`,
                    background: SERIES[i % SERIES.length],
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link
        href={href}
        className="mt-4 inline-flex items-center gap-1.5 self-start rounded-md text-xs font-semibold text-emphasis transition hover:underline"
      >
        {hrefLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}
