import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./dark.css";
import "material-symbols/rounded.css";
import { PwaRegister } from "./pwa-register";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: "PyClasse — Impara Python, insieme",
  description:
    "Classi, esercizi Python, correzione automatica e progressi in un solo spazio.",
  applicationName: "PyClasse",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PyClasse",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/pwa-icon-192.png", sizes: "192x192" }],
  },
  openGraph: {
    title: "PyClasse — Impara Python, insieme",
    description: "Esercizi, grading automatico e progressi per la tua classe.",
    images: [
      {
        url: "/og-dracula.png",
        width: 1200,
        height: 630,
        alt: "PyClasse — Impara Python, insieme",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/og-dracula.png"] },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body className={`${geist.variable} ${mono.variable}`}>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
