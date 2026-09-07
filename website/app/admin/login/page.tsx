"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Eye, EyeOff, Lock, Phone, ShieldCheck } from "lucide-react";
import { login } from "@/lib/api";
import { saveToken } from "@/lib/auth";
import { useSlowRequestNotice } from "@/lib/use-slow-request-notice";
import { Button } from "@/components/ui";

const SITE_POINTS = [
  "Manage real job postings and training programmes",
  "Monitor live beneficiary sessions and the recommendation funnel",
  "Browse the real NSQF and PM-AJAY course catalogue",
  "Track analytics, consent, and audit history in one place",
];

export default function AdminLogin() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const slow = useSlowRequestNotice(loading);

  // both fields required before we bother the server
  const canSubmit = phone.trim().length > 0 && password.length > 0 && !loading;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const { token } = await login(phone.trim(), password);
      saveToken(token);
      router.replace("/admin");
    } catch {
      setError("Invalid credentials, or the backend is waking up — try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Left — the tricolour, as a wash rather than a flag. Saffron through
          white to green, with the chakra blue only as a faint accent: this is a
          government service, not an emblem, and the flag itself must not be
          reproduced as decoration. */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex"
        style={{
          background:
            "linear-gradient(155deg, #FF9933 0%, #fdf0e0 34%, #ffffff 52%, #eaf6ee 68%, #138808 100%)",
        }}
      >
        {/* soft chakra-blue bloom, kept low-contrast so text stays readable */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.07]"
          style={{ background: "radial-gradient(circle, #000080 0%, transparent 70%)" }}
        />

        <Link href="/" className="relative flex items-center gap-2.5">
          <Image src="/icon.png" alt="Saksham" width={36} height={36} className="rounded-md" />
          <div>
            <p className="text-sm font-semibold text-[#1b1b1b]">सक्षम · Saksham</p>
            <p className="text-xs text-[#1b1b1b]/70">PM-AJAY Skilling Assistant</p>
          </div>
        </Link>

        <div className="relative max-w-sm">
          <h1 className="text-3xl font-extrabold leading-tight text-[#0f1424]">
            The admin dashboard for PM-AJAY skilling.
          </h1>
          <p className="mt-3 text-sm text-[#1b1b1b]/75">
            Real data from the same pipeline that matches beneficiaries to NSQF qualifications and job
            postings — not a mockup.
          </p>
          <ul className="mt-6 space-y-3">
            {SITE_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2 text-sm text-[#1b1b1b]/80">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#138808]" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-[#1b1b1b]/65">
          Government of India · Ministry of Social Justice &amp; Empowerment
        </p>
      </div>

      {/* Right — sign in */}
      <div className="flex min-h-screen flex-col justify-center px-6 py-12">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Image src="/icon.png" alt="Saksham" width={36} height={36} className="rounded-md" />
            <div>
              <p className="text-sm font-semibold">सक्षम · Admin</p>
              <p className="text-xs text-foreground-faint">PM-AJAY Skilling Assistant</p>
            </div>
          </div>

          <div className="mb-7">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-foreground-dim">
              <ShieldCheck className="h-3.5 w-3.5 text-emphasis" />
              Restricted — programme staff only
            </span>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight">Sign in</h2>
            <p className="mt-1.5 text-sm text-foreground-dim">
              Use the phone number registered with your programme office.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="phone" className="mb-1.5 block text-xs font-semibold text-foreground-dim">
                Phone number
              </label>
              <div className="relative">
                <Phone
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-faint"
                />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="username"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9999900000"
                  autoFocus
                  aria-invalid={!!error}
                  className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3.5 text-sm outline-none transition focus:border-emphasis focus:ring-2 focus:ring-emphasis/15"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label htmlFor="password" className="text-xs font-semibold text-foreground-dim">
                  Password
                </label>
                <span className="text-[11px] text-foreground-faint">Contact your admin to reset</span>
              </div>
              <div className="relative">
                <Lock
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-faint"
                />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  aria-invalid={!!error}
                  className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-10 text-sm outline-none transition focus:border-emphasis focus:ring-2 focus:ring-emphasis/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-foreground-faint transition hover:text-foreground-dim"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* role="alert" so a screen reader announces the failure instead of
                leaving someone waiting on a form that silently did nothing */}
            {error && (
              <p role="alert" className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
            {slow && (
              <p className="text-xs text-foreground-faint">
                The server is waking up — this can take up to 30 seconds…
              </p>
            )}

            <Button
              type="submit"
              label={loading ? "Signing in…" : "Sign in"}
              loading={loading}
              disabled={!canSubmit}
              size="md"
            />
          </form>

          <p className="mt-6 text-[11px] leading-relaxed text-foreground-faint">
            This is a restricted government system. Access is logged. Unauthorised use may be an offence
            under the Information Technology Act, 2000.
          </p>

          <Link
            href="/"
            className="mt-5 inline-block text-xs text-foreground-faint transition hover:text-foreground-dim hover:underline"
          >
            ← Back to the public site
          </Link>
        </div>
      </div>
    </div>
  );
}
