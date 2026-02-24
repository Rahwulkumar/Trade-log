import type { Metadata } from "next";
import { Syne, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { PropAccountProvider } from "@/components/prop-account-provider";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Syne — geometric display font, for headings and the logo wordmark
 */
const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

/**
 * Inter — the cleanest, most neutral UI font in the industry
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/**
 * JetBrains Mono — for trade numbers, prices, PnL values
 */
const jbMono = JetBrains_Mono({
  variable: "--font-jb-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CONIYEST — Professional Trading Journal",
  description:
    "Track, analyze, and improve your trading performance with deep analytics and a professional-grade journal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Anti-FOUC: apply dark class before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark');})()`,
          }}
        />
      </head>
      <body
        className={`${syne.variable} ${inter.variable} ${jbMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider defaultTheme="system" storageKey="theme">
          <AuthProvider>
            <PropAccountProvider>
              <AppShell>{children}</AppShell>
            </PropAccountProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
