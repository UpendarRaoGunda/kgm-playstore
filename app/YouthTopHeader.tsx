"use client";

import { useEffect, useState } from "react";
import KgmAvatar, { avatarFromUploads, isKgmAvatarUpload, type KgmAvatarUpload, type KgmProfile } from "./KgmAvatar";
import { PwaInstallButton } from "./PwaInstall";

type Account = { id: string; email: string; nickname: string; role: "Child" | "Teen" | "Adult"; created_at?: string };
type Lang = "en" | "te";

const API = (process.env.NEXT_PUBLIC_KGM_CHAT_API || "").replace(/\/$/, "");
const TOKEN_KEY = "kgm-village-chat-token-v2";
const ACCOUNT_CACHE_KEY = "kgm-account-cache-v1";
const THEME_KEY = "kgm-youth-theme-v1";
const LANG_KEY = "kgm-language-v2";

function baseProfile(account: Account): KgmProfile {
  return { ...account, avatar: { type: "preset", preset: "orbit-pop", url: null } };
}

function readCachedAccount(): Account | null {
  try {
    const account = JSON.parse(localStorage.getItem(ACCOUNT_CACHE_KEY) || "null") as Account | null;
    return account?.id && account.nickname ? account : null;
  } catch { return null; }
}

export default function YouthTopHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [account, setAccount] = useState<KgmProfile | null>(null);
  const [hasSessionToken, setHasSessionToken] = useState(false);
  const [dark, setDark] = useState(true);
  const [lang, setLang] = useState<Lang>("en");
  const [chatUnread, setChatUnread] = useState(0);

  const telugu = lang === "te";
  const text = (en: string, te: string) => telugu ? te : en;

  async function syncAccount() {
    const token = localStorage.getItem(TOKEN_KEY) || "";
    setHasSessionToken(Boolean(token));
    if (!token) { setAccount(null); return; }
    const cached = readCachedAccount();
    if (cached) setAccount(baseProfile(cached));
    try {
      const response = await fetch(`${API}/api/kgm-chat/auth/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(ACCOUNT_CACHE_KEY);
          setHasSessionToken(false);
          setAccount(null);
        }
        return;
      }
      const me = await response.json() as Account;
      localStorage.setItem(ACCOUNT_CACHE_KEY, JSON.stringify(me));
      let profile = baseProfile(me);
      try {
        const uploadsResponse = await fetch(`${API}/api/kgm-uploads/mine`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (uploadsResponse.ok) {
          const uploads = await uploadsResponse.json() as { items?: KgmAvatarUpload[] };
          profile = { ...me, avatar: avatarFromUploads((uploads.items || []).filter((item) => isKgmAvatarUpload(item) && item.kind === "image")) };
        }
      } catch { /* avatar is optional */ }
      setAccount(profile);
    } catch { /* preserve cached login offline */ }
  }

  useEffect(() => {
    const savedDark = localStorage.getItem(THEME_KEY) !== "light";
    setDark(savedDark);
    document.documentElement.classList.toggle("kgm-youth-dark", savedDark);
    setLang(localStorage.getItem(LANG_KEY) === "te" ? "te" : "en");
    void syncAccount();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleLanguage = () => setLang(localStorage.getItem(LANG_KEY) === "te" ? "te" : "en");
    const handleUnread = (event: Event) => setChatUnread(Math.max(0, (event as CustomEvent<{ count?: number }>).detail?.count || 0));
    const handleProfile = (event: Event) => {
      const next = (event as CustomEvent<KgmProfile>).detail;
      if (!next?.id) return;
      setAccount(next);
      setHasSessionToken(true);
      localStorage.setItem(ACCOUNT_CACHE_KEY, JSON.stringify({ id: next.id, email: next.email, nickname: next.nickname, role: next.role, created_at: next.created_at }));
    };
    const handleAuth = () => void syncAccount();
    window.addEventListener("kgm-language-changed", handleLanguage as EventListener);
    window.addEventListener("kgm-chat-unread", handleUnread as EventListener);
    window.addEventListener("kgm-profile-updated", handleProfile as EventListener);
    window.addEventListener("kgm-auth-state", handleAuth as EventListener);
    window.addEventListener("kgm-auth-changed", handleAuth);
    window.addEventListener("storage", handleAuth);
    return () => {
      window.removeEventListener("kgm-language-changed", handleLanguage as EventListener);
      window.removeEventListener("kgm-chat-unread", handleUnread as EventListener);
      window.removeEventListener("kgm-profile-updated", handleProfile as EventListener);
      window.removeEventListener("kgm-auth-state", handleAuth as EventListener);
      window.removeEventListener("kgm-auth-changed", handleAuth);
      window.removeEventListener("storage", handleAuth);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function closeMenu() { setMenuOpen(false); }
  function jump(id: string) { closeMenu(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  function clickExisting(selector: string) { closeMenu(); (document.querySelector(selector) as HTMLElement | null)?.click(); }
  function openUpload() { closeMenu(); clickExisting(".kgm-gallery-nav-link"); window.setTimeout(() => (document.querySelector(".kgm-gallery-upload-button") as HTMLElement | null)?.click(), 100); }
  function openProfile() { closeMenu(); if (account || hasSessionToken) window.dispatchEvent(new Event("kgm-open-profile")); else clickExisting(".kgm-account-nav-link"); }
  function openAi() { closeMenu(); window.dispatchEvent(new Event("kgm-open-ai-tutor")); }
  function openCommunity() { jump("kgm-community-live"); }
  function toggleLanguage() { closeMenu(); window.dispatchEvent(new Event("kgm-toggle-language")); }
  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("kgm-youth-dark", next);
    localStorage.setItem(THEME_KEY, next ? "dark" : "light");
  }

  return (
    <header className="kgmShellHeader" aria-label={text("KGM navigation", "KGM నావిగేషన్")}>
      <div className="kgmShellHeaderInner">
        <button className="kgmShellBrand" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="KGM Youthverse home">
          <span className="kgmShellBrandMark">K</span>
          <span><strong>KGM</strong><small>YOUTHVERSE</small></span>
        </button>

        <nav className="kgmShellNav" aria-label={text("Primary navigation", "ప్రధాన నావిగేషన్")}>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>{text("Home", "హోమ్")}</button>
          <button type="button" onClick={() => jump("kgm-explore")}>{text("Explore", "అన్వేషించండి")}</button>
          <button type="button" className="create" onClick={openUpload}>{text("Create", "సృష్టించండి")}</button>
          <button type="button" className="community" onClick={openCommunity}>{text("Community", "కమ్యూనిటీ")}{chatUnread > 0 ? <b>{chatUnread > 99 ? "99+" : chatUnread}</b> : null}</button>
          <button type="button" className="ai" onClick={openAi}><span>✦</span>{text("KGM AI", "KGM AI")}</button>
        </nav>

        <div className="kgmShellActions">
          <button className="kgmQuickCreate" type="button" onClick={openUpload} aria-label={text("Create or upload", "సృష్టించండి లేదా అప్‌లోడ్ చేయండి")}>＋</button>
          <button className="kgmShellProfile" type="button" onClick={openProfile} aria-label={text("Open profile", "ప్రొఫైల్ తెరవండి")}>
            {account ? <KgmAvatar value={account.avatar} nickname={account.nickname} size="xs" /> : <span>☺</span>}
            <strong>{account?.nickname || text("You", "మీరు")}</strong>
          </button>
          <button className={`kgmShellMore${menuOpen ? " open" : ""}`} type="button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-label={text("Open settings", "సెట్టింగ్‌లు తెరవండి")}><i/><i/><i/></button>
        </div>

        <div className="nav-links kgmLegacyPortalHost" aria-hidden="true" />
      </div>

      {menuOpen ? <div className="kgmShellMenu">
        <button type="button" onClick={toggleLanguage}><span>文</span>{telugu ? "English" : "తెలుగు"}</button>
        <button type="button" onClick={toggleTheme}><span>{dark ? "☀" : "◐"}</span>{dark ? text("Light mode", "లైట్ మోడ్") : text("Dark mode", "డార్క్ మోడ్")}</button>
        <div className="kgmShellInstall"><PwaInstallButton /></div>
        <button type="button" onClick={() => { closeMenu(); window.location.href = "/privacy"; }}><span>◉</span>{text("Privacy & safety", "గోప్యత & భద్రత")}</button>
      </div> : null}
    </header>
  );
}
