import type { Metadata, Viewport } from "next";
import MusicLibraryManager from "./MusicLibraryManager";
import CommunityGallery from "./CommunityGallery";
import CommunityShelf from "./CommunityShelf";
import VillageChat from "./VillageChat";
import KgmCredits from "./KgmCredits";
import FreeKnowledgeMission from "./FreeKnowledgeMission";
import PwaManager from "./PwaInstall";
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
import "./pwa-install.css";

export const metadata: Metadata = {
  title: "KGM · Koratlagudem Community Hub",
  description: "A free-for-everyone community hub for apps, music, gallery and Village Chat created and shared by Koratlagudem.",
  applicationName: "KGM APK Hub",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KGM APK Hub",
  },
  other: {
    "codex-preview": "development",
    "mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.svg",
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  manifest: "/site-manifest.json",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#7657ed",
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
        <PwaManager />
      </body>
    </html>
  );
}
