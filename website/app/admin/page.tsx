"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Users2, GraduationCap, WifiOff, Briefcase } from "lucide-react";
import { getStats, type AdminStats } from "@/lib/api";
import { getToken, handleAdminAuthError } from "@/lib/auth";
import { Card, Skeleton } from "@/components/ui";
import { AdminShell } from "./admin-shell";
import { Donut, RankedBars } from "./overview-charts";

export default function AdminOverview() {
  return (
    <AdminShell title="Overview" subtitle="Live numbers from every beneficiary voice session.">
      <Overview />
    </AdminShell>
  );
}

function Overview() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    getStats(token)
      .then(setStats)
      .catch((err) => {
        if (handleAdminAuthError(err)) router.replace("/admin/login");
        else setError("Could not load stats — the backend may be waking up. Reload in a moment.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <p className="text-sm text-danger">{error}</p>;

  if (!stats) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-14" />
          </Card>
        ))}
      </div>
    );
  }

  const languageNames: Record<string, string> = {
    hi: "Hindi", en: "English", bn: "Bengali", ta: "Tamil", te: "Telugu",
    mr: "Marathi", kn: "Kannada", gu: "Gujarati", pa: "Punjabi", or: "Odia",
  };

  const languageSlices = stats.byLanguage.map((l) => ({
    name: languageNames[l.language] ?? l.language,
    count: l._count,
  }));
  const skillSlices = stats.topSkills.map((sk) => ({
    name: sk.normalizedSkill.replace(/-/g, " "),
    count: sk._count,
  }));
  // the real denominator for skills — a top-5 donut must not imply those five
  // are every mapping we have made
  const skillTotal = skillSlices.reduce((n, sk) => n + sk.count, 0);

  return (
    <div className="flex flex-col gap-3">
      {/* headline numbers */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi icon={Mic} label="Voice sessions" value={stats.totals.sessions} tone="brand" />
        <Kpi icon={Users2} label="Beneficiaries" value={stats.totals.beneficiaries} tone="accent" />
        <Kpi icon={GraduationCap} label="Recommendations" value={stats.totals.recommendations} tone="emphasis" />
        <Kpi icon={Briefcase} label="Job applications" value={stats.totals.applications ?? 0} tone="emphasis" />
        <Kpi icon={WifiOff} label="Low bandwidth" value={stats.totals.lowBandwidthSessions} tone="accent" />
      </div>

      {/* part-of-whole: every session has a language, every mapping a skill */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Donut
          title="Languages spoken"
          slices={languageSlices}
          total={stats.totals.sessions}
          unit="sessions"
        />
        <Donut title="Skills mapped" slices={skillSlices} total={skillTotal} unit="mappings" />
      </div>

      {/* rankings out of many — length, not slices */}
      <div className="grid gap-3 lg:grid-cols-3">
        <RankedBars title="Top NSQF qualifications" rows={stats.topQualifications ?? []} unit="matches" />
        <RankedBars title="Top PM-AJAY courses" rows={stats.topCourses ?? []} unit="recommendations" />
        <RankedBars title="Most applied-to jobs" rows={stats.topJobs ?? []} unit="applications" />
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint?: string;
  tone: "brand" | "accent" | "emphasis";
}) {
  return (
    <Card className={tone === "brand" ? "rounded-tr-[26px]" : "rounded-bl-[26px]"}>
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-md ${
          tone === "brand"
            ? "bg-brand/10 text-brand"
            : tone === "emphasis"
              ? "bg-emphasis/10 text-emphasis"
              : "bg-accent/10 text-accent"
        }`}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-foreground-faint">{label}</p>
      <p className="mt-0.5 text-3xl font-semibold">{value}</p>
      {hint && <p className="text-xs text-foreground-faint">{hint}</p>}
    </Card>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-semibold">{title}</h2>
        {hint && <span className="text-xs font-medium text-accent">{hint}</span>}
      </div>
      {children}
    </Card>
  );
}

function BarList({ rows, max }: { rows: { label: string; value: number }[]; max: number }) {
  if (rows.length === 0) return <p className="text-sm text-foreground-faint">No data yet.</p>;
  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => (
        <div key={r.label} className="flex items-center gap-3 text-sm">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-alt text-[10px] font-semibold text-foreground-dim">
            {i + 1}
          </span>
          <span className="w-24 shrink-0 truncate text-foreground-dim">{r.label}</span>
          <div className="h-5 flex-1 rounded-full bg-surface-alt">
            <div
              className="h-5 rounded-full bg-gradient-to-r from-brand to-accent transition-[width] duration-500"
              style={{ width: `${Math.max((r.value / max) * 100, 6)}%` }}
            />
          </div>
          <span className="w-8 text-right font-semibold">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
