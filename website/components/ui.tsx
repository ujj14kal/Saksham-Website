"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

export function Button({
  label,
  onPress,
  href,
  variant = "primary",
  size = "lg",
  loading = false,
  disabled = false,
  icon,
  fullWidth = true,
  className = "",
  type = "button",
}: {
  label: string;
  onPress?: () => void;
  href?: string;
  variant?: "primary" | "accent" | "secondary" | "ghost" | "danger" | "success";
  size?: "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  const variants: Record<string, string> = {
    primary: "bg-brand text-on-brand hover:bg-brand-strong",
    accent: "bg-accent text-on-accent hover:bg-accent-strong",
    secondary: "border border-border bg-surface text-foreground hover:bg-surface-alt",
    ghost: "bg-transparent text-foreground-dim hover:bg-surface-alt",
    danger: "bg-danger text-white hover:brightness-95",
    success: "bg-success text-white hover:brightness-95",
  };
  const cls = `inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 ${
    size === "lg" ? "h-11 px-5 text-sm" : "h-9 px-3.5 text-sm"
  } ${fullWidth ? "w-full" : ""} ${variants[variant]} ${className}`;

  const content = (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {label}
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onPress} disabled={disabled || loading} className={cls}>
      {content}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-border bg-surface p-4 ${className}`}>{children}</div>;
}

export function Chip({
  label,
  tone = "default",
  icon,
}: {
  label: string;
  tone?: "default" | "primary" | "accent" | "success" | "warning";
  icon?: ReactNode;
}) {
  const tones: Record<string, string> = {
    default: "border-border text-foreground-dim",
    primary: "border-brand/30 bg-brand/5 text-brand",
    accent: "border-accent/30 bg-accent/5 text-accent",
    success: "border-success/30 bg-success-soft text-success",
    warning: "border-warning/30 bg-warning-soft text-warning",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {icon}
      {label}
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-alt ${className}`} />;
}

/** Simple prev/next + page-number pagination, used consistently across every
 *  admin list page (Job Postings, Knowledge Base, Catalogue). */
export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );
  return (
    <div className="flex items-center justify-center gap-1 pt-2">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className="flex h-8 w-8 items-center justify-center rounded border border-border disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-foreground-faint">…</span>}
          <button
            onClick={() => onChange(p)}
            className={`flex h-8 w-8 items-center justify-center rounded border text-sm ${
              p === page ? "border-brand bg-brand text-on-brand" : "border-border hover:bg-surface-alt"
            }`}
          >
            {p}
          </button>
        </span>
      ))}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className="flex h-8 w-8 items-center justify-center rounded border border-border disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
