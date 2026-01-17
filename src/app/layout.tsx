import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { PropAccountProvider } from "@/components/prop-account-provider";
import { GalaxyBackground } from "@/components/ui/galaxy-background";
import { TopNav } from "@/components/layout/top-nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TradeLog - Professional Trading Journal",
  description: "Track, analyze, and improve your trading performance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider defaultTheme="dark" storageKey="trading-journal-theme">
          <AuthProvider>
            <PropAccountProvider>
              <GalaxyBackground />
              <TopNav />
              <main className="relative z-10 pt-[80px] min-h-screen">
                {children}
              </main>
            </PropAccountProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

