"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { getToken, handleAdminAuthError } from "@/lib/auth";
import {
  getConsentSummary,
  getAdmins,
  createAdmin,
  getAuditLog,
  getOtpActivity,
  getConfigStatus,
  getNeedsReview,
  type ConsentSummary,
  type AdminAccount,
  type AuditLogEntry,
  type OtpActivityRow,
  type ConfigStatus,
  type NeedsReviewRow,
} from "@/lib/api";
import { Button, Card, Chip, Skeleton } from "@/components/ui";
import { AdminShell } from "../admin-shell";

type Tab = "consent" | "admins" | "audit" | "otp" | "config" | "review";

export default function SystemPage() {
  return (
    <AdminShell title="System" subtitle="Consent & privacy, admin accounts, audit log, OTP activity, config, needs-review.">
      <System />
    </AdminShell>
  );
}

function System() {
  const [tab, setTab] = useState<Tab>("consent");
  const tabs: { id: Tab; label: string }[] = [
    { id: "consent", label: "Consent & privacy" },
    { id: "admins", label: "Admin accounts" },
    { id: "audit", label: "Audit log" },
    { id: "otp", label: "OTP activity" },
    { id: "config", label: "Config & health" },
    { id: "review", label: "Needs review" },
  ];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.id ? "border-brand text-brand" : "border-transparent text-foreground-dim hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "consent" && <ConsentPanel />}
      {tab === "admins" && <AdminsPanel />}
      {tab === "audit" && <AuditPanel />}
      {tab === "otp" && <OtpPanel />}
      {tab === "config" && <ConfigPanel />}
      {tab === "review" && <NeedsReviewPanel />}
    </div>
  );
}

function ConsentPanel() {
  const router = useRouter();
  const [data, setData] = useState<ConsentSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    getConsentSummary(token)
      .then(setData)
      .catch((err) => {
        if (handleAdminAuthError(err)) router.replace("/admin/login");
        else setError("Could not load consent data.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!data) return <Skeleton className="h-24 w-full" />;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-xs uppercase tracking-wide text-foreground-faint">Beneficiaries</p>
          <p className="mt-1 text-2xl font-semibold">{data.totalBeneficiaries}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-foreground-faint">Granted location consent</p>
          <p className="mt-1 text-2xl font-semibold">{data.locationConsented}</p>
        </Card>
      </div>
      <Card>
        <h2 className="mb-3 font-semibold">Pending deletion requests</h2>
        {data.deletionRequests.length === 0 ? (
          <p className="text-sm text-foreground-faint">None pending.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {data.deletionRequests.map((r) => (
              <li key={r.id} className="flex justify-between">
                <span>{r.name ?? "(no name)"} · {r.phone ?? "—"}</span>
                <span className="text-foreground-faint">{new Date(r.deletionRequestedAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function AdminsPanel() {
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  function load() {
    const token = getToken();
    if (!token) return;
    getAdmins(token)
      .then(setAdmins)
      .catch((err) => {
        if (handleAdminAuthError(err)) router.replace("/admin/login");
        else setError("Could not load admin accounts.");
      });
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!admins) return <Skeleton className="h-24 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground-dim">{admins.length} admin account{admins.length === 1 ? "" : "s"}</p>
        <Button label="Add admin" icon={<Plus className="h-4 w-4" />} size="md" fullWidth={false} onPress={() => setFormOpen(true)} />
      </div>
      <Card>
        <ul className="divide-y divide-border">
          {admins.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {a.name ?? "(no name)"} · {a.phone}
                {a.role === "VIEWER" && <Chip label="Viewer" tone="default" />}
              </span>
              <span className="text-foreground-faint">{new Date(a.createdAt).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      </Card>
      {formOpen && (
        <AdminForm
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

function AdminForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "VIEWER">("ADMIN");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (name.trim().length < 1) return setError("Name is required.");
    if (phone.trim().length < 6) return setError("A valid phone number is required.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    const token = getToken();
    if (!token) return;
    setBusy(true);
    try {
      await createAdmin(token, { name: name.trim(), phone: phone.trim(), password, role });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create admin account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-md bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add admin account</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1.5 hover:bg-surface-alt">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password (min 8 characters)" className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand" />
          <select value={role} onChange={(e) => setRole(e.target.value as "ADMIN" | "VIEWER")} className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand">
            <option value="ADMIN">Admin (full access)</option>
            <option value="VIEWER">Viewer (read-only)</option>
          </select>
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <Button label="Create admin" onPress={submit} loading={busy} className="mt-4" />
      </div>
    </div>
  );
}

function AuditPanel() {
  const router = useRouter();
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    getAuditLog(token)
      .then(setEntries)
      .catch((err) => {
        if (handleAdminAuthError(err)) router.replace("/admin/login");
        else setError("Could not load the audit log.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!entries) return <Skeleton className="h-24 w-full" />;

  return (
    <Card>
      {entries.length === 0 ? (
        <p className="text-sm text-foreground-faint">No admin actions recorded yet.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {entries.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <span className="font-medium">{e.admin.name ?? e.admin.phone}</span> · {e.action} ·{" "}
                <span className="text-foreground-dim">{e.entityType}</span>
              </span>
              <span className="text-foreground-faint">{new Date(e.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function OtpPanel() {
  const router = useRouter();
  const [rows, setRows] = useState<OtpActivityRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    getOtpActivity(token)
      .then(setRows)
      .catch((err) => {
        if (handleAdminAuthError(err)) router.replace("/admin/login");
        else setError("Could not load OTP activity.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!rows) return <Skeleton className="h-24 w-full" />;

  return (
    <Card>
      {rows.length === 0 ? (
        <p className="text-sm text-foreground-faint">No OTP activity recorded.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {rows.map((r) => (
            <li key={r.phone} className="flex items-center justify-between py-2">
              <span>{r.phone}</span>
              <span className="flex items-center gap-2">
                {r.attempts >= 3 && <Chip label={`${r.attempts} attempts`} tone="warning" />}
                {r.attempts < 3 && <span className="text-foreground-faint">{r.attempts} attempt{r.attempts === 1 ? "" : "s"}</span>}
                <span className="text-foreground-faint">{new Date(r.createdAt).toLocaleString()}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ConfigPanel() {
  const router = useRouter();
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    getConfigStatus(token)
      .then(setStatus)
      .catch((err) => {
        if (handleAdminAuthError(err)) router.replace("/admin/login");
        else setError("Could not load config status.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!status) return <Skeleton className="h-24 w-full" />;

  const rows: { label: string; ok: boolean }[] = [
    { label: "LLM (Anthropic)", ok: status.llm },
    { label: "Sarvam speech-to-text", ok: status.sarvamSpeech },
    { label: "Groq", ok: status.groq },
    { label: "Bhashini", ok: status.bhashini },
    { label: "SMS provider", ok: status.sms },
    { label: "Twilio WhatsApp", ok: status.twilioWhatsapp },
    { label: "Stitch", ok: status.stitch },
  ];

  return (
    <Card>
      <ul className="divide-y divide-border text-sm">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between py-2">
            <span>{r.label}</span>
            <Chip label={r.ok ? "Configured" : "Not configured"} tone={r.ok ? "success" : "warning"} />
          </li>
        ))}
        <li className="flex items-center justify-between py-2">
          <span>OTP delivery mode</span>
          <span className="text-foreground-dim">{status.otpMode}</span>
        </li>
      </ul>
    </Card>
  );
}

function NeedsReviewPanel() {
  const router = useRouter();
  const [rows, setRows] = useState<NeedsReviewRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    getNeedsReview(token)
      .then(setRows)
      .catch((err) => {
        if (handleAdminAuthError(err)) router.replace("/admin/login");
        else setError("Could not load the needs-review queue.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!rows) return <Skeleton className="h-24 w-full" />;

  return (
    <Card>
      <p className="mb-3 text-sm text-foreground-dim">
        Spoken skills the pipeline recognized but could not match to a real NSQF qualification.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-foreground-faint">Nothing needs review.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {rows.map((r) => (
            <li key={r.id} className="py-2">
              <p>
                <span className="font-medium text-warning">{r.normalizedSkill}</span>
                <span className="text-foreground-faint"> — &ldquo;{r.rawSkillText}&rdquo;</span>
              </p>
              <p className="mt-0.5 text-xs text-foreground-faint">
                {new Date(r.createdAt).toLocaleString()} · {r.session.language}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
