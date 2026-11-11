import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "./globals.css";
import { getUser } from "@/lib/auth";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: { default: "EqualPath AI — Your Skills. Your Potential. Your Opportunity.", template: "%s · EqualPath AI" },
  description: "Truthful ATS-friendly resumes, AI career coaching, practice assessments, and verified job listings — built for every job seeker.",
};
export const viewport: Viewport = { themeColor: "#080B14", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let a: Record<string, boolean | undefined> = {};
  try {
    const u = await getUser();
    if (u) a = (await db.query.profiles.findFirst({ where: eq(schema.profiles.userId, u.id), columns: { accessibility: true } }))?.accessibility ?? {};
  } catch { /* render without prefs if DB unavailable */ }
  return (
    <html lang="en" data-reduced-motion={a.reducedMotion ? "true" : undefined} data-high-contrast={a.highContrast ? "true" : undefined} data-large-text={a.largeText ? "true" : undefined}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-violet-600 focus:px-4 focus:py-2">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
