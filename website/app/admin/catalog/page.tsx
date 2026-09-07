"use client";

import { useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";
import { getToken } from "@/lib/auth";
import {
  searchNsqfFull,
  updateNsqf,
  getNsqfSectors,
  searchPmajayCourses,
  getPmajaySectors,
  type NsqfQualificationFull,
  type PmajayCourseRow,
} from "@/lib/api";
import { Button, Card, Chip, Pagination } from "@/components/ui";
import { AdminShell } from "../admin-shell";

type Tab = "nsqf" | "pmajay";

export default function CatalogPage() {
  return (
    <AdminShell title="Catalogue" subtitle="Browse the real NSQF qualification and PM-AJAY course data the pipeline matches against.">
      <Catalog />
    </AdminShell>
  );
}

function Catalog() {
  const [tab, setTab] = useState<Tab>("nsqf");
  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border">
        {(["nsqf", "pmajay"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t ? "border-brand text-brand" : "border-transparent text-foreground-dim hover:text-foreground"
            }`}
          >
            {t === "nsqf" ? "NSQF qualifications" : "PM-AJAY courses"}
          </button>
        ))}
      </div>
      {tab === "nsqf" ? <NsqfBrowser /> : <PmajayBrowser />}
    </div>
  );
}

function NsqfBrowser() {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("");
  const [sectors, setSectors] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<NsqfQualificationFull[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<NsqfQualificationFull | null>(null);

  useEffect(() => {
    getNsqfSectors().then(setSectors).catch(() => {});
  }, []);

  function load() {
    setLoading(true);
    searchNsqfFull(query, page, sector || undefined)
      .then((r) => {
        setItems(r.items);
        setTotal(r.total);
        setTotalPages(r.totalPages);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const handle = setTimeout(load, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, sector, page]);

  useEffect(() => setPage(1), [query, sector]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title…"
            className="w-56 rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
          >
            <option value="">All sectors</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <p className="text-sm text-foreground-dim">{total} qualifications total</p>
      </div>
      <div className="space-y-2">
        {items.map((q) => (
          <Card key={q.id} className="space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">
                  {q.qpCode} · {q.title}
                </p>
                <p className="text-xs text-foreground-faint">
                  {q.sector} · Level {q.nsqfLevel}
                  {q.expired && " · expired"}
                </p>
              </div>
              <button onClick={() => setEditing(q)} aria-label="Edit" className="rounded p-1.5 hover:bg-surface-alt">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {q.keywords.slice(0, 8).map((k) => (
                <Chip key={k} label={k} tone="default" />
              ))}
            </div>
          </Card>
        ))}
        {!loading && items.length === 0 && <p className="text-sm text-foreground-faint">No matches.</p>}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {editing && (
        <NsqfEditForm
          qualification={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function NsqfEditForm({
  qualification,
  onClose,
  onSaved,
}: {
  qualification: NsqfQualificationFull;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [keywords, setKeywords] = useState(qualification.keywords.join(", "));
  const [expired, setExpired] = useState(qualification.expired);
  const [description, setDescription] = useState(qualification.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const token = getToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await updateNsqf(token, qualification.id, {
        keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
        expired,
        description: description.trim() || undefined,
      });
      onSaved();
    } catch {
      setError("Could not save — the backend may be waking up, try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-md bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {qualification.qpCode} · {qualification.title}
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1.5 hover:bg-surface-alt">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-foreground-faint">Keywords (comma-separated)</p>
            <textarea
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={2}
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={expired} onChange={(e) => setExpired(e.target.checked)} />
            Mark as expired (excluded from voice pipeline + catalogue by default)
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <Button label="Save changes" onPress={submit} loading={busy} className="mt-4" />
      </div>
    </div>
  );
}

function PmajayBrowser() {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("");
  const [sectors, setSectors] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<PmajayCourseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPmajaySectors().then(setSectors).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const handle = setTimeout(() => {
      searchPmajayCourses(query, page, sector || undefined)
        .then((r) => {
          setItems(r.items);
          setTotal(r.total);
          setTotalPages(r.totalPages);
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query, sector, page]);

  useEffect(() => setPage(1), [query, sector]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search course name…"
            className="w-56 rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
          >
            <option value="">All sectors</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <p className="text-sm text-foreground-dim">{total} courses total</p>
      </div>
      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-alt text-xs uppercase text-foreground-dim">
            <tr>
              <th className="px-3 py-2">Course</th>
              <th className="px-3 py-2">Sector</th>
              <th className="px-3 py-2">Sub-course</th>
              <th className="px-3 py-2">Level</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2 font-medium">{c.courseName}</td>
                <td className="px-3 py-2 text-foreground-dim">{c.sector} · {c.subSector}</td>
                <td className="px-3 py-2 text-foreground-dim">{c.subCourseCode} · {c.subCourseName}</td>
                <td className="px-3 py-2 text-foreground-dim">{c.courseLevel}</td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-foreground-faint">
                  No matches.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
