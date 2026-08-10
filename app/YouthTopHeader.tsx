"use client";

import { useEffect, useState } from "react";
import { PwaInstallButton } from "./PwaInstall";

type Account = { id: string; nickname: string; role: string };

const API = (process.env.NEXT_PUBLIC_KGM_CHAT_API || "https://mana-koratlagudem.onrender.com").replace(/\/$/, "");
const TOKEN_KEY = "kgm-village-chat-token-v2";
const THEME_KEY = "kgm-youth-theme-v1";

export default function YouthTopHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [dark, setDark] = useState(true);
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    const nextDark = saved !== "light";
    setDark(nextDark);
    document.documentElement.classList.toggle("kgm-youth-dark", nextDark);

    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token) return;
    fetch(`${API}/api/kgm-chat/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((me: Account) => setAccount(me))
      .catch(() => setAccount(null));
  }, []);

  useEffect(() => {
    const handleUnread = (event: Event) => {
      const count = (event as CustomEvent<{ count?: number }>).detail?.count || 0;
      setChatUnread(Math.max(0, count));
    };
    window.addEventListener("kgm-chat-unread", handleUnread as EventListener);
    return () => window.removeEventListener("kgm-chat-unread", handleUnread as EventListener);
  }, []);

  function closeMenu() { setMenuOpen(false); }

  function jump(selector: string) {
    closeMenu();
    document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clickExisting(selector: string) {
    closeMenu();
    (document.querySelector(selector) as HTMLElement | null)?.click();
  }

  function openCinema() {
    closeMenu();
    window.dispatchEvent(new Event("kgm-open-cinema"));
  }

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("kgm-youth-dark", next);
    localStorage.setItem(THEME_KEY, next ? "dark" : "light");
  }

  const unreadLabel = chatUnread > 99 ? "99+" : chatUnread;

  return (
    <header className="kgm-youth-header" aria-label="KGM Youthverse navigation">
      <div className="kgm-youth-header-inner">
        <button className="kgm-youth-brand" type="button" onClick={() => { closeMenu(); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label="KGM Youthverse home">
          <span className="kgm-youth-brand-mark">K</span>
          <span className="kgm-youth-brand-copy"><strong>KGM</strong><small>YOUTHVERSE</small></span>
          <span className="kgm-youth-brand-live"><i /> LIVE</span>
        </button>

        <nav className="kgm-youth-nav" aria-label="Primary navigation">
          <button type="button" onClick={() => jump(".yv-trending")}>Discover</button>
          <button type="button" onClick={() => jump("#apps")}>Apps</button>
          <button type="button" onClick={() => jump("#music")}>Music</button>
          <button className="kgm-youth-cinema-link" type="button" onClick={openCinema}>Cinema</button>
          <button type="button" onClick={() => clickExisting(".kgm-gallery-nav-link")}>Gallery</button>
          <button className={`kgm-youth-chat-link${chatUnread ? " has-unread" : ""}`} type="button" onClick={() => clickExisting(".kgm-chat-nav-link")}>Chat{chatUnread > 0 && <b className="kgm-youth-chat-badge">{unreadLabel}</b>}</button>
        </nav>

        <div className="kgm-youth-header-actions">
          <div className="kgm-youth-install"><PwaInstallButton /></div>
          <button className="kgm-youth-language" type="button" onClick={() => clickExisting(".language-button")}>తెలుగు</button>
          <button className="kgm-youth-theme-button" type="button" onClick={toggleTheme} aria-label="Toggle light or dark appearance">{dark ? "☀" : "☾"}</button>
          <button className="kgm-youth-account" type="button" onClick={() => clickExisting(".kgm-account-nav-link")} title={account?.nickname || "Sign in or create account"}>
            <span>{account ? account.nickname.slice(0, 1).toUpperCase() : "☺"}</span>
            <strong>{account?.nickname || "Sign in"}</strong>
          </button>
          <button className={`kgm-youth-menu${menuOpen ? " open" : ""}`} type="button" onClick={() => setMenuOpen((value) => !value)} aria-label="Open KGM menu" aria-expanded={menuOpen}>
            <i /><i /><i />
          </button>
        </div>
      </div>

      <div className={`kgm-youth-mobile-menu${menuOpen ? " open" : ""}`}>
        <button type="button" onClick={() => jump(".yv-trending")}><span>◉</span>Discover</button>
        <button type="button" onClick={() => jump("#apps")}><span>▦</span>Apps</button>
        <button type="button" onClick={() => jump("#music")}><span>♪</span>Music</button>
        <button type="button" onClick={openCinema}><span>🎬</span>Science Cinema</button>
        <button type="button" onClick={() => clickExisting(".kgm-gallery-nav-link")}><span>✦</span>Gallery</button>
        <button className="kgm-youth-mobile-chat" type="button" onClick={() => clickExisting(".kgm-chat-nav-link")}><span>◌</span>Village Chat{chatUnread > 0 && <b className="kgm-youth-chat-badge">{unreadLabel}</b>}</button>
        <button type="button" onClick={() => jump("#install")}><span>↓</span>Install Android</button>
        <button type="button" onClick={() => jump("#safety")}><span>✓</span>Safety</button>
        <button type="button" onClick={() => jump("#build")}><span>＋</span>Young creators</button>
        <button type="button" onClick={() => clickExisting(".kgm-account-nav-link")}><span>☺</span>{account?.nickname || "Sign in / Register"}</button>
      </div>
    </header>
  );
}
