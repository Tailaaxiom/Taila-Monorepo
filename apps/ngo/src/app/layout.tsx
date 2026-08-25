// apps/ngo/src/app/layout.tsx
//
// Root layout: html/body/fonts only. No AppShell, no auth check, no
// provider — those now live in (app)/layout.tsx, since (auth)/sign-in and
// (auth)/activate must render without either. See
// lib/auth/RealCurrentUserProvider.tsx.

import type { Metadata } from "next";
import "./globals.css";
import { DM_Sans, Cormorant_Garamond, Bebas_Neue } from 'next/font/google';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sans',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400'],
  style: ['normal', 'italic'],
  variable: '--font-display',
});

const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-wordmark',
});

export const metadata: Metadata = {
  title: "Taila Axiom — NGO",
  description: "Operating system for organizations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${cormorant.variable} ${bebasNeue.variable}`}
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}