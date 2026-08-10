"use client";

import { useEffect, useState } from "react";
import KgmAvatar, { avatarFromUploads, isKgmAvatarUpload, type KgmAvatarUpload, type KgmProfile } from "./KgmAvatar";
import { PwaInstallButton } from "./PwaInstall";

type Account = { id: string; email: string; nickname: string; role: "Child" | "Teen" | "Adult"; created_at?: string };

const API = (process.env.NEXT_PUBLIC_KGM_CHAT_API || "https://mana-koratlagudem.onrender.com").replace(/\/$/, "");
const TOKEN_KEY = "kgm-village-chat-token-v2";
const THEME_KEY = "kgm-youth-theme-v1";
const LANG_KEY = "kgm-language-v2";

export default function YouthTopHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [account, setAccount] = useState<KgmProfile | null>(null);
  const [dark, setDark] = useState(true);
  const [chatUnread, setChatUnread] = useState(0);
  const [lang, setLang] = useState<"en" | "te">("en");

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    const nextDark = saved !== "light";
    setDark(nextDark);
    document.documentElement.classList.toggle("kgm-youth-dark", nextDark);
    setLang(localStorage.getItem(LANG_KEY) === "te" ? "te" : "en");

    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/api/kgm-chat/auth/me`, { headers }).then((response) => response.ok ? response.json() : Promise.reject()),
      fetch(`${API}/api/kgm-uploads/mine`, { headers }).then((response) => response.ok ? response.json() : Promise.reject()),
    ])
      .then(([me, uploads]: [Account, { items?: KgmAvatarUpload[] }]) => {
        const avatars = (uploads.items || []).filter((item) => isKgmAvatarUpload(item) && item.kind === "image");
        setAccount({ ...me, avatar: avatarFromUploads(avatars) });
      })
      .catch(() => setAccount(null));
  }, []);

  useEffect(() => {
    const handleUnread = (event: Event) => {
      const count = (event as CustomEvent<{ count?: number }>).detail?.count || 0;
      setChatUnread(Math.max(0, count));
    };
    const handleProfile = (event: Event) => {
      const next = (event as CustomEvent<KgmProfile>).detail;
      if (next?.id) setAccount(next);
    };
    const handleLanguage = (event: Event) => {
      const next = (event as CustomEvent<{ lang?: "en" | "te" }>).detail?.lang;
      if (next) setLang(next);
    };
    window.addEventListener("kgm-chat-unread", handleUnread as EventListener);
    window.addEventListener("kgm-profile-updated", handleProfile as EventListener);
    window.addEventListener("kgm-language-changed", handleLanguage as EventListener);
    return () => {
      window.removeEventListener("kgm-chat-unread", handleUnread as EventListener);
      window.removeEventListener("kgm-profile-updated", handleProfile as EventListener);
      window.removeEventListener("kgm-language-changed", handleLanguage as EventListener);
    };
  }, []);

  function closeMenu() { setMenuOpen(false); }
  function jump(selector: string) { closeMenu(); document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  function clickExisting(selector: string) { closeMenu(); (document.querySelector(selector) as HTMLElement | null)?.click(); }
  function openCinema() { closeMenu(); window.dispatchEvent(new Event("kgm-open-cinema")); }
  function openAccount() { closeMenu(); if (account) window.dispatchEvent(new Event("kgm-open-profile")); else clickExisting(".kgm-account-nav-link"); }
  function toggleLanguage() { closeMenu(); window.dispatchEvent(new Event("kgm-toggle-language")); }

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("kgm-youth-dark", next);
    localStorage.setItem(THEME_KEY, next ? "dark" : "light");
  }

  const unreadLabel = chatUnread > 99 ? "99+" : chatUnread;
  const labels = lang === "te" ? {
    discover: "అన్వేషించండి", apps: "యాప్స్", music: "సంగీతం", cinema: "సినిమా", gallery: "గ్యాలరీ", chat: "చాట్",
    install: "ఆండ్రాయిడ్ ఇన్‌స్టాల్", safety: "భద్రత", creators: "యువ సృష్టికర్తలు", language: "English", profile: account ? `${account.nickname} ప్రొఫైల్` : "సైన్ ఇన్ / నమోదు",
  } : {
    discover: "Discover", apps: "Apps", music: "Music", cinema: "Cinema", gallery: "Gallery", chat: "Chat",
    install: "Install Android", safety: "Safety", creators: "Young creators", language: "తెలుగు", profile: account ? `Edit ${account.nickname}` : "Sign in / Register",
  };

  return (
    <header className="kgm-youth-header" aria-label="KGM Youthverse navigation">
      <div className="kgm-youth-header-inner">
        <button className="kgm-youth-brand" type="button" onClick={() => { closeMenu(); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label="KGM Youthverse home">
          <span className="kgm-youth-brand-mark">K</span>
          <span className="kgm-youth-brand-copy"><strong>KGM</strong><small>YOUTHVERSE</small></span>
          <span className="kgm-youth-brand-live"><i /> LIVE</span>
        </button>

        <nav className="kgm-youth-nav" aria-label="Primary navigation">
          <button type="button" onClick={() => jump(".yv-trending")}>{labels.discover}</button>
          <button type="button" onClick={() => jump("#apps")}>{labels.apps}</button>
          <button type="button" onClick={() => jump("#music")}>{labels.music}</button>
          <button className="kgm-youth-cinema-link" type="button" onClick={openCinema}>{labels.cinema}</button>
          <button type="button" onClick={() => clickExisting(".kgm-gallery-nav-link")}>{labels.gallery}</button>
          <button className={`kgm-youth-chat-link${chatUnread ? " has-unread" : ""}`} type="button" onClick={() => clickExisting(".kgm-chat-nav-link")}>{labels.chat}{chatUnread > 0 && <b className="kgm-youth-chat-badge">{unreadLabel}</b>}</button>
        </nav>

        <div className="kgm-youth-header-actions">
          <div className="kgm-youth-install"><PwaInstallButton /></div>
          <button className="kgm-youth-language" type="button" onClick={toggleLanguage}>{labels.language}</button>
          <button className="kgm-youth-theme-button" type="button" onClick={toggleTheme} aria-label="Toggle light or dark appearance">{dark ? "☀" : "☾"}</button>
          <button className="kgm-youth-account" type="button" onClick={openAccount} title={account ? `Edit ${account.nickname}'s profile` : "Sign in or create account"}>
            {account ? <KgmAvatar value={account.avatar} nickname={account.nickname} size="xs" className="kgm-header-avatar" /> : <span>☺</span>}
            <strong>{account?.nickname || (lang === "te" ? "సైన్ ఇన్" : "Sign in")}</strong>
          </button>
          <button className={`kgm-youth-menu${menuOpen ? " open" : ""}`} type="button" onClick={() => setMenuOpen((value) => !value)} aria-label="Open KGM menu" aria-expanded={menuOpen}>
            <i /><i /><i />
          </button>
        </div>
      </div>

      <div className={`kgm-youth-mobile-menu${menuOpen ? " open" : ""}`}>
        <button type="button" onClick={() => jump(".yv-trending")}><span>◉</span>{labels.discover}</button>
        <button type="button" onClick={() => jump("#apps")}><span>▦</span>{labels.apps}</button>
        <button type="button" onClick={() => jump("#music")}><span>♪</span>{labels.music}</button>
        <button type="button" onClick={openCinema}><span>🎬</span>{lang === "te" ? "సైన్స్ సినిమా" : "Science Cinema"}</button>
        <button type="button" onClick={() => clickExisting(".kgm-gallery-nav-link")}><span>✦</span>{labels.gallery}</button>
        <button className="kgm-youth-mobile-chat" type="button" onClick={() => clickExisting(".kgm-chat-nav-link")}><span>◌</span>{lang === "te" ? "గ్రామ చాట్" : "Village Chat"}{chatUnread > 0 && <b className="kgm-youth-chat-badge">{unreadLabel}</b>}</button>
        <button type="button" onClick={() => jump("#install")}><span>↓</span>{labels.install}</button>
        <button type="button" onClick={() => jump("#safety")}><span>✓</span>{labels.safety}</button>
        <button type="button" onClick={() => jump("#build")}><span>＋</span>{labels.creators}</button>
        <button type="button" onClick={toggleLanguage}><span>అ</span>{labels.language}</button>
        <button type="button" onClick={openAccount}><span>☺</span>{labels.profile}</button>
      </div>
    </header>
  );
}
