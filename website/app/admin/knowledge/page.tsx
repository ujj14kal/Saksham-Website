"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { getToken, handleAdminAuthError } from "@/lib/auth";
import { getKnowledge, createKnowledge, updateKnowledge, deleteKnowledge, type KnowledgeChunk } from "@/lib/api";
import { Button, Card, Pagination, Skeleton } from "@/components/ui";
import { AdminShell } from "../admin-shell";

const PAGE_SIZE = 10;

export default function KnowledgePage() {
  return (
    <AdminShell
      title="Knowledge Base"
      subtitle="Real policy-document passages that answer FAQ questions ('Will I get a certificate?') via /api/assistant/ask."
    >
      <Knowledge />
    </AdminShell>
  );
}

function Knowledge() {
  const router = useRouter();
  const [chunks, setChunks] = useState<KnowledgeChunk[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeChunk | null>(null);
  const [query, setQuery] = useState("");
  const [docFilter, setDocFilter] = useState("");
  const [page, setPage] = useState(1);

  function load() {
    const token = getToken();
    if (!token) return;
    getKnowledge(token)
      .then(setChunks)
      .catch((err) => {
        if (handleAdminAuthError(err)) router.replace("/admin/login");
        else setError("Could not load the knowledge base — the backend may be waking up. Reload in a moment.");
      });
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(c: KnowledgeChunk) {
    const token = getToken();
    if (!token) return;
    if (!confirm(`Delete this passage from "${c.documentTitle}"? This can't be undone.`)) return;
    await deleteKnowledge(token, c.id);
    load();
  }

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!chunks) {
    return (
      <Card className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </Card>
    );
  }

  const documents = [...new Set(chunks.map((c) => c.documentTitle))].sort();

  const filtered = chunks.filter((c) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || c.documentTitle.toLowerCase().includes(q) || c.text.toLowerCase().includes(q);
    const matchesDoc = !docFilter || c.documentTitle === docFilter;
    return matchesQuery && matchesDoc;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground-dim">
          {filtered.length} of {chunks.length} passages
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search passages…"
            className="w-56 rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <select
            value={docFilter}
            onChange={(e) => {
              setDocFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
          >
            <option value="">All documents</option>
            {documents.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <Button
            label="Add passage"
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

      <div className="space-y-2">
        {pageItems.map((c) => (
          <Card key={c.id} className="space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{c.documentTitle}</p>
                <p className="text-xs text-foreground-faint">
                  Page {c.page} · chunk {c.chunkIndex} ·{" "}
                  <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                    source
                  </a>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing(c);
                    setFormOpen(true);
                  }}
                  aria-label="Edit"
                  className="rounded p-1.5 hover:bg-surface-alt"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(c)} aria-label="Delete" className="rounded p-1.5 hover:bg-surface-alt">
                  <Trash2 className="h-3.5 w-3.5 text-danger" />
                </button>
              </div>
            </div>
            <p className="text-sm text-foreground-dim">{c.text}</p>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-sm text-foreground-faint">No passages match.</p>}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {formOpen && (
        <KnowledgeForm
          chunk={editing}
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

function KnowledgeForm({
  chunk,
  onClose,
  onSaved,
}: {
  chunk: KnowledgeChunk | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [documentTitle, setDocumentTitle] = useState(chunk?.documentTitle ?? "");
  const [sourceUrl, setSourceUrl] = useState(chunk?.sourceUrl ?? "");
  const [page, setPage] = useState(chunk?.page?.toString() ?? "1");
  const [chunkIndex, setChunkIndex] = useState(chunk?.chunkIndex?.toString() ?? "0");
  const [text, setText] = useState(chunk?.text ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (documentTitle.trim().length < 2) return setError("Document title is required.");
    if (text.trim().length < 1) return setError("Passage text is required.");
    const token = getToken();
    if (!token) return;
    setBusy(true);
    const input = {
      documentTitle: documentTitle.trim(),
      sourceUrl: sourceUrl.trim(),
      page: Number(page) || 1,
      chunkIndex: Number(chunkIndex) || 0,
      text: text.trim(),
    };
    try {
      if (chunk) await updateKnowledge(token, chunk.id, input);
      else await createKnowledge(token, input);
      onSaved();
    } catch {
      setError("Could not save — the backend may be waking up, try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{chunk ? "Edit passage" : "Add passage"}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1.5 hover:bg-surface-alt">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <input value={documentTitle} onChange={(e) => setDocumentTitle(e.target.value)} placeholder="Document title" className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand" />
          <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="Source URL" className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand" />
          <div className="grid grid-cols-2 gap-3">
            <input value={page} onChange={(e) => setPage(e.target.value)} placeholder="Page" inputMode="numeric" className="rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand" />
            <input value={chunkIndex} onChange={(e) => setChunkIndex(e.target.value)} placeholder="Chunk index" inputMode="numeric" className="rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand" />
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Passage text" rows={6} className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand" />
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <Button label={chunk ? "Save changes" : "Add passage"} onPress={submit} loading={busy} className="mt-4" />
      </div>
    </div>
  );
}
