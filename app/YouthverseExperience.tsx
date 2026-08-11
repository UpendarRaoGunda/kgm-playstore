"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { isKgmAvatarUpload } from "./KgmAvatar";

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

const communityRoles = [
  { label: "BUILD", glyph: "⌘", title: "Young makers", vibe: "Turn ideas into apps, games and tools." },
  { label: "CREATE", glyph: "✦", title: "Village creators", vibe: "Share photos, videos, music and stories." },
  { label: "EXPLORE", glyph: "◎", title: "Curious learners", vibe: "Watch, question, experiment and learn." },
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
    fetch(`${API}/api/kgm-uploads?kind=all&limit=12`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { items?: UploadItem[] }) => setUploads((data.items || []).filter((item) => !isKgmAvatarUpload(item)).slice(0, 8)))
      .catch(() => setUploads([]));

    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token) return;
    fetch(`${API}/api/kgm-chat/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((me: Account) => setAccount(me))
      .catch(() => setAccount(null));

    const handleProfile = (event: Event) => {
      const next = (event as CustomEvent<{ id?: string; nickname?: string; role?: string }>).detail;
      if (next?.id && next.nickname && next.role) setAccount({ id: next.id, nickname: next.nickname, role: next.role });
    };
    window.addEventListener("kgm-profile-updated", handleProfile as EventListener);
    return () => window.removeEventListener("kgm-profile-updated", handleProfile as EventListener);
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

  function openProfile() {
    if (localStorage.getItem(TOKEN_KEY)) window.dispatchEvent(new Event("kgm-open-profile"));
    else clickExisting(".kgm-account-nav-link");
  }

  function openUpload() {
    clickExisting(".kgm-gallery-nav-link");
    window.setTimeout(() => clickExisting(".kgm-gallery-upload-button"), 80);
  }

  function jump(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const latest = useMemo(() => uploads.slice(0, 3), [uploads]);

  const experience = (
    <>
      <section className="yv-shell yv-shell-simplified" aria-label="KGM Youthverse">
        <div className="yv-noise" aria-hidden="true" />
        <div className="yv-topline">
          <span className="yv-live"><i /> KORATLAGUDEM IS CREATING</span>
          <button type="button" className="yv-theme" onClick={toggleTheme} aria-label="Toggle theme">{dark ? "☀" : "☾"}</button>
        </div>

        <div className="yv-hero-grid yv-hero-grid-simple">
          <div className="yv-hero-copy">
            <span className="yv-kicker">KGM° · KORATLAGUDEM'S DIGITAL PLAYGROUND</span>
            <h1>MADE HERE.<br/><em>SHARED EVERYWHERE.</em></h1>
            <p>{account ? `Yo ${account.nickname} 👋 see what our village is creating today.` : "Apps, science, music and creations from Koratlagudem — made locally, open to everyone."}</p>
            <div className="yv-actions yv-actions-simple">
              <button type="button" className="yv-primary" onClick={() => jump("kgm-happening")}>Explore what&apos;s new <span>→</span></button>
            </div>
          </div>
        </div>

        <section className="yv-happening" id="kgm-happening" aria-label="Happening in KGM">
          <div className="yv-section-head yv-happening-head">
            <div><span>HAPPENING IN KGM</span><h2>See what the village is making.</h2></div>
            <small>Swipe to explore →</small>
          </div>
          <div className="yv-happening-row">
            {latest.map((item, index) => (
              <button key={item.id} className={`yv-happening-card yv-kind-${item.kind}`} onClick={() => clickExisting(".kgm-gallery-nav-link")} style={{"--yv-i": index} as CSSProperties}>
                <span className="yv-happening-icon">{kindGlyph(item.kind)}</span>
                <small>{item.kind === "apk" ? "NEW APP" : item.kind === "audio" ? "NEW MUSIC" : item.kind === "video" ? "NEW VIDEO" : "COMMUNITY DROP"}</small>
                <strong>{item.title}</strong>
                <p>by {item.uploader.nickname}</p>
                <b>Open →</b>
              </button>
            ))}
            <button className="yv-happening-card yv-happening-cinema" onClick={openCinema}>
              <span className="yv-happening-icon">🎬</span><small>SCIENCE CINEMA</small><strong>Films that make curiosity bigger.</strong><p>STEM films · free inside KGM</p><b>Watch →</b>
            </button>
            <button className="yv-happening-card yv-happening-community" onClick={() => clickExisting(".kgm-gallery-nav-link")}>
              <span className="yv-happening-icon">✦</span><small>COMMUNITY</small><strong>Photos, videos, music and village creations.</strong><p>Fresh from KGM creators</p><b>Explore →</b>
            </button>
          </div>
        </section>

        <div className="yv-marquee" aria-hidden="true"><span>CREATE ✦ WATCH ✦ QUESTION ✦ SHARE ✦ PLAY ✦ BUILD ✦ నేర్చుకో ✦ CREATE ✦ WATCH ✦ QUESTION ✦</span></div>

        <section className="yv-section yv-for-you">
          <div className="yv-section-head"><div><span>DISCOVER</span><h2>One place for every kind of curiosity.</h2></div><span className="yv-safety">🛡 Community moderated</span></div>
          <div className="yv-feed-grid">
            <button className="yv-feed-card yv-feed-cinema" onClick={openCinema}><span>STEM ONLY · FREE</span><strong>KGM Science Cinema</strong><p>Space, physics, biology, Earth, engineering and more—watch inside KGM.</p><b>START WATCHING ▶</b></button>
            <button className="yv-feed-card yv-feed-big" onClick={() => clickExisting(".kgm-gallery-nav-link")}><span>PHOTO + VIDEO</span><strong>Village moments deserve a feed, not a folder.</strong><p>See the newest visual drops from KGM creators.</p><b>OPEN GALLERY ↗</b></button>
            <button className="yv-feed-card yv-feed-music" onClick={() => jump("music")}><span>NOW PLAYING</span><strong>KGM Folk Radio</strong><p>Keep listening while you explore.</p><b>PLAY MUSIC ♪</b></button>
            <button className="yv-feed-card yv-feed-apps" onClick={() => jump("apps")}><span>BUILT HERE</span><strong>Apps by young makers</strong><p>From ideas to APKs.</p><b>EXPLORE APPS ↗</b></button>
            <button className="yv-feed-card yv-feed-chat" onClick={() => clickExisting(".kgm-chat-nav-link")}><span>LIVE COMMUNITY</span><strong>Village Chat</strong><p>Share ideas without sharing private contact details.</p><b>JOIN CHAT 💬</b></button>
          </div>
        </section>

        <section className="yv-section yv-creators">
          <div className="yv-section-head"><div><span>BUILT BY OUR VILLAGE</span><h2>Everyone can be part of the platform.</h2></div><span className="yv-founder-note">CREATE · LEARN · SHARE</span></div>
          <div className="yv-creator-grid">
            {communityRoles.map((role, index) => <article className="yv-creator" key={role.title} style={{"--yv-i": index} as CSSProperties}><div className="yv-avatar">{role.glyph}</div><div><small>{role.label}</small><strong>{role.title}</strong><span>{role.vibe}</span></div><b>OPEN TO ALL</b></article>)}
            <button className="yv-creator yv-creator-join" onClick={openProfile}><div className="yv-avatar">＋</div><div><small>YOUR TURN</small><strong>{account ? "Style your KGM profile" : "Join the creator wall"}</strong><span>{account ? "avatar · nickname · role" : "Sign in · upload · build"}</span></div><b>{account ? "EDIT ↗" : "START ↗"}</b></button>
          </div>
        </section>
      </section>

      <nav className="yv-mobile-dock" aria-label="KGM mobile navigation">
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><span>⌂</span><small>Home</small></button>
        <button onClick={openCinema}><span>🎬</span><small>Cinema</small></button>
        <button className="yv-upload-dock" onClick={openUpload}><span>＋</span><small>Upload</small></button>
        <button onClick={() => clickExisting(".kgm-chat-nav-link")}><span>◌</span><small>Chat</small></button>
        <button onClick={openProfile}><span>☺</span><small>Me</small></button>
      </nav>
    </>
  );

  return portalHost ? createPortal(experience, portalHost) : null;
}
