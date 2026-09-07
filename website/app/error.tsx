"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";
import { reportError } from "@/lib/error-reporting";

/**
 * Was the failure the network, or the page's own code?
 *
 * This screen used to blame the backend for everything ("may be waking up from
 * a cold start"), which sent people looking in the wrong place when the real
 * cause was a client-side TypeError. A fetch that never reached the server
 * throws a TypeError from fetch itself, or an explicit HTTP-status error; a
 * bug in our code reads as something else entirely.
 */
function looksLikeNetworkFailure(error: Error): boolean {
  const m = error.message.toLowerCase();
  return (
    m.includes("fetch") ||
    m.includes("network") ||
    m.includes("load failed") ||
    m.includes("timeout") ||
    /\b(429|500|502|503|504)\b/.test(m)
  );
}

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    reportError(error.message, { stack: error.stack });
  }, [error]);

  const network = looksLikeNetworkFailure(error);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-md bg-danger-soft text-danger">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-foreground-dim">
        {network
          ? "We could not reach the server. It may be waking up from a cold start — give it a moment and try again."
          : "This page hit an unexpected error. Trying again usually fixes it; if it keeps happening, reload the page."}
      </p>
      {/* the actual message, for whoever has to fix it — a bare "something went
          wrong" gives a developer nothing to go on */}
      {process.env.NODE_ENV === "development" && (
        <p className="mt-3 max-w-full break-words rounded-md bg-surface-alt px-3 py-2 text-left font-mono text-xs text-foreground-faint">
          {error.message}
        </p>
      )}
      <div className="mt-6 w-full max-w-[220px]">
        <Button label="Try again" onPress={reset} />
      </div>
    </div>
  );
}
