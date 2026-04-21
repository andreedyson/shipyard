import { Toaster } from "@/components/ui/sonner";
import QueryProvider from "@/providers/query-provider";
import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = DM_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Shipyard",
  description: "Private Shipyard deployment dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${display.variable} ${mono.variable} antialiased`}>
        <QueryProvider>{children}</QueryProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
