import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NALAR AI — Asisten Cerdas & Analitis",
  description: "Platform Kecerdasan Buatan Generasi Baru oleh NALAR",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
