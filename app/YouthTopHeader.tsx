"use client";

import { useEffect, useState } from "react";
import KgmAvatar, { avatarFromUploads, isKgmAvatarUpload, type KgmAvatarUpload, type KgmProfile } from "./KgmAvatar";
import { PwaInstallButton } from "./PwaInstall";

type Account = { id: string; email: string; nickname: string; role: "Child" | "Teen" | "Adult"; created_at?: string };
type Lang = "en" | "te";

const API = (process.env.NEXT_PUBLIC_KGM_CHAT_API || "https://mana-koratlagudem.onrender.com").replace(/\/$/, "");
const TOKEN_KEY = "kgm-village-chat-token-v2";
const ACCOUNT_CACHE_KEY = "kgm-account-cache-v1";
const THEME_KEY = "kgm-youth-theme-v1";
const LANG_KEY = "kgm-language-v2";

function baseProfile(account: Account): KgmProfile {
  return { ...account, avatar: { type: "preset", preset: "orbit-pop", url: null } };
}

function readCachedAccount(): Account | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_CACHE_KEY);
    if (!raw) return null;
    const account = JSON.parse(raw) as Account;
    return account?.id && account.nickname ? account : null;
  } catch {
    return null;
  }
}

function cacheAccount(account: Account | null) {
  if (account) localStorage.setItem(ACCOUNT_CACHE_KEY, JSON.stringify(account));
  else localStorage.removeItem(ACCOUNT_CACHE_KEY);
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
    if (!token) {
      setAccount(null);
      return;
    }
    const cached = readCachedAccount();
    if (cached) setAccount((current) => current?.id === cached.id ? current : baseProfile(cached));
    try {
      const response = await fetch(`${API}/api/kgm-chat/auth/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          cacheAccount(null);
          setHasSessionToken(false);
          setAccount(null);
        }
        return;
      }
      const me = await response.json() as Account;
      cacheAccount(me);
      setHasSessionToken(true);
      setAccount(baseProfile(me));
      try {
        const uploadsResponse = await fetch(`${API}/api/kgm-uploads/mine`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (!uploadsResponse.ok) return;
        const uploads = await uploadsResponse.json() as { items?: KgmAvatarUpload[] };
        const avatars = (uploads.items || []).filter((item) => isKgmAvatarUpload(item) && item.kind === "image");
        setAccount({ ...me, avatar: avatarFromUploads(avatars) });
      } catch {
        // Avatar decoration is optional.
      }
    } catch {
      // Preserve cached login on a slow/offline network.
    }
  }

  useEffect(() => {
    const savedDark = localStorage.getItem(THEME_KEY) !== "light";
    setDark(savedDark);
    document.documentElement.classList.toggle("kgm-youth-dark", savedDark);
    setLang(localStorage.getItem(LANG_KEY) === "te" ? "te" : "en");
    const token = localStorage.getItem(TOKEN_KEY) || "";
    setHasSessionToken(Boolean(token));
    const cached = token ? readCachedAccount() : null;
    if (cached) setAccount(baseProfile(cached));
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
      cacheAccount({ id: next.id, email: next.email, nickname: next.nickname, role: next.role, created_at: next.created_at });
    };
    const handleAuth = () => void syncAccount();
    window.addEventListener("kgm-language-changed", handleLanguage as EventListener);
    window.addEventListener("kgm-chat-unread", handleUnread as EventListener);
    window.addEventListener("kgm-profile-updated", handleProfile as EventListener);
    window.addEventListener("kgm-auth-state", handleAuth as EventListener);
    window.addEventListener("kgm-auth-changed", handleAuth);
    window.addEventListener("storage", handleAuth);
    window.addEventListener("focus", handleAuth);
    return () => {
      window.removeEventListener("kgm-language-changed", handleLanguage as EventListener);
      window.removeEventListener("kgm-chat-unread", handleUnread as EventListener);
      window.removeEventListener("kgm-profile-updated", handleProfile as EventListener);
      window.removeEventListener("kgm-auth-state", handleAuth as EventListener);
      window.removeEventListener("kgm-auth-changed", handleAuth);
      window.removeEventListener("storage", handleAuth);
      window.removeEventListener("focus", handleAuth);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function closeMenu() { setMenuOpen(false); }
  function jump(id: string) { closeMenu(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  function clickExisting(selector: string) { closeMenu(); (document.querySelector(selector) as HTMLElement | null)?.click(); }
  function openCinema() { closeMenu(); window.dispatchEvent(new Event("kgm-open-cinema")); }
  function openVideo() { closeMenu(); window.dispatchEvent(new Event("kgm-open-video-chat")); }
  function openUpload() { closeMenu(); clickExisting(".kgm-gallery-nav-link"); window.setTimeout(() => (document.querySelector(".kgm-gallery-upload-button") as HTMLElement | null)?.click(), 90); }
  function openAccount() {
    closeMenu();
    if (account || hasSessionToken) window.dispatchEvent(new Event("kgm-open-profile"));
    else clickExisting(".kgm-account-nav-link");
  }
  function toggleLanguage() { closeMenu(); window.dispatchEvent(new Event("kgm-toggle-language")); }
  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("kgm-youth-dark", next);
    localStorage.setItem(THEME_KEY, next ? "dark" : "light");
  }
  function logOut() {
    closeMenu();
    localStorage.removeItem(TOKEN_KEY);
    cacheAccount(null);
    setHasSessionToken(false);
    setAccount(null);
    setChatUnread(0);
    window.dispatchEvent(new CustomEvent("kgm-auth-state", { detail: { authenticated: false } }));
    window.dispatchEvent(new Event("kgm-auth-changed"));
  }

  const unreadLabel = chatUnread > 99 ? "99+" : String(chatUnread);

  return (
    <header className="kgm-youth-header" aria-label={text("KGM navigation", "KGM నావిగేషన్")}>
      <div className="kgm-youth-header-inner">
        <button className="kgm-youth-brand" type="button" onClick={() => { closeMenu(); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label="KGM Youthverse home">
          <span className="kgm-youth-brand-mark">K</span>
          <span className="kgm-youth-brand-copy"><strong>KGM</strong><small>YOUTHVERSE</small></span>
        </button>

        <nav className="kgm-youth-nav" aria-label={text("Primary navigation", "ప్రధాన నావిగేషన్")}>
          <button type="button" onClick={() => jump("kgm-explore")}>{text("Explore", "అన్వేషించండి")}</button>
          <button type="button" className="kgm-nav-create" onClick={openUpload}>{text("Create", "సృష్టించండి")}</button>
          <button type="button" onClick={openCinema}>{text("Watch", "చూడండి")}</button>
          <button type="button" className="kgm-nav-community" onClick={() => jump("kgm-community-live")}>{text("Community", "కమ్యూనిటీ")}{chatUnread > 0 && <b className="kgm-youth-chat-badge">{unreadLabel}</b>}</button>
        </nav>

        <div className="kgm-youth-header-actions">
          <button className="kgm-youth-account" type="button" onClick={openAccount} title={account ? account.nickname : text("Open profile", "ప్రొఫైల్ తెరవండి")}>
            {account ? <KgmAvatar value={account.avatar} nickname={account.nickname} size="xs" className="kgm-header-avatar" /> : <span>☺</span>}
            <strong>{account?.nickname || text("Profile", "ప్రొఫైల్")}</strong>
          </button>
          <button className={`kgm-youth-menu${menuOpen ? " open" : ""}`} type="button" onClick={() => setMenuOpen((current) => !current)} aria-label={text("Open more options", "మరిన్ని ఎంపికలు తెరవండి")} aria-expanded={menuOpen}><i/><i/><i/></button>
        </div>
      </div>

      <div className={`kgm-youth-mobile-menu${menuOpen ? " open" : ""}`}>
        <button type="button" onClick={() => jump("kgm-explore")}><span>◉</span>{text("Explore KGM", "KGMను అన్వేషించండి")}</button>
        <button type="button" onClick={openUpload}><span>＋</span>{text("Create / Upload", "సృష్టించండి / అప్‌లోడ్")}</button>
        <button type="button" onClick={openCinema}><span>🎬</span>{text("Science Cinema", "సైన్స్ సినిమా")}</button>
        <button type="button" onClick={() => clickExisting(".kgm-gallery-nav-link")}><span>✦</span>{text("Gallery", "గ్యాలరీ")}</button>
        <button type="button" onClick={() => jump("apps")}><span>▦</span>{text("Apps", "యాప్స్")}</button>
        <button type="button" onClick={() => jump("music")}><span>♪</span>{text("Music", "సంగీతం")}</button>
        <button type="button" onClick={() => clickExisting(".kgm-chat-nav-link")}><span>💬</span>{text("Village Chat", "గ్రామ చాట్")}{chatUnread > 0 && <b className="kgm-youth-chat-badge">{unreadLabel}</b>}</button>
        <button type="button" onClick={openVideo}><span>🎥</span>{text("Video Room", "వీడియో గది")}</button>
        <div className="kgm2-menu-tools">
          <button type="button" onClick={toggleLanguage}>{telugu ? "English" : "తెలుగు"}</button>
          <button type="button" onClick={toggleTheme}>{dark ? text("Light mode", "లైట్ మోడ్") : text("Dark mode", "డార్క్ మోడ్")}</button>
          <div className="kgm2-menu-wide"><PwaInstallButton /></div>
          {(account || hasSessionToken) && <button type="button" className="kgm2-menu-wide" onClick={logOut}>{text("Log out", "లాగ్ అవుట్")}</button>}
        </div>
      </div>
    </header>
  );
}
