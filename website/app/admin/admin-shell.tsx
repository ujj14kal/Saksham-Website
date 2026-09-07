"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users2,
  History,
  Briefcase,
  GraduationCap,
  BookOpen,
  BarChart3,
  Settings,
  Library,
  LogOut,
} from "lucide-react";
import { clearToken, getToken } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users2 },
  { href: "/admin/sessions", label: "Sessions", icon: History },
  { href: "/admin/jobs", label: "Job Postings", icon: Briefcase },
  { href: "/admin/programs", label: "Training Programs", icon: GraduationCap },
  { href: "/admin/catalog", label: "Catalogue", icon: Library },
  { href: "/admin/knowledge", label: "Knowledge Base", icon: BookOpen },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/system", label: "System", icon: Settings },
];

export function AdminShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) router.replace("/admin/login");
    else setReady(true);
  }, [router]);

  if (!ready) return null;

  function signOut() {
    clearToken();
    router.replace("/admin/login");
  }

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 lg:flex">
        {/* the mark is the way back out to the public site, which is where
            people expect a logo to take them */}
        <Link
          href="/"
          aria-label="Saksham — go to the public site"
          className="flex items-center gap-2.5 rounded-lg px-2 py-1 transition hover:bg-surface-alt"
        >
          <Image src="/icon.png" alt="" width={32} height={32} className="rounded-lg" />
          <div className="leading-tight">
            <p className="text-sm font-semibold">सक्षम · Admin</p>
            <p className="text-[11px] text-foreground-faint">PM-AJAY · MoSJE</p>
          </div>
        </Link>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((n) => {
            const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                  active ? "bg-brand text-on-brand" : "text-foreground-dim hover:bg-surface-alt"
                }`}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={signOut}
          className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium text-foreground-dim transition hover:bg-surface-alt"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </aside>

      <div className="flex-1">
        {/* Mobile top nav */}
        <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
          <Link
            href="/"
            aria-label="Saksham — go to the public site"
            className="flex items-center gap-2 rounded-lg px-1 py-0.5 transition hover:bg-surface-alt"
          >
            <Image src="/icon.png" alt="" width={26} height={26} className="rounded-lg" />
            <p className="text-sm font-semibold">सक्षम · Admin</p>
          </Link>
          <button onClick={signOut} className="text-sm font-medium text-foreground-dim">
            Sign out
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-4 py-2 lg:hidden">
          {NAV.map((n) => {
            const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                  active ? "bg-brand text-on-brand" : "bg-surface-alt text-foreground-dim"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="mx-auto max-w-6xl px-6 py-8">
          {(title || subtitle) && (
            <div className="mb-6">
              {title && <h1 className="text-2xl font-semibold">{title}</h1>}
              {subtitle && <p className="mt-1 text-sm text-foreground-dim">{subtitle}</p>}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
