"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { use } from "react";
import { ArrowLeft } from "lucide-react";
import { getSessionDetail, recommendationName, type SessionDetail } from "@/lib/api";
import { getToken, handleAdminAuthError } from "@/lib/auth";
import { Card, Skeleton } from "@/components/ui";
import { AdminShell } from "../../admin-shell";

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AdminShell>
      <Detail id={id} />
    </AdminShell>
  );
}

function Detail({ id }: { id: string }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionDetail | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    getSessionDetail(token, id)
      .then(setSession)
      .catch((err) => {
        if (handleAdminAuthError(err)) router.replace("/admin/login");
        else setError("Could not load this session — the backend may be waking up.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <p className="text-sm text-danger">{error}</p>;

  if (session === undefined) {
    return (
      <div className="space-y-4">
        <BackLink />
        <Card className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </Card>
      </div>
    );
  }

  if (session === null)
    return (
      <div>
        <BackLink />
        <p className="mt-4 text-sm text-foreground-dim">Session not found.</p>
      </div>
    );

  return (
    <div className="space-y-6">
      <BackLink />

      <div>
        <h1 className="text-xl font-semibold">Session</h1>
        <p className="text-sm text-foreground-dim">
          {new Date(session.createdAt).toLocaleString()} · {session.language} · {session.channel}
        </p>
      </div>

      <Card>
        <h2 className="mb-2 font-semibold">Beneficiary</h2>
        {session.user ? (
          <p className="text-sm">
            <Link href={`/admin/users/${session.user.id}`} className="text-brand hover:underline">
              {session.user.name ?? "(no name)"}
            </Link>{" "}
            · {session.user.phone ?? "—"} · {[session.user.district, session.user.state].filter(Boolean).join(", ") || "—"}
          </p>
        ) : (
          <p className="text-sm text-foreground-faint">Guest session, not linked to an account.</p>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Transcript</h2>
        <p className="text-sm italic">{session.rawTranscript ? `"${session.rawTranscript}"` : "No transcript recorded."}</p>
        <p className="mt-2 text-xs text-foreground-faint">
          {[session.district, session.state].filter(Boolean).join(", ") || "No location"}
          {session.bandwidthKbps ? ` · ${session.bandwidthKbps} kbps` : ""}
        </p>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Skill mappings</h2>
        {session.mappings.length === 0 ? (
          <p className="text-sm text-foreground-faint">None.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {session.mappings.map((m) => (
              <li key={m.id}>
                {m.nsqfQualification ? (
                  <>
                    <span className="font-medium">{m.nsqfQualification.qpCode}</span> · {m.nsqfQualification.title}{" "}
                    <span className="font-medium text-success">{Math.round(m.confidence * 100)}%</span>
                  </>
                ) : (
                  <span className="text-warning">{m.normalizedSkill} (needs review)</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Recommendations</h2>
        {session.recommendations.length === 0 ? (
          <p className="text-sm text-foreground-faint">None.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {session.recommendations.map((r) => (
              <li key={r.id} className="flex items-center justify-between">
                <span>{recommendationName(r)}</span>
                <span className="rounded border border-border px-2 py-0.5 text-xs">{r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/admin/sessions" className="inline-flex items-center gap-1.5 text-sm text-foreground-dim hover:text-brand">
      <ArrowLeft className="h-4 w-4" />
      Back to sessions
    </Link>
  );
}
