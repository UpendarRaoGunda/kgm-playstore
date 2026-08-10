import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import MusicLibraryManager from "./MusicLibraryManager";
import CommunityGallery from "./CommunityGallery";
import VillageChat from "./VillageChat";
import KgmCredits from "./KgmCredits";
import "./globals.css";
import "./music.css";
import "./music-library-manager.css";
import "./community-gallery.css";
import "./village-chat.css";
import "./mobile-fixes.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Koratlagudem APK Hub",
  description: "Safe Android apps imagined and built by the young creators of Koratlagudem, Telangana.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <KgmCredits />
        <MusicLibraryManager />
        <CommunityGallery />
        <VillageChat />
      </body>
    </html>
  );
}
