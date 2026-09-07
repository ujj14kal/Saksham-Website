"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, X, Upload, Download } from "lucide-react";
import { getToken, handleAdminAuthError } from "@/lib/auth";
import {
  getPrograms_admin,
  createProgram,
  updateProgram,
  deleteProgram,
  type TrainingProgram,
  type TrainingProgramInput,
} from "@/lib/api";
import { downloadCsv, parseCsv } from "@/lib/csv";
import { Button, Card, Chip, Skeleton } from "@/components/ui";
import { AdminShell } from "../admin-shell";

export default function ProgramsPage() {
  return (
    <AdminShell title="Training Programs" subtitle="PM-AJAY / partner skilling programmes a beneficiary can be routed to.">
      <Programs />
    </AdminShell>
  );
}

function Programs() {
  const router = useRouter();
  const [programs, setPrograms] = useState<TrainingProgram[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingProgram | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  function load() {
    const token = getToken();
    if (!token) return;
    getPrograms_admin(token)
      .then(setPrograms)
      .catch((err) => {
        if (handleAdminAuthError(err)) router.replace("/admin/login");
        else setError("Could not load programmes — the backend may be waking up. Reload in a moment.");
      });
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(p: TrainingProgram) {
    const token = getToken();
    if (!token) return;
    if (!confirm(`Delete "${p.name}"? This can't be undone.`)) return;
    await deleteProgram(token, p.id);
    load();
  }

  function exportCsv() {
    if (!programs) return;
    downloadCsv(
      "training-programs.csv",
      programs.map((p) => ({
        name: p.name,
        nameHindi: p.nameHindi ?? "",
        scheme: p.scheme,
        component: p.component ?? "",
        sector: p.sector ?? "",
        mode: p.mode,
        durationWeeks: p.durationWeeks ?? "",
        state: p.state ?? "",
        district: p.district ?? "",
        contactPhone: p.contactPhone ?? "",
        seatsTotal: p.seatsTotal ?? "",
        seatsAvailable: p.seatsAvailable ?? "",
        stipend: p.stipend,
        active: p.active,
      })),
    );
  }

  async function handleImport(file: File) {
    const token = getToken();
    if (!token) return;
    setImporting(true);
    setImportResult(null);
    const text = await file.text();
    const rows = parseCsv(text);
    let created = 0;
    let failed = 0;
    for (const row of rows) {
      if (!row.name) continue;
      try {
        await createProgram(token, {
          name: row.name,
          nameHindi: row.nameHindi || undefined,
          scheme: row.scheme || "PM-AJAY",
          component: row.component || undefined,
          sector: row.sector || undefined,
          mode: row.mode || "OFFLINE",
          durationWeeks: row.durationWeeks ? Number(row.durationWeeks) : undefined,
          state: row.state || undefined,
          district: row.district || undefined,
          contactPhone: row.contactPhone || undefined,
          seatsTotal: row.seatsTotal ? Number(row.seatsTotal) : undefined,
          seatsAvailable: row.seatsAvailable ? Number(row.seatsAvailable) : undefined,
          stipend: row.stipend === "true",
        });
        created++;
      } catch {
        failed++;
      }
    }
    setImportResult(`Imported ${created} programme${created === 1 ? "" : "s"}${failed ? `, ${failed} failed` : ""}.`);
    setImporting(false);
    load();
  }

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!programs) {
    return (
      <Card className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground-dim">{programs.length} programme{programs.length === 1 ? "" : "s"}</p>
        <div className="flex flex-wrap gap-2">
          <Button label="Export CSV" icon={<Download className="h-4 w-4" />} variant="secondary" size="md" fullWidth={false} onPress={exportCsv} />
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3.5 text-sm font-medium hover:bg-surface-alt">
            <Upload className="h-4 w-4" />
            {importing ? "Importing…" : "Import CSV"}
            <input
              type="file"
              accept=".csv"
              className="hidden"
              disabled={importing}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
                e.target.value = "";
              }}
            />
          </label>
          <Button
            label="Add programme"
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
      {importResult && <p className="text-sm text-foreground-dim">{importResult}</p>}

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-alt text-xs uppercase text-foreground-dim">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Scheme</th>
              <th className="px-3 py-2">Sector</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Seats</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {programs.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2 text-foreground-dim">{p.scheme}{p.component ? ` · ${p.component}` : ""}</td>
                <td className="px-3 py-2 text-foreground-dim">{p.sector ?? "—"}</td>
                <td className="px-3 py-2 text-foreground-dim">{[p.district, p.state].filter(Boolean).join(", ") || "—"}</td>
                <td className="px-3 py-2 text-foreground-dim">
                  {p.seatsAvailable ?? "?"}/{p.seatsTotal ?? "?"}
                </td>
                <td className="px-3 py-2">
                  {p.active ? <Chip label="Active" tone="success" /> : <Chip label="Inactive" tone="default" />}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditing(p);
                        setFormOpen(true);
                      }}
                      aria-label="Edit"
                      className="rounded p-1.5 hover:bg-surface-alt"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(p)} aria-label="Delete" className="rounded p-1.5 hover:bg-surface-alt">
                      <Trash2 className="h-3.5 w-3.5 text-danger" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {programs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-foreground-faint">
                  No programmes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <ProgramForm
          program={editing}
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

function ProgramForm({
  program,
  onClose,
  onSaved,
}: {
  program: TrainingProgram | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(program?.name ?? "");
  const [nameHindi, setNameHindi] = useState(program?.nameHindi ?? "");
  const [scheme, setScheme] = useState(program?.scheme ?? "PM-AJAY");
  const [component, setComponent] = useState(program?.component ?? "");
  const [sector, setSector] = useState(program?.sector ?? "");
  const [mode, setMode] = useState(program?.mode ?? "OFFLINE");
  const [durationWeeks, setDurationWeeks] = useState(program?.durationWeeks?.toString() ?? "");
  const [state, setStateField] = useState(program?.state ?? "");
  const [district, setDistrict] = useState(program?.district ?? "");
  const [contactPhone, setContactPhone] = useState(program?.contactPhone ?? "");
  const [seatsTotal, setSeatsTotal] = useState(program?.seatsTotal?.toString() ?? "");
  const [seatsAvailable, setSeatsAvailable] = useState(program?.seatsAvailable?.toString() ?? "");
  const [stipend, setStipend] = useState(program?.stipend ?? false);
  const [active, setActive] = useState(program?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (name.trim().length < 2) return setError("Name is required.");
    const token = getToken();
    if (!token) return;
    setBusy(true);
    const input: Partial<TrainingProgramInput> = {
      name: name.trim(),
      nameHindi: nameHindi.trim() || undefined,
      scheme: scheme.trim() || "PM-AJAY",
      component: component.trim() || undefined,
      sector: sector.trim() || undefined,
      mode,
      durationWeeks: durationWeeks ? Number(durationWeeks) : undefined,
      state: state.trim() || undefined,
      district: district.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      seatsTotal: seatsTotal ? Number(seatsTotal) : undefined,
      seatsAvailable: seatsAvailable ? Number(seatsAvailable) : undefined,
      stipend,
      active,
    };
    try {
      if (program) await updateProgram(token, program.id, input);
      else await createProgram(token, input);
      onSaved();
    } catch {
      setError("Could not save — the backend may be waking up, try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md bg-surface p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{program ? "Edit programme" : "Add programme"}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1.5 hover:bg-surface-alt">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand sm:col-span-2" />
          <input value={nameHindi} onChange={(e) => setNameHindi(e.target.value)} placeholder="Hindi name (optional)" className="rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand" />
          <input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Sector" className="rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand" />
          <input value={scheme} onChange={(e) => setScheme(e.target.value)} placeholder="Scheme" className="rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand" />
          <input value={component} onChange={(e) => setComponent(e.target.value)} placeholder="Component (Adarsh Gram / GIA / Hostel / Skill Development)" className="rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand" />
          <select value={mode} onChange={(e) => setMode(e.target.value)} className="rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand">
            <option value="OFFLINE">Offline</option>
            <option value="ONLINE">Online</option>
            <option value="HYBRID">Hybrid</option>
          </select>
          <input value={durationWeeks} onChange={(e) => setDurationWeeks(e.target.value)} placeholder="Duration (weeks)" inputMode="numeric" className="rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand" />
          <input value={state} onChange={(e) => setStateField(e.target.value)} placeholder="State" className="rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand" />
          <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="District" className="rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand" />
          <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Contact phone" className="rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand" />
          <input value={seatsTotal} onChange={(e) => setSeatsTotal(e.target.value)} placeholder="Seats total" inputMode="numeric" className="rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand" />
          <input value={seatsAvailable} onChange={(e) => setSeatsAvailable(e.target.value)} placeholder="Seats available" inputMode="numeric" className="rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={stipend} onChange={(e) => setStipend(e.target.checked)} />
            Stipend provided
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <Button label={program ? "Save changes" : "Create programme"} onPress={submit} loading={busy} className="mt-4" />
      </div>
    </div>
  );
}
