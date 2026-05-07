import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SnapTrip",
  description: "MVP rekomendasi perjalanan berbasis foto referensi"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
