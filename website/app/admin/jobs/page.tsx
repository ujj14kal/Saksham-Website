"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, X, Search, Sparkles, Download } from "lucide-react";
import { getToken, handleAdminAuthError } from "@/lib/auth";
import {
  getJobPostings,
  createJobPosting,
  updateJobPosting,
  deleteJobPosting,
  getSkillTokens,
  suggestForSkillToken,
  type JobPosting,
  type JobPostingInput,
  type JobPostingSuggestion,
} from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { Button, Card, Chip, Pagination, Skeleton } from "@/components/ui";
import { AdminShell } from "../admin-shell";
import { ApplicationsPanel } from "./applications-panel";

const PAGE_SIZE = 12;

export default function JobsPage() {
  return (
    <AdminShell
      title="Job Postings"
      subtitle="Real vacancies matched to beneficiaries by the same skill vocabulary the voice assistant understands."
    >
      <Jobs />
    </AdminShell>
  );
}

function Jobs() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobPosting[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [onlyWithApplications, setOnlyWithApplications] = useState(false);
  // which posting's applicant list is expanded
  const [openApplicationsFor, setOpenApplicationsFor] = useState<string | null>(null);
  // read once on mount: getToken() touches localStorage, which is not available
  // during the server render
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => setToken(getToken()), []);
  const [editing, setEditing] = useState<JobPosting | null>(null);
  const [query, setQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [page, setPage] = useState(1);

  function load() {
    const token = getToken();
    if (!token) return;
    getJobPostings(token)
      .then(setJobs)
      .catch((err) => {
        if (handleAdminAuthError(err)) router.replace("/admin/login");
        else setError("Could not load job postings — the backend may be waking up. Reload in a moment.");
      });
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(job: JobPosting) {
    const token = getToken();
    if (!token) return;
    if (!confirm(`Delete "${job.title}" at ${job.employerName}? This can't be undone.`)) return;
    await deleteJobPosting(token, job.id);
    load();
  }

  if (error) return <p className="text-sm text-danger">{error}</p>;

  if (!jobs) {
    return (
      <Card className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </Card>
    );
  }

  const totalApplications = jobs.reduce((n, j) => n + (j.applicationCount ?? 0), 0);
  const sectors = [...new Set(jobs.map((j) => j.sector).filter((s): s is string => Boolean(s)))].sort();

  const filtered = jobs.filter((j) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      j.title.toLowerCase().includes(q) ||
      j.employerName.toLowerCase().includes(q) ||
      j.skillTokens.some((t) => t.includes(q));
    const matchesSector = !sectorFilter || j.sector === sectorFilter;
    const matchesApplied = !onlyWithApplications || (j.applicationCount ?? 0) > 0;
    return matchesQuery && matchesSector && matchesApplied;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function exportCsv() {
    if (!jobs) return;
    downloadCsv(
      "job-postings.csv",
      filtered.map((j) => ({
        title: j.title,
        employerName: j.employerName,
        skillTokens: j.skillTokens.join("; "),
        sector: j.sector ?? "",
        state: j.state ?? "",
        district: j.district ?? "",
        wageMin: j.wageMin ?? "",
        wageMax: j.wageMax ?? "",
        positions: j.positions ?? "",
        source: j.source,
        active: j.active,
        postedAt: j.postedAt,
      })),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground-dim">
          {filtered.length} of {jobs.length} posting{jobs.length === 1 ? "" : "s"}
          {totalApplications > 0 && (
            <>
              {" · "}
              <button
                type="button"
                onClick={() => setOnlyWithApplications((v) => !v)}
                className={`rounded-full px-2 py-0.5 text-xs font-semibold transition ${
                  onlyWithApplications
                    ? "bg-emphasis text-white"
                    : "bg-emphasis/10 text-emphasis hover:bg-emphasis/15"
                }`}
              >
                {totalApplications} application{totalApplications === 1 ? "" : "s"}
                {onlyWithApplications ? " · showing only these" : " · show only these"}
              </button>
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search title, employer, skill…"
            className="w-56 rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <select
            value={sectorFilter}
            onChange={(e) => {
              setSectorFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
          >
            <option value="">All sectors</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Button label="Export CSV" icon={<Download className="h-4 w-4" />} variant="secondary" size="md" fullWidth={false} onPress={exportCsv} />
          <Button
            label="Post a job"
            icon={<Plus className="h-4 w-4" />}
            size="md"
            fullWidth={false}
            onPress={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-foreground-faint">
            {jobs.length === 0
              ? "No postings yet — post one to start matching real vacancies to beneficiaries by their spoken skills."
              : "No postings match."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {pageItems.map((job) => (
            <Card key={job.id} className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{job.title}</h3>
                  <p className="text-sm text-foreground-dim">{job.employerName}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
                    job.source === "EMPLOYER"
                      ? "bg-accent/10 text-accent"
                      : job.source === "SAMPLE"
                        ? "bg-warning/10 text-warning"
                        : "bg-surface-alt text-foreground-dim"
                  }`}
                >
                  {job.source}
                </span>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-foreground-faint">
                {job.sector && <span>{job.sector}</span>}
                {(job.state || job.district) && <span>{[job.district, job.state].filter(Boolean).join(", ")}</span>}
                {(job.wageMin || job.wageMax) && (
                  <span>
                    ₹{job.wageMin ?? "?"}–{job.wageMax ?? "?"}/mo
                  </span>
                )}
                <span>{job.positions ?? 1} position{(job.positions ?? 1) === 1 ? "" : "s"}</span>
              </div>

              {job.description && <p className="text-sm text-foreground-dim">{job.description}</p>}

              {(job.applicationCount ?? 0) > 0 && (
                <div className="-mx-4 -mb-4 mt-1 rounded-b-xl bg-surface-alt/60">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenApplicationsFor((cur) => (cur === job.id ? null : job.id))
                    }
                    aria-expanded={openApplicationsFor === job.id}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-semibold text-emphasis hover:bg-surface-alt"
                  >
                    <span>
                      {job.applicationCount} applicant{job.applicationCount === 1 ? "" : "s"}
                    </span>
                    <span className="text-xs font-normal text-foreground-faint">
                      {openApplicationsFor === job.id ? "Hide" : "View"}
                    </span>
                  </button>
                  {openApplicationsFor === job.id && token && (
                    <ApplicationsPanel jobId={job.id} token={token} />
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {job.skillTokens.map((t) => (
                  <Chip key={t} label={t} tone="primary" />
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  label="Edit"
                  variant="secondary"
                  size="md"
                  fullWidth={false}
                  icon={<Pencil className="h-3.5 w-3.5" />}
                  onPress={() => {
                    setEditing(job);
                    setFormOpen(true);
                  }}
                />
                <Button
                  label="Delete"
                  variant="danger"
                  size="md"
                  fullWidth={false}
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  onPress={() => handleDelete(job)}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {formOpen && (
        <JobForm
          job={editing}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function JobForm({ job, onClose, onSaved }: { job: JobPosting | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(job?.title ?? "");
  const [titleHindi, setTitleHindi] = useState(job?.titleHindi ?? "");
  const [employerName, setEmployerName] = useState(job?.employerName ?? "");
  const [skillTokens, setSkillTokens] = useState<string[]>(job?.skillTokens ?? []);
  const [sector, setSector] = useState(job?.sector ?? "");
  const [nsqfQualificationId, setNsqfQualificationId] = useState(job?.nsqfQualificationId ?? "");
  const [nsqfLevel, setNsqfLevel] = useState(job?.nsqfLevel?.toString() ?? "");
  const [state, setStateField] = useState(job?.state ?? "");
  const [district, setDistrict] = useState(job?.district ?? "");
  const [wageMin, setWageMin] = useState(job?.wageMin?.toString() ?? "");
  const [wageMax, setWageMax] = useState(job?.wageMax?.toString() ?? "");
  const [positions, setPositions] = useState(job?.positions?.toString() ?? "1");
  const [contactPhone, setContactPhone] = useState(job?.contactPhone ?? "");
  const [description, setDescription] = useState(job?.description ?? "");

  const [allTokens, setAllTokens] = useState<string[]>([]);
  const [tokenQuery, setTokenQuery] = useState("");
  const [suggestion, setSuggestion] = useState<JobPostingSuggestion | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    getSkillTokens(token).then(setAllTokens).catch(() => {});
  }, []);

  useEffect(() => {
    const primary = skillTokens[0];
    if (!primary) {
      setSuggestion(null);
      return;
    }
    const token = getToken();
    if (!token) return;
    setSuggestLoading(true);
    suggestForSkillToken(token, primary)
      .then(setSuggestion)
      .catch(() => setSuggestion(null))
      .finally(() => setSuggestLoading(false));
  }, [skillTokens]);

  function addToken(t: string) {
    if (!skillTokens.includes(t)) setSkillTokens((prev) => [...prev, t]);
    setTokenQuery("");
  }

  function removeToken(t: string) {
    setSkillTokens((prev) => prev.filter((x) => x !== t));
  }

  function applySuggestedTitle(t: string) {
    setTitle(t);
  }

  function applySuggestedQualification(q: JobPostingSuggestion["qualifications"][number]) {
    setNsqfQualificationId(q.id);
    setSector(q.sector);
    setNsqfLevel(String(q.nsqfLevel));
  }

  async function submit() {
    setError(null);
    if (title.trim().length < 2) return setError("Title is required.");
    if (employerName.trim().length < 2) return setError("Employer name is required.");
    if (skillTokens.length === 0) return setError("Pick at least one skill token, or this posting will never match a beneficiary.");
    const token = getToken();
    if (!token) return;
    setBusy(true);
    const input: JobPostingInput = {
      title: title.trim(),
      titleHindi: titleHindi.trim() || undefined,
      employerName: employerName.trim(),
      skillTokens,
      nsqfQualificationId: nsqfQualificationId || undefined,
      sector: sector.trim() || undefined,
      nsqfLevel: nsqfLevel ? Number(nsqfLevel) : undefined,
      state: state.trim() || undefined,
      district: district.trim() || undefined,
      wageMin: wageMin ? Number(wageMin) : undefined,
      wageMax: wageMax ? Number(wageMax) : undefined,
      positions: positions ? Number(positions) : 1,
      contactPhone: contactPhone.trim() || undefined,
      description: description.trim() || undefined,
    };
    try {
      if (job) await updateJobPosting(token, job.id, input);
      else await createJobPosting(token, input);
      onSaved();
    } catch {
      setError("Could not save — the backend may be waking up, try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  const filteredTokens = allTokens.filter(
    (t) => t.includes(tokenQuery.toLowerCase()) && !skillTokens.includes(t),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-md bg-surface p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{job ? "Edit posting" : "Post a job"}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 hover:bg-surface-alt">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-xs uppercase tracking-wide text-foreground-faint">
              1. Which skill does this job need? (required — pick from the voice pipeline&apos;s own vocabulary)
            </p>
            {skillTokens.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {skillTokens.map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1 rounded-full border border-brand/25 bg-brand/10 px-2.5 py-1 text-xs text-brand"
                  >
                    {t}
                    <button onClick={() => removeToken(t)} aria-label={`Remove ${t}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-faint" />
              <input
                value={tokenQuery}
                onChange={(e) => setTokenQuery(e.target.value)}
                placeholder="Search skill tokens (pottery, tailoring, driving…)"
                className="w-full rounded-md border border-border bg-transparent py-2.5 pl-9 pr-3.5 text-sm outline-none focus:border-brand"
              />
            </div>
            {tokenQuery && filteredTokens.length > 0 && (
              <div className="mt-1.5 max-h-32 overflow-y-auto rounded-md border border-border">
                {filteredTokens.slice(0, 20).map((t) => (
                  <button
                    key={t}
                    onClick={() => addToken(t)}
                    className="flex w-full items-center border-b border-border px-2.5 py-2 text-left text-sm last:border-0 hover:bg-surface-alt"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {skillTokens.length > 0 && (
            <div className="rounded-md border border-brand/20 bg-brand/5 p-3.5">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand">
                <Sparkles className="h-3.5 w-3.5" />
                Recommendations for &ldquo;{skillTokens[0]}&rdquo;
              </div>
              {suggestLoading && <p className="text-xs text-foreground-faint">Looking up real catalogue data…</p>}
              {!suggestLoading && suggestion && (
                <div className="space-y-3 text-sm">
                  {suggestion.suggestedTitles.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs text-foreground-faint">Suggested job titles (from real NSQF proposed occupations):</p>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestion.suggestedTitles.map((t) => (
                          <button
                            key={t}
                            onClick={() => applySuggestedTitle(t)}
                            className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs hover:border-brand hover:text-brand"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {suggestion.qualifications.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs text-foreground-faint">Link to a real NSQF qualification:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestion.qualifications.map((q) => (
                          <button
                            key={q.id}
                            onClick={() => applySuggestedQualification(q)}
                            className={`rounded-full border px-2.5 py-1 text-xs ${
                              nsqfQualificationId === q.id
                                ? "border-brand bg-brand text-white"
                                : "border-border bg-surface hover:border-brand hover:text-brand"
                            }`}
                          >
                            {q.qpCode} · Level {q.nsqfLevel}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {(suggestion.schemes.length > 0 || suggestion.pmajayCourses.length > 0) && (
                    <div>
                      <p className="mb-1 text-xs text-foreground-faint">
                        Yojana / scheme context for &ldquo;{suggestion.sectors.join(", ")}&rdquo;:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestion.schemes.map((s, i) => (
                          <Chip key={i} label={`${s.scheme}${s.component ? ` · ${s.component}` : ""}`} tone="accent" />
                        ))}
                      </div>
                      {suggestion.pmajayCourses.length > 0 && (
                        <p className="mt-1.5 text-xs text-foreground-faint">
                          Real PM-AJAY courses in this sector: {suggestion.pmajayCourses.slice(0, 4).map((c) => c.subCourseName).join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                  {suggestion.qualifications.length === 0 && suggestion.suggestedTitles.length === 0 && (
                    <p className="text-xs text-foreground-faint">No catalogue matches for this token yet.</p>
                  )}
                </div>
              )}
            </div>
          )}

          <p className="text-xs uppercase tracking-wide text-foreground-faint">2. Posting details</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Job title"
              className="rounded-md border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-brand sm:col-span-2"
            />
            <input
              value={titleHindi}
              onChange={(e) => setTitleHindi(e.target.value)}
              placeholder="Hindi title (optional)"
              className="rounded-md border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-brand"
            />
            <input
              value={employerName}
              onChange={(e) => setEmployerName(e.target.value)}
              placeholder="Employer name"
              className="rounded-md border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-brand"
            />
            <input
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              placeholder="Sector"
              className="rounded-md border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-brand"
            />
            <input
              value={nsqfLevel}
              onChange={(e) => setNsqfLevel(e.target.value)}
              placeholder="NSQF level expected"
              inputMode="numeric"
              className="rounded-md border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-brand"
            />
            <input
              value={state}
              onChange={(e) => setStateField(e.target.value)}
              placeholder="State"
              className="rounded-md border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-brand"
            />
            <input
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="District"
              className="rounded-md border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-brand"
            />
            <input
              value={wageMin}
              onChange={(e) => setWageMin(e.target.value)}
              placeholder="Wage min (₹/month)"
              inputMode="numeric"
              className="rounded-md border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-brand"
            />
            <input
              value={wageMax}
              onChange={(e) => setWageMax(e.target.value)}
              placeholder="Wage max (₹/month)"
              inputMode="numeric"
              className="rounded-md border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-brand"
            />
            <input
              value={positions}
              onChange={(e) => setPositions(e.target.value)}
              placeholder="Positions open"
              inputMode="numeric"
              className="rounded-md border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-brand"
            />
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Contact phone"
              className="rounded-md border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-brand"
            />
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full rounded-md border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-brand"
          />

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button label={job ? "Save changes" : "Post job"} onPress={submit} loading={busy} className="mt-1" />
        </div>
      </div>
    </div>
  );
}
