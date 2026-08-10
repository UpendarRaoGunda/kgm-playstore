"use client";

import { useEffect, useState } from "react";
import KgmAvatar, { avatarFromUploads, isKgmAvatarUpload, type KgmAvatarUpload, type KgmProfile } from "./KgmAvatar";
import { PwaInstallButton } from "./PwaInstall";

type Account = { id: string; email: string; nickname: string; role: "Child" | "Teen" | "Adult"; created_at?: string };
type AuthStateDetail = { authenticated?: boolean; user?: Account; token?: string; validationPending?: boolean };

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
    return account?.id && account?.nickname ? account : null;
  } catch {
    return null;
  }
}

function cacheAccount(account: Account | null) {
  if (!account) {
    localStorage.removeItem(ACCOUNT_CACHE_KEY);
    return;
  }
  localStorage.setItem(ACCOUNT_CACHE_KEY, JSON.stringify(account));
}

export default function YouthTopHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [account, setAccount] = useState<KgmProfile | null>(null);
  const [hasSessionToken, setHasSessionToken] = useState(false);
  const [dark, setDark] = useState(true);
  const [chatUnread, setChatUnread] = useState(0);
  const [lang, setLang] = useState<"en" | "te">("en");

  async function syncAccount() {
    const token = localStorage.getItem(TOKEN_KEY) || "";
    setHasSessionToken(Boolean(token));
    if (!token) {
      setAccount(null);
      return;
    }

    // Mobile/PWA/WebView should show the signed-in state immediately, without
    // waiting for Render or an avatar request to finish.
    const cached = readCachedAccount();
    if (cached) setAccount((current) => current?.id === cached.id ? current : baseProfile(cached));

    const headers = { Authorization: `Bearer ${token}` };
    try {
      const response = await fetch(`${API}/api/kgm-chat/auth/me`, { headers, cache: "no-store" });
      if (!response.ok) {
        // Only a real auth rejection invalidates a saved KGM login. Permission,
        // server and network failures must never silently sign a mobile user out.
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
        const uploadsResponse = await fetch(`${API}/api/kgm-uploads/mine`, { headers, cache: "no-store" });
        if (!uploadsResponse.ok) return;
        const uploads = await uploadsResponse.json() as { items?: KgmAvatarUpload[] };
        const avatars = (uploads.items || []).filter((item) => isKgmAvatarUpload(item) && item.kind === "image");
        setAccount({ ...me, avatar: avatarFromUploads(avatars) });
      } catch {
        // Avatar decoration is optional; keep the authenticated profile.
      }
    } catch {
      // Offline/slow Render: preserve the token and cached authenticated identity.
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    const nextDark = saved !== "light";
    setDark(nextDark);
    document.documentElement.classList.toggle("kgm-youth-dark", nextDark);
    setLang(localStorage.getItem(LANG_KEY) === "te" ? "te" : "en");
    const token = localStorage.getItem(TOKEN_KEY) || "";
    setHasSessionToken(Boolean(token));
    if (token) {
      const cached = readCachedAccount();
      if (cached) setAccount(baseProfile(cached));
    }
    void syncAccount();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let previousToken = localStorage.getItem(TOKEN_KEY) || "";
    const timer = window.setInterval(() => {
      const currentToken = localStorage.getItem(TOKEN_KEY) || "";
      if (currentToken === previousToken) return;
      previousToken = currentToken;
      setHasSessionToken(Boolean(currentToken));
      if (currentToken) {
        const cached = readCachedAccount();
        if (cached) setAccount(baseProfile(cached));
      } else {
        setAccount(null);
      }
      void syncAccount();
    }, 600);
    return () => window.clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleUnread = (event: Event) => {
      const count = (event as CustomEvent<{ count?: number }>).detail?.count || 0;
      setChatUnread(Math.max(0, count));
    };
    const handleProfile = (event: Event) => {
      const next = (event as CustomEvent<KgmProfile>).detail;
      if (next?.id) {
        setAccount(next);
        setHasSessionToken(true);
        cacheAccount({ id: next.id, email: next.email, nickname: next.nickname, role: next.role, created_at: next.created_at });
      }
    };
    const handleAuthState = (event: Event) => {
      const detail = (event as CustomEvent<AuthStateDetail>).detail || {};
      if (detail.authenticated === false) {
        setHasSessionToken(false);
        setAccount(null);
        cacheAccount(null);
        return;
      }
      if (detail.authenticated) {
        setHasSessionToken(true);
        if (detail.user?.id) {
          cacheAccount(detail.user);
          setAccount(baseProfile(detail.user));
        }
      }
    };
    const handleLanguage = (event: Event) => {
      const next = (event as CustomEvent<{ lang?: "en" | "te" }>).detail?.lang;
      if (next) setLang(next);
    };
    const handleAuthChanged = () => {
      const token = localStorage.getItem(TOKEN_KEY) || "";
      setHasSessionToken(Boolean(token));
      if (token) {
        const cached = readCachedAccount();
        if (cached) setAccount(baseProfile(cached));
      } else {
        setAccount(null);
      }
      void syncAccount();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== TOKEN_KEY && event.key !== ACCOUNT_CACHE_KEY) return;
      const token = localStorage.getItem(TOKEN_KEY) || "";
      setHasSessionToken(Boolean(token));
      if (token) {
        const cached = readCachedAccount();
        if (cached) setAccount(baseProfile(cached));
      } else {
        setAccount(null);
      }
      void syncAccount();
    };
    const handleFocus = () => { void syncAccount(); };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void syncAccount();
    };

    window.addEventListener("kgm-chat-unread", handleUnread as EventListener);
    window.addEventListener("kgm-profile-updated", handleProfile as EventListener);
    window.addEventListener("kgm-auth-state", handleAuthState as EventListener);
    window.addEventListener("kgm-language-changed", handleLanguage as EventListener);
    window.addEventListener("kgm-auth-changed", handleAuthChanged);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("kgm-chat-unread", handleUnread as EventListener);
      window.removeEventListener("kgm-profile-updated", handleProfile as EventListener);
      window.removeEventListener("kgm-auth-state", handleAuthState as EventListener);
      window.removeEventListener("kgm-language-changed", handleLanguage as EventListener);
      window.removeEventListener("kgm-auth-changed", handleAuthChanged);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function closeMenu() { setMenuOpen(false); }
  function jump(selector: string) { closeMenu(); document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  function clickExisting(selector: string) { closeMenu(); (document.querySelector(selector) as HTMLElement | null)?.click(); }
  function openCinema() { closeMenu(); window.dispatchEvent(new Event("kgm-open-cinema")); }
  function openAccount() {
    closeMenu();
    if (account || hasSessionToken) window.dispatchEvent(new Event("kgm-open-profile"));
    else clickExisting(".kgm-account-nav-link");
  }
  function toggleLanguage() { closeMenu(); window.dispatchEvent(new Event("kgm-toggle-language")); }

  function toggleMenu() {
    const next = !menuOpen;
    if (next) {
      const token = localStorage.getItem(TOKEN_KEY) || "";
      setHasSessionToken(Boolean(token));
      if (token) {
        const cached = readCachedAccount();
        if (cached) setAccount(baseProfile(cached));
      }
    }
    setMenuOpen(next);
    if (next) void syncAccount();
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
    window.location.reload();
  }

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("kgm-youth-dark", next);
    localStorage.setItem(THEME_KEY, next ? "dark" : "light");
  }

  const unreadLabel = chatUnread > 99 ? "99+" : chatUnread;
  const signedIn = hasSessionToken || Boolean(account);
  const labels = lang === "te" ? {
    discover: "అన్వేషించండి", apps: "యాప్స్", music: "సంగీతం", cinema: "సినిమా", gallery: "గ్యాలరీ", chat: "చాట్",
    install: "ఆండ్రాయిడ్ ఇన్‌స్టాల్", safety: "భద్రత", creators: "యువ సృష్టికర్తలు", language: "English", signIn: "సైన్ ఇన్ / నమోదు", logout: "లాగ్ అవుట్",
  } : {
    discover: "Discover", apps: "Apps", music: "Music", cinema: "Cinema", gallery: "Gallery", chat: "Chat",
    install: "Install Android", safety: "Safety", creators: "Young creators", language: "తెలుగు", signIn: "Sign in / Register", logout: "Log out",
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
          <button className="kgm-youth-account" type="button" onClick={openAccount} title={account ? `Edit ${account.nickname}'s profile` : signedIn ? "Open your KGM profile" : "Sign in or create account"}>
            {account ? <KgmAvatar value={account.avatar} nickname={account.nickname} size="xs" className="kgm-header-avatar" /> : <span>☺</span>}
            <strong>{account?.nickname || (signedIn ? (lang === "te" ? "ప్రొఫైల్" : "Profile") : (lang === "te" ? "సైన్ ఇన్" : "Sign in"))}</strong>
          </button>
          <button className={`kgm-youth-menu${menuOpen ? " open" : ""}`} type="button" onClick={toggleMenu} aria-label="Open KGM menu" aria-expanded={menuOpen}>
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
        <button type="button" onClick={toggleLanguage}><span>🌐</span>{labels.language}</button>
        {signedIn ? (
          <button type="button" onClick={logOut}><span>↪</span>{labels.logout}</button>
        ) : (
          <button type="button" onClick={openAccount}><span>☺</span>{labels.signIn}</button>
        )}
      </div>
    </header>
  );
}
