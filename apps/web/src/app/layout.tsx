import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CSYFinproj - Yamaha Motorcycle Sales",
  description: "Motorcycle sales and finance management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
