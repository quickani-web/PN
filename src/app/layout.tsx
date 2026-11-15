import type { Metadata } from "next";
import { Space_Grotesk, Manrope } from "next/font/google";
import { Suspense } from "react";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { AgeGate } from "@/components/layout/age-gate";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import {
  NavigationBusyOverlay,
  NavigationPendingProvider,
} from "@/components/layout/navigation-pending";
import { getCategoryNav } from "@/lib/catalogue";
import { config } from "@/lib/config";
import { absoluteUrl } from "@/lib/utils";

const EXO_CLIENT_HINTS =
  "Sec-CH-UA https://s.magsrv.com; Sec-CH-UA-Mobile https://s.magsrv.com; Sec-CH-UA-Arch https://s.magsrv.com; Sec-CH-UA-Model https://s.magsrv.com; Sec-CH-UA-Platform https://s.magsrv.com; Sec-CH-UA-Platform-Version https://s.magsrv.com; Sec-CH-UA-Bitness https://s.magsrv.com; Sec-CH-UA-Full-Version-List https://s.magsrv.com; Sec-CH-UA-Full-Version https://s.magsrv.com;";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  metadataBase: new URL(config.appUrl),
  title: {
    default: `${config.appName} — Video Link Directory`,
    template: `%s · ${config.appName}`,
  },
  description:
    "Browse a catalogue of video links with thumbnails, duration, views and categories. Click through to authorized external destinations. We do not host video files.",
  openGraph: {
    type: "website",
    siteName: config.appName,
    title: `${config.appName} — Video Link Directory`,
    description:
      "Discover video listings and open authorized external HTTPS destinations.",
    url: absoluteUrl("/"),
  },
  robots: { index: true, follow: true },
  alternates: { canonical: absoluteUrl("/") },
  other: {
    // Restricted To Adults — same label used industry-wide
    rating: "RTA-5042-1996-1400-1577-RTA",
    "6a97888e-site-verification": "bc6183140cb3c4fc25d36049a7908713",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let categories: { name: string; slug: string }[] = [];
  try {
    categories = await getCategoryNav();
  } catch {
    categories = [];
  }

  return (
    <html lang="en">
      <head>
        <meta httpEquiv="Delegate-CH" content={EXO_CLIENT_HINTS} />
      </head>
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <AgeGate appName={config.appName} />
        <Suspense fallback={<div className="h-14 border-b border-zinc-800" />}>
          <NavigationPendingProvider>
            <Header categories={categories} />
            <NavigationBusyOverlay>
              <main className="mx-auto min-h-[70vh] max-w-[1400px] px-4 py-6 lg:px-6">
                {children}
              </main>
              <Footer appName={config.appName} />
            </NavigationBusyOverlay>
          </NavigationPendingProvider>
        </Suspense>
        <Script
          src="https://a.magsrv.com/ad-provider.js"
          strategy="afterInteractive"
        />
        <Analytics />
      </body>
    </html>
  );
}
