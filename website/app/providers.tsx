"use client";

import { useEffect, type ReactNode } from "react";
import { installGlobalErrorReporting } from "@/lib/error-reporting";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    installGlobalErrorReporting();
  }, []);

  return <>{children}</>;
}
