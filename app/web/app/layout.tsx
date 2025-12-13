/**
 * Root Layout
 *
 * Application-wide layout wrapper with:
 *   - Custom Google Fonts (Staatliches, Dancing Script, Cinzel Decorative)
 *   - Firebase Authentication Provider
 *   - Global Music Player
 *   - Vercel Speed Insights
 */
import type { Metadata } from "next";
import { Staatliches, Dancing_Script, Cinzel_Decorative } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import MusicPlayer from "@/components/ui/MusicPlayer";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const staatliches = Staatliches({
  variable: "--font-staatliches",
  subsets: ["latin"],
  weight: ["400"],
});

const dancingScript = Dancing_Script({
  variable: "--font-dancing-script",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const cinzelDecorative = Cinzel_Decorative({
  variable: "--font-cinzel-decorative",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: "Services Doomsday | The AI Watcher",
  description: "AI-powered zombie code detection and cleanup platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Ancizar+Sans:ital,wght@0,100..1000;1,100..1000&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${staatliches.variable} ${dancingScript.variable} ${cinzelDecorative.variable} font-sans antialiased`}
      >
        <AuthProvider>
          {children}
          <MusicPlayer />
          <SpeedInsights />
        </AuthProvider>
      </body>
    </html>
  );
}
