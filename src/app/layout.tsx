import type { Metadata } from "next";
import { Space_Grotesk, Manrope } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import {
  NavigationBusyOverlay,
  NavigationPendingProvider,
} from "@/components/layout/navigation-pending";
import { getCategoryNav } from "@/lib/catalogue";
import { config } from "@/lib/config";
import { absoluteUrl } from "@/lib/utils";

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
      <body className={`${display.variable} ${body.variable} antialiased`}>
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
      </body>
    </html>
  );
}
