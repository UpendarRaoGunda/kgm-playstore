import type { Metadata, Viewport } from "next";
import YouthTopHeader from "./YouthTopHeader";
import KgmLanguageBridge from "./KgmLanguageBridge";
import ClientFeatures from "./ClientFeatures";
import KgmCredits from "./KgmCredits";

import "./music.css";
import "./music-library-manager.css";
import "./community-gallery.css";
import "./community-gallery-edit.css";
import "./community-shelf.css";
import "./gallery-media-fit-final.css";
import "./village-chat.css";
import "./village-chat-genz.css";
import "./chat-notifications.css";
import "./kgm-video-chat.css";
import "./science-cinema.css";
import "./science-cinema-drive.css";
import "./cinema-legal-movies.css";
import "./profile-avatar.css";
import "./profile-cinema.css";
import "./profile-logout.css";
import "./pwa-install.css";
import "./telugu-typography.css";
import "./kgm-ai-v3.css";
import "./kgm-shell.css";
import "./kgm-credits-v3.css";

export const metadata: Metadata = {
  title: "KGM Youthverse · Koratlagudem",
  description: "A free digital space where village children and youth learn, build, create and connect — made in Koratlagudem and open to the world.",
  applicationName: "KGM Youthverse",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "KGM Youthverse" },
  other: { "mobile-web-app-capable": "yes" },
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

export const viewport: Viewport = { colorScheme: "dark light", themeColor: "#09090d", viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className="kgm-youth-dark">
      <body>
        <a className="kgm-skip-link" href="#kgm-live-drops">Skip to what&apos;s happening</a>
        <KgmLanguageBridge />
        <YouthTopHeader />
        {children}
        <KgmCredits />
        <ClientFeatures />
      </body>
    </html>
  );
}
