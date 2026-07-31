import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "PyClasse — Impara Python, insieme",
  description: "Classi, esercizi Python, correzione automatica e progressi in un solo spazio.",
  openGraph: {
    title: "PyClasse — Impara Python, insieme",
    description: "Esercizi, grading automatico e progressi per la tua classe.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "PyClasse — Impara Python, insieme" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="it"><body className={`${geist.variable} ${mono.variable}`}>{children}</body></html>;
}
