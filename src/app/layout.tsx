import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Matatag Math Quest — Grading Game",
  description: "A gamified student grading system for the Matatag K-12 Math curriculum.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 text-slate-50 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
