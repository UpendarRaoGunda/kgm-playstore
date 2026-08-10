import type { Metadata } from "next";
import MusicLibraryManager from "./MusicLibraryManager";
import CommunityGallery from "./CommunityGallery";
import CommunityShelf from "./CommunityShelf";
import VillageChat from "./VillageChat";
import KgmCredits from "./KgmCredits";
import FreeKnowledgeMission from "./FreeKnowledgeMission";
import YouthverseExperience from "./YouthverseExperience";
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
import "./youthverse.css";

export const metadata: Metadata = {
  title: "KGM · Koratlagudem Youthverse",
  description: "Koratlagudem's digital playground for community apps, music, photos, videos, creators and Village Chat — free for everyone.",
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
        <YouthverseExperience />
        <CommunityShelf />
        <KgmCredits />
        <MusicLibraryManager />
        <CommunityGallery />
        <VillageChat />
      </body>
    </html>
  );
}
