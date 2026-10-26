import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NALAR — Asisten AI Cerdas",
  description: "Platform Kecerdasan Buatan Generasi Baru oleh NALAR",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="antialiased selection:bg-blue-500/30 selection:text-blue-200">{children}</body>
    </html>
  );
}
