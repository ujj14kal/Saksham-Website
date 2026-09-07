"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download } from "lucide-react";
import { getSessions, updateRecommendationStatus, recommendationName, type SessionRow } from "@/lib/api";
import { getToken, handleAdminAuthError } from "@/lib/auth";
import { downloadCsv } from "@/lib/csv";
import { Button, Card, Skeleton } from "@/components/ui";
import { AdminShell } from "../admin-shell";

const PAGE_SIZE = 100;

export default function SessionsPage() {
  return (
    <AdminShell title="Sessions" subtitle="Every voice session, most recent first.">
      <Sessions />
    </AdminShell>
  );
}

function Sessions() {
  const router = useRouter();
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState("");
  const [langFilter, setLangFilter] = useState("");

  function load(skip: number, append: boolean) {
    const token = getToken();
    if (!token) return;
    getSessions(token, { take: PAGE_SIZE, skip })
      .then((r) => {
        setRows((prev) => (append && prev ? [...prev, ...r.items] : r.items));
        setTotal(r.total);
      })
      .catch((err) => {
        if (handleAdminAuthError(err)) router.replace("/admin/login");
        else setError("Could not load sessions — the backend may be waking up. Reload in a moment.");
      })
      .finally(() => setLoadingMore(false));
  }

  useEffect(() => load(0, false), []);

  if (error) return <p className="text-sm text-danger">{error}</p>;

  if (!rows) {
    return (
      <Card className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </Card>
    );
  }

  const languages = [...new Set(rows.map((r) => r.language))];

  const filtered = rows.filter((s) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      (s.rawTranscript ?? "").toLowerCase().includes(q) ||
      (s.user?.name ?? "").toLowerCase().includes(q) ||
      (s.district ?? "").toLowerCase().includes(q);
    const matchesLang = !langFilter || s.language === langFilter;
    return matchesQuery && matchesLang;
  });

  function exportCsv() {
    downloadCsv(
      "sessions.csv",
      filtered.map((s) => ({
        createdAt: s.createdAt,
        language: s.language,
        transcript: s.rawTranscript ?? "",
        district: s.district ?? "",
        state: s.state ?? "",
        bandwidthKbps: s.bandwidthKbps ?? "",
        topRecommendation: s.recommendations[0] ? recommendationName(s.recommendations[0]) : "",
        recommendationStatus: s.recommendations[0]?.status ?? "",
      })),
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground-dim">
          {rows.length} of {total} sessions loaded
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transcript, user, district…"
            className="w-56 rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
          >
            <option value="">All languages</option>
            {languages.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <Button label="Export CSV" icon={<Download className="h-4 w-4" />} variant="secondary" size="md" fullWidth={false} onPress={exportCsv} />
        </div>
      </div>
      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-alt text-xs uppercase text-foreground-dim">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Lang</th>
              <th className="px-3 py-2">Transcript</th>
              <th className="px-3 py-2">NSQF mapping</th>
              <th className="px-3 py-2">Top recommendation</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Bandwidth</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-border align-top last:border-0">
                <td className="whitespace-nowrap px-3 py-2 text-foreground-dim">
                  <Link href={`/admin/sessions/${s.id}`} className="text-brand hover:underline">
                    {new Date(s.createdAt).toLocaleString()}
                  </Link>
                </td>
                <td className="px-3 py-2">{s.language}</td>
                <td className="max-w-xs px-3 py-2">{s.rawTranscript}</td>
                <td className="px-3 py-2">
                  {s.mappings.length === 0 ? (
                    <span className="text-foreground-faint">—</span>
                  ) : (
                    s.mappings.map((m) => (
                      <div key={m.id}>
                        {m.nsqfQualification ? (
                          <>
                            {m.nsqfQualification.qpCode} · {m.nsqfQualification.title}{" "}
                            <span className="font-medium text-success">{Math.round(m.confidence * 100)}%</span>
                          </>
                        ) : (
                          <span className="text-warning">{m.normalizedSkill} (review)</span>
                        )}
                      </div>
                    ))
                  )}
                </td>
                <td className="px-3 py-2">
                  {s.recommendations[0] ? (
                    <div className="flex items-center gap-1.5">
                      <span>{recommendationName(s.recommendations[0])}</span>
                      <select
                        value={s.recommendations[0].status}
                        onChange={(e) => {
                          const token = getToken();
                          const recId = s.recommendations[0].id;
                          const status = e.target.value;
                          if (!token) return;
                          setRows((prev) =>
                            prev
                              ? prev.map((row) =>
                                  row.id === s.id
                                    ? {
                                        ...row,
                                        recommendations: row.recommendations.map((r) =>
                                          r.id === recId ? { ...r, status } : r,
                                        ),
                                      }
                                    : row,
                                )
                              : prev,
                          );
                          updateRecommendationStatus(token, recId, status).catch(() => {});
                        }}
                        className="rounded border border-border bg-transparent px-1.5 py-0.5 text-xs outline-none focus:border-brand"
                      >
                        {["SUGGESTED", "VIEWED", "INTERESTED", "APPLIED", "ENROLLED", "REJECTED"].map((statusOption) => (
                          <option key={statusOption} value={statusOption}>
                            {statusOption}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="text-foreground-faint">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-foreground-dim">
                  {[s.district, s.state].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-3 py-2 text-foreground-dim">{s.bandwidthKbps ? `${s.bandwidthKbps} kbps` : "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-foreground-faint">
                  No sessions match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length < total && (
        <div className="mt-4 flex justify-center">
          <Button
            label={`Load ${Math.min(PAGE_SIZE, total - rows.length)} more`}
            variant="secondary"
            size="md"
            fullWidth={false}
            loading={loadingMore}
            onPress={() => {
              setLoadingMore(true);
              load(rows.length, true);
            }}
          />
        </div>
      )}
    </div>
  );
}
