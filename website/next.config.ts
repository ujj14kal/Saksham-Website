import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // This monorepo (and the machine's home dir) contain other lockfiles; pin the
  // tracing root to this package so Next doesn't guess.
  outputFileTracingRoot: path.join(__dirname),
  async headers() {
    // A properly nonce-based CSP was attempted here (middleware generating
    // a per-request nonce) and reverted: Next.js's App Router injects its
    // own inline bootstrap/streaming scripts and, in testing, a strict
    // `script-src 'self' 'nonce-...' 'strict-dynamic'` ended up blocking
    // Next's own chunk <script> tags too (verified: broke every client-side
    // redirect on the whole site, including the admin login gate). Rather
    // than leave that broken or spend longer chasing Next-version-specific
    // nonce propagation, 'unsafe-inline' is the accepted trade-off here —
    // it still blocks the more common cross-origin script-injection vector
    // via `script-src 'self'`, just not same-page inline injection.
    // Next's dev server compiles and hot-reloads through eval(), so without
    // this every client component silently fails to hydrate in `npm run dev`
    // — interactive UI looks frozen while working fine in a production build.
    // Never added to the production policy.
    const devScript = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

    // Vercel Analytics and Speed Insights load their script from
    // va.vercel-scripts.com and beacon back to vitals.vercel-insights.com.
    // Neither host was allowed, so both were blocked in the browser and the
    // components in app/layout.tsx collected nothing — dead weight that looked
    // wired up.
    const vercelScript = "https://va.vercel-scripts.com";
    const vercelBeacon = "https://vitals.vercel-insights.com";

    // The API host was hardcoded here, so pointing NEXT_PUBLIC_API_URL at a
    // local backend left every request blocked by connect-src with no error the
    // UI could show — the form simply did nothing. Derive it from the same
    // variable the client uses, and keep the deployed host as the fallback.
    const apiOrigin = (() => {
      try {
        return new URL(process.env.NEXT_PUBLIC_API_URL ?? "https://saksham-api-82mn.onrender.com").origin;
      } catch {
        return "https://saksham-api-82mn.onrender.com";
      }
    })();

    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' ${vercelScript}${devScript}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "font-src 'self'",
      `connect-src 'self' ${apiOrigin} ${vercelBeacon} ${vercelScript}`,
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // No beneficiary voice/location features remain on this site — deny all three.
          { key: "Permissions-Policy", value: "microphone=(), geolocation=(), camera=()" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
