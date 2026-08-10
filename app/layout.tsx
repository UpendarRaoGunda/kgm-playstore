import type { Metadata } from "next";
import MusicLibraryManager from "./MusicLibraryManager";
import CommunityGallery from "./CommunityGallery";
import CommunityShelf from "./CommunityShelf";
import VillageChat from "./VillageChat";
import KgmCredits from "./KgmCredits";
import FreeKnowledgeMission from "./FreeKnowledgeMission";
import "./globals.css";
import "./music.css";
import "./music-library-manager.css";
import "./community-gallery.css";
import "./community-shelf.css";
import "./village-chat.css";
import "./mobile-fixes.css";
import "./design-system.css";
import "./ux-polish.css";
import "./telugu-typography.css";
import "./free-knowledge-mission.css";

export const metadata: Metadata = {
  title: "KGM · Koratlagudem Community Hub",
  description: "A free-for-everyone community hub for apps, music, gallery and Village Chat created and shared by Koratlagudem.",
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
        <a className="kgm-skip-link" href="#apps">Skip to community shelf</a>
        <FreeKnowledgeMission />
        {children}
        <CommunityShelf />
        <KgmCredits />
        <MusicLibraryManager />
        <CommunityGallery />
        <VillageChat />
      </body>
    </html>
  );
}
