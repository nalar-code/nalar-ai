import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NALAR — Enterprise AI Workspace",
  description: "Workspace Kecerdasan Buatan & Analitik Data oleh NALAR",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
