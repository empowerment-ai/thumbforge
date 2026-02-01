import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ThumbForge — AI YouTube Thumbnail Generator",
  description:
    "Generate click-worthy YouTube thumbnails in seconds with AI. Paste a URL, get professional thumbnails. No design skills needed.",
  keywords: [
    "YouTube thumbnail",
    "AI thumbnail generator",
    "thumbnail maker",
    "click-through rate",
    "YouTube SEO",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
