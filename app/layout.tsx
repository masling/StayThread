import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StayThread",
  description: "AI-guided long-term action training and goal companion.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
