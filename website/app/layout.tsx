import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "600", "700", "800", "900"] });

const siteUrl = "https://saksham-website-five.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Saksham — Voice-first skilling for PM-AJAY",
    template: "%s · Saksham",
  },
  description:
    "Speak your skill in your own language — Saksham maps it to a real NSQF qualification and matches you to PM-AJAY training programmes. Ministry of Social Justice & Empowerment.",
  keywords: [
    "Saksham",
    "PM-AJAY",
    "NSQF",
    "skilling",
    "livelihood",
    "Ministry of Social Justice and Empowerment",
    "vocational training India",
  ],
  authors: [{ name: "Saksham" }],
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    title: "Saksham — Voice-first skilling for PM-AJAY",
    description:
      "Speak your skill in your own language and find real PM-AJAY training, matched to a formal NSQF qualification.",
    url: siteUrl,
    siteName: "Saksham",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Saksham — Voice-first skilling for PM-AJAY",
    description:
      "Speak your skill in your own language and find real PM-AJAY training, matched to a formal NSQF qualification.",
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/icon.png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F5F7FB",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers>{children}</Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
