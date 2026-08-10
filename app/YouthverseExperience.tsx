"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

type UploadKind = "image" | "audio" | "video" | "apk";
type UploadItem = {
  id: string;
  title: string;
  description?: string;
  kind: UploadKind;
  created_at: string;
  uploader: { id: string; nickname: string; role: string };
  file_url: string;
  download_url: string;
};
type Account = { id: string; nickname: string; role: string };

const API = (process.env.NEXT_PUBLIC_KGM_CHAT_API || "https://mana-koratlagudem.onrender.com").replace(/\/$/, "");
const TOKEN_KEY = "kgm-village-chat-token-v2";
const THEME_KEY = "kgm-youth-theme-v1";

const creators = [
  { name: "Devarakonda Chinna", label: "Co-Founder", glyph: "DC", vibe: "Community builder" },
  { name: "Gunda Sandeep", label: "Co-Founder", glyph: "GS", vibe: "Creator energy" },
  { name: "Marthi Jashwanth", label: "Co-Founder", glyph: "MJ", vibe: "Young maker" },
];

const fallbackDrops = [
  { kind: "apk" as UploadKind, title: "Mana Ooru Quiz", kicker: "APP DROP", glyph: "ఊ", meta: "Built in Koratlagudem" },
  { kind: "audio" as UploadKind, title: "KGM Folk Radio", kicker: "NOW PLAYING", glyph: "♪", meta: "Village sounds" },
  { kind: "video" as UploadKind, title: "Village Moments", kicker: "VIDEO", glyph: "▶", meta: "Made by the community" },
  { kind: "image" as UploadKind, title: "KGM Gallery", kicker: "PHOTO DROP", glyph: "✦", meta: "Photos from our people" },
];

function kindGlyph(kind: UploadKind) {
  if (kind === "audio") return "♪";
  if (kind === "video") return "▶";
  if (kind === "apk") return "APK";
  return "✦";
}

export default function YouthverseExperience() {
  const [portalHost, setPortalHost] = useState<Element | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const hero = document.querySelector(".hero");
    if (!hero || document.querySelector("#kgm-youthverse-root")) return;
    const host = document.createElement("div");
    host.id = "kgm-youthverse-root";
    hero.parentElement?.insertBefore(host, hero);
    setPortalHost(host);
    return () => host.remove();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    const nextDark = saved !== "light";
    setDark(nextDark);
    document.documentElement.classList.toggle("kgm-youth-dark", nextDark);
  }, []);

  useEffect(() => {
    fetch(`${API}/api/kgm-uploads?kind=all&limit=8`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { items?: UploadItem[] }) => setUploads(data.items || []))
      .catch(() => setUploads([]));

    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token) return;
    fetch(`${API}/api/kgm-chat/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((me: Account) => setAccount(me))
      .catch(() => setAccount(null));
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("kgm-youth-dark", next);
    localStorage.setItem(THEME_KEY, next ? "dark" : "light");
  }

  function clickExisting(selector: string) {
    (document.querySelector(selector) as HTMLElement | null)?.click();
  }

  function openCinema() {
    window.dispatchEvent(new Event("kgm-open-cinema"));
  }

  function openUpload() {
    clickExisting(".kgm-gallery-nav-link");
    window.setTimeout(() => clickExisting(".kgm-gallery-upload-button"), 80);
  }

  function jump(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const latest = useMemo(() => uploads.slice(0, 6), [uploads]);

  const experience = (
    <>
      <section className="yv-shell" aria-label="KGM Youthverse">
        <div className="yv-noise" aria-hidden="true" />
        <div className="yv-topline">
          <span className="yv-live"><i /> KORATLAGUDEM IS CREATING</span>
          <button type="button" className="yv-theme" onClick={toggleTheme} aria-label="Toggle theme">{dark ? "☀" : "☾"}</button>
        </div>

        <div className="yv-hero-grid">
          <div className="yv-hero-copy">
            <span className="yv-kicker">KGM° · KORATLAGUDEM'S DIGITAL PLAYGROUND</span>
            <h1>MADE HERE.<br/><em>SHARED EVERYWHERE.</em></h1>
            <p>{account ? `Yo ${account.nickname} 👋 what are we creating or learning today?` : "Apps, science cinema, music, photos, videos and ideas from a village that refuses to think small."}</p>
            <div className="yv-actions">
              <button type="button" className="yv-primary" onClick={openCinema}>Watch Science Cinema <span>▶</span></button>
              <button type="button" className="yv-secondary" onClick={openUpload}>＋ Drop something</button>
            </div>
            <div className="yv-pills">
              <button onClick={() => jump("apps")}>🎮 Apps</button>
              <button onClick={openCinema}>🎬 Science Cinema</button>
              <button onClick={() => jump("music")}>🎧 Music</button>
              <button onClick={() => clickExisting(".kgm-gallery-nav-link")}>✦ Gallery</button>
              <button onClick={() => clickExisting(".kgm-chat-nav-link")}>💬 Chat</button>
            </div>
          </div>

          <div className="yv-stage" aria-label="KGM live activity preview">
            <div className="yv-glow yv-glow-one" />
            <div className="yv-glow yv-glow-two" />
            <article className="yv-float yv-float-a"><span>APK</span><strong>Mana Ooru Quiz</strong><small>fresh from the lab</small></article>
            <article className="yv-float yv-float-b"><span>🎬</span><strong>Science Cinema</strong><small>STEM films · free</small></article>
            <article className="yv-float yv-float-c"><span>✦</span><strong>Gallery Drop</strong><small>photos · videos</small></article>
            <div className="yv-center-orb"><span>KGM</span><small>YOUTHVERSE</small></div>
          </div>
        </div>

        <div className="yv-marquee" aria-hidden="true"><span>CREATE ✦ WATCH ✦ QUESTION ✦ SHARE ✦ PLAY ✦ BUILD ✦ నేర్చుకో ✦ CREATE ✦ WATCH ✦ QUESTION ✦</span></div>

        <section className="yv-section yv-trending">
          <div className="yv-section-head"><div><span>🔥 TRENDING IN KGM</span><h2>Fresh drops from the village.</h2></div><button onClick={() => clickExisting(".kgm-gallery-nav-link")}>See all ↗</button></div>
          <div className="yv-drop-row">
            {latest.length ? latest.map((item, index) => (
              <button className={`yv-drop yv-kind-${item.kind}`} key={item.id} onClick={() => clickExisting(".kgm-gallery-nav-link")} style={{"--yv-i": index} as CSSProperties}>
                <span className="yv-drop-glyph">{kindGlyph(item.kind)}</span>
                <small>{item.kind === "audio" ? "MUSIC DROP" : item.kind === "apk" ? "COMMUNITY APK" : `${item.kind.toUpperCase()} DROP`}</small>
                <strong>{item.title}</strong>
                <em>by {item.uploader.nickname}</em>
              </button>
            )) : fallbackDrops.map((item, index) => (
              <button className={`yv-drop yv-kind-${item.kind}`} key={item.title} onClick={() => item.kind === "audio" ? jump("music") : item.kind === "apk" ? jump("apps") : clickExisting(".kgm-gallery-nav-link")} style={{"--yv-i": index} as CSSProperties}>
                <span className="yv-drop-glyph">{item.glyph}</span><small>{item.kicker}</small><strong>{item.title}</strong><em>{item.meta}</em>
              </button>
            ))}
          </div>
        </section>

        <section className="yv-section yv-for-you">
          <div className="yv-section-head"><div><span>FOR YOU</span><h2>One feed. Every kind of creativity and curiosity.</h2></div><span className="yv-safety">🛡 Community moderated</span></div>
          <div className="yv-feed-grid">
            <button className="yv-feed-card yv-feed-cinema" onClick={openCinema}><span>STEM ONLY · FREE</span><strong>KGM Science Cinema</strong><p>Space, physics, biology, Earth, engineering and more—watch inside KGM.</p><b>START WATCHING ▶</b></button>
            <button className="yv-feed-card yv-feed-big" onClick={() => clickExisting(".kgm-gallery-nav-link")}><span>PHOTO + VIDEO</span><strong>Village moments deserve a feed, not a folder.</strong><p>See the newest visual drops from KGM creators.</p><b>OPEN GALLERY ↗</b></button>
            <button className="yv-feed-card yv-feed-music" onClick={() => jump("music")}><span>NOW PLAYING</span><strong>KGM Folk Radio</strong><p>Keep listening while you explore.</p><b>PLAY MUSIC ♪</b></button>
            <button className="yv-feed-card yv-feed-apps" onClick={() => jump("apps")}><span>BUILT HERE</span><strong>Apps by young makers</strong><p>From ideas to APKs.</p><b>EXPLORE APPS ↗</b></button>
            <button className="yv-feed-card yv-feed-chat" onClick={() => clickExisting(".kgm-chat-nav-link")}><span>LIVE COMMUNITY</span><strong>Village Chat</strong><p>Share ideas without sharing private contact details.</p><b>JOIN CHAT 💬</b></button>
          </div>
        </section>

        <section className="yv-section yv-creators">
          <div className="yv-section-head"><div><span>CREATORS OF KGM</span><h2>People are the platform.</h2></div><span className="yv-founder-note">FOUNDING CREW</span></div>
          <div className="yv-creator-grid">
            {creators.map((creator, index) => <article className="yv-creator" key={creator.name} style={{"--yv-i": index} as CSSProperties}><div className="yv-avatar">{creator.glyph}</div><div><small>{creator.label}</small><strong>{creator.name}</strong><span>{creator.vibe}</span></div><b>FOUNDING MEMBER</b></article>)}
            <button className="yv-creator yv-creator-join" onClick={() => clickExisting(".kgm-account-nav-link")}><div className="yv-avatar">＋</div><div><small>YOUR TURN</small><strong>Join the creator wall</strong><span>Sign in · upload · build</span></div><b>START ↗</b></button>
          </div>
        </section>
      </section>

      <nav className="yv-mobile-dock" aria-label="KGM mobile navigation">
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><span>⌂</span><small>Home</small></button>
        <button onClick={openCinema}><span>🎬</span><small>Cinema</small></button>
        <button className="yv-upload-dock" onClick={openUpload}><span>＋</span><small>Upload</small></button>
        <button onClick={() => clickExisting(".kgm-chat-nav-link")}><span>◌</span><small>Chat</small></button>
        <button onClick={() => clickExisting(".kgm-account-nav-link")}><span>☺</span><small>Me</small></button>
      </nav>
    </>
  );

  return portalHost ? createPortal(experience, portalHost) : null;
}
