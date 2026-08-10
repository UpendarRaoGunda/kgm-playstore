import type { Metadata } from "next";
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
import "./design-system.css";

export const metadata: Metadata = {
  title: "KGM · Koratlagudem Community Hub",
  description: "Apps, music, gallery and Village Chat created and shared by the Koratlagudem community.",
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
      <body>
        <a className="kgm-skip-link" href="#apps">Skip to community apps</a>
        {children}
        <KgmCredits />
        <MusicLibraryManager />
        <CommunityGallery />
        <VillageChat />
      </body>
    </html>
  );
}
