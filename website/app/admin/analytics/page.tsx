"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, handleAdminAuthError } from "@/lib/auth";
import { getLeaderboard, getGeo, getCoverageGaps, type Leaderboard, type CoverageGaps } from "@/lib/api";
import { Card, Chip, Skeleton } from "@/components/ui";
import { AdminShell } from "../admin-shell";

export default function AnalyticsPage() {
  return (
    <AdminShell title="Analytics" subtitle="District performance, language coverage, and job/qualification coverage gaps.">
      <Analytics />
    </AdminShell>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-foreground-dim">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-surface-alt">
        <div className="h-2 rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Analytics() {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [geo, setGeo] = useState<{ state: string; _count: number }[] | null>(null);
  const [gaps, setGaps] = useState<CoverageGaps | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    Promise.all([getLeaderboard(token), getGeo(token), getCoverageGaps(token)])
      .then(([l, g, c]) => {
        setLeaderboard(l);
        setGeo(g);
        setGaps(c);
      })
      .catch((err) => {
        if (handleAdminAuthError(err)) router.replace("/admin/login");
        else setError("Could not load analytics — the backend may be waking up. Reload in a moment.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!leaderboard || !geo || !gaps) {
    return (
      <Card className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </Card>
    );
  }

  const maxSessions = Math.max(1, ...geo.map((g) => g._count));

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-3 font-semibold">Sessions by state</h2>
        {geo.length === 0 ? (
          <p className="text-sm text-foreground-faint">No location data yet.</p>
        ) : (
          <div className="space-y-2.5">
            {geo
              .slice()
              .sort((a, b) => b._count - a._count)
              .map((g) => (
                <Bar key={g.state} label={g.state} value={g._count} max={maxSessions} />
              ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">District conversion (suggested → enrolled)</h2>
        {leaderboard.districts.length === 0 ? (
          <p className="text-sm text-foreground-faint">No district data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-foreground-dim">
                <tr>
                  <th className="py-2 pr-3">District</th>
                  <th className="py-2 pr-3">Suggested</th>
                  <th className="py-2 pr-3">Enrolled</th>
                  <th className="py-2 pr-3">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.districts.map((d) => (
                  <tr key={d.district} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3 font-medium">{d.district}</td>
                    <td className="py-2 pr-3 text-foreground-dim">{d.suggested}</td>
                    <td className="py-2 pr-3 text-foreground-dim">{d.enrolled}</td>
                    <td className="py-2 pr-3">{Math.round(d.conversionRate * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Language coverage</h2>
        <div className="flex flex-wrap gap-2">
          {leaderboard.languageCounts.map((l) => (
            <Chip key={l.language} label={`${l.language} · ${l._count}`} tone="primary" />
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Job postings without a linked qualification</h2>
        {gaps.postingsWithoutQualification.length === 0 ? (
          <p className="text-sm text-foreground-faint">None — every active posting links to a real NSQF qualification.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {gaps.postingsWithoutQualification.map((p) => (
              <li key={p.id}>
                <span className="font-medium">{p.title}</span> at {p.employerName}
                {p.sector ? ` · ${p.sector}` : ""}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Sectors with qualifications but zero job postings</h2>
        {gaps.sectorsWithNoPostings.length === 0 ? (
          <p className="text-sm text-foreground-faint">None — every sector with an NSQF qualification has at least one posting.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {gaps.sectorsWithNoPostings.map((s) => (
              <li key={s.sector}>
                <span className="font-medium">{s.sector}</span> — {s.qualificationCount} qualification
                {s.qualificationCount === 1 ? "" : "s"}, 0 postings
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
