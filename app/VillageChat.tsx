"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ChatRole = "Child" | "Teen" | "Adult";
type AuthMode = "signin" | "register";
type ChatAccount = { id: string; email: string; nickname: string; role: ChatRole; email_verified: boolean; created_at: string };
type AuthResponse = { token: string; user: ChatAccount; verification_required: boolean };
type ChatMessage = { id: string; nickname: string; role: ChatRole; text: string; created_at: string; mine: boolean };
type NotificationState = NotificationPermission | "unsupported";
type BadgeNavigator = Navigator & { setAppBadge?: (contents?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
type AuthStateDetail = { authenticated: boolean; user?: ChatAccount; token?: string; validationPending?: boolean };

class KgmApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "KgmApiError";
    this.status = status;
  }
}

const CHAT_API = (process.env.NEXT_PUBLIC_KGM_CHAT_API || "https://mana-koratlagudem.onrender.com").replace(/\/$/, "");
const TOKEN_KEY = "kgm-village-chat-token-v2";
const ACCOUNT_CACHE_KEY = "kgm-account-cache-v1";
const NOTIFY_KEY = "kgm-village-chat-notifications-v1";
const SEEN_KEY_PREFIX = "kgm-village-chat-seen-v1:";

function emitAuthState(detail: AuthStateDetail) {
  window.dispatchEvent(new CustomEvent<AuthStateDetail>("kgm-auth-state", { detail }));
}

function cacheAccount(account: ChatAccount | null) {
  if (!account) {
    localStorage.removeItem(ACCOUNT_CACHE_KEY);
    return;
  }
  localStorage.setItem(ACCOUNT_CACHE_KEY, JSON.stringify(account));
}

function readCachedAccount(): ChatAccount | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_CACHE_KEY);
    if (!raw) return null;
    const account = JSON.parse(raw) as ChatAccount;
    return account?.id && account?.nickname ? account : null;
  } catch {
    return null;
  }
}

function timeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "now";
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(date);
}

async function jsonRequest<T>(url: string, init?: RequestInit, token?: string): Promise<T> {
  const headers = new Headers(init?.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(url, { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new KgmApiError(
      typeof data?.detail === "string" ? data.detail : "Village Chat is temporarily unavailable",
      response.status,
    );
  }
  return data as T;
}

export default function VillageChat() {
  const [open, setOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [account, setAccount] = useState<ChatAccount | null>(null);
  const [token, setToken] = useState("");
  const [sessionChecking, setSessionChecking] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [navHost, setNavHost] = useState<Element | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastCount, setToastCount] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationState>("unsupported");
  const listRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);
  const notificationsEnabledRef = useRef(false);
  const latestIdRef = useRef("");
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    setNavHost(document.querySelector(".nav-links"));
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      cacheAccount(null);
      emitAuthState({ authenticated: false });
      setSessionChecking(false);
      return;
    }

    setToken(stored);
    const cached = readCachedAccount();
    if (cached) {
      setAccount(cached);
      emitAuthState({ authenticated: true, user: cached, token: stored, validationPending: true });
    } else {
      emitAuthState({ authenticated: true, token: stored, validationPending: true });
    }

    jsonRequest<ChatAccount>(`${CHAT_API}/api/kgm-chat/auth/me`, undefined, stored)
      .then((user) => {
        setAccount(user);
        cacheAccount(user);
        emitAuthState({ authenticated: true, user, token: stored });
      })
      .catch((err) => {
        // A temporary mobile/WebView/Render network failure must never erase a valid
        // login. Only an explicit authentication rejection invalidates the token.
        if (err instanceof KgmApiError && err.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          cacheAccount(null);
          setToken("");
          setAccount(null);
          emitAuthState({ authenticated: false });
          window.dispatchEvent(new Event("kgm-auth-changed"));
          return;
        }
        setStatus("offline");
        emitAuthState({ authenticated: true, user: cached || undefined, token: stored, validationPending: true });
      })
      .finally(() => setSessionChecking(false));
  }, []);

  useEffect(() => {
    const permission: NotificationState = "Notification" in window ? Notification.permission : "unsupported";
    const enabled = permission === "granted" && localStorage.getItem(NOTIFY_KEY) === "enabled";
    setNotificationPermission(permission);
    setNotificationsEnabled(enabled);
    notificationsEnabledRef.current = enabled;
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("openChat") === "1") {
      setOpen(true);
      url.searchParams.delete("openChat");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
    if (!("serviceWorker" in navigator)) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "OPEN_KGM_CHAT") setOpen(true);
    };
    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, []);

  function seenKey(accountId = account?.id) {
    return accountId ? `${SEEN_KEY_PREFIX}${accountId}` : "";
  }

  function rememberSeen(messageId: string, accountId = account?.id) {
    const key = seenKey(accountId);
    if (key && messageId) localStorage.setItem(key, messageId);
  }

  useEffect(() => {
    openRef.current = open;
    document.documentElement.classList.toggle("kgm-chat-open", open);
    if (open) {
      setUnreadCount(0);
      setToastCount(0);
      if (latestIdRef.current) rememberSeen(latestIdRef.current);
    }
    return () => document.documentElement.classList.remove("kgm-chat-open");
  }, [open, account?.id]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && openRef.current) {
        setUnreadCount(0);
        setToastCount(0);
        if (latestIdRef.current) rememberSeen(latestIdRef.current);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [account?.id]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("kgm-chat-unread", { detail: { count: unreadCount } }));
    const badgeNavigator = navigator as BadgeNavigator;
    if (unreadCount > 0) void badgeNavigator.setAppBadge?.(unreadCount).catch(() => undefined);
    else void badgeNavigator.clearAppBadge?.().catch(() => undefined);
  }, [unreadCount]);

  useEffect(() => {
    if (!toastCount) return;
    const timer = window.setTimeout(() => setToastCount(0), 5500);
    return () => window.clearTimeout(timer);
  }, [toastCount]);

  async function showSystemNotification(count: number) {
    if (!notificationsEnabledRef.current || !("Notification" in window) || Notification.permission !== "granted") return;
    const title = count === 1 ? "New KGM Village Chat message" : `${count} new KGM Village Chat messages`;
    const options: NotificationOptions = {
      body: "Open KGM to see the latest village conversation.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "kgm-village-chat",
      data: { kind: "kgm-chat" },
    };
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, options);
      } else {
        const notice = new Notification(title, options);
        notice.onclick = () => {
          window.focus();
          setOpen(true);
          notice.close();
        };
      }
    } catch {
      // Notification delivery is best-effort; unread badges still remain available.
    }
  }

  useEffect(() => {
    if (!account || !token) return;
    let stopped = false;
    let timer = 0;
    bootstrappedRef.current = false;
    latestIdRef.current = "";

    const load = async () => {
      try {
        const cursor = bootstrappedRef.current && latestIdRef.current ? `&after=${encodeURIComponent(latestIdRef.current)}` : "";
        const data = await jsonRequest<{ items: ChatMessage[] }>(`${CHAT_API}/api/kgm-chat/messages?limit=100${cursor}`, undefined, token);
        if (stopped) return;
        setStatus("live");
        setError("");
        const items = data.items || [];

        if (!bootstrappedRef.current) {
          bootstrappedRef.current = true;
          setMessages(items.slice(-120));
          const newest = items[items.length - 1];
          latestIdRef.current = newest?.id || "";
          if (openRef.current) {
            if (newest?.id) rememberSeen(newest.id, account.id);
          } else {
            const savedSeen = localStorage.getItem(seenKey(account.id));
            const seenIndex = savedSeen ? items.findIndex((message) => message.id === savedSeen) : -1;
            if (seenIndex >= 0) {
              const missed = items.slice(seenIndex + 1).filter((message) => !message.mine);
              if (missed.length) setUnreadCount(missed.length);
            }
          }
        } else if (items.length) {
          const newest = items[items.length - 1];
          latestIdRef.current = newest.id;
          setMessages((current) => {
            const known = new Set(current.map((message) => message.id));
            return [...current, ...items.filter((message) => !known.has(message.id))].slice(-120);
          });

          const incoming = items.filter((message) => !message.mine);
          const needsAttention = incoming.length > 0 && (!openRef.current || document.visibilityState !== "visible");
          if (needsAttention) {
            setUnreadCount((current) => Math.min(99, current + incoming.length));
            if (document.visibilityState === "visible" && !openRef.current) {
              setToastCount((current) => Math.min(99, current + incoming.length));
            } else {
              void showSystemNotification(incoming.length);
            }
          } else if (openRef.current && document.visibilityState === "visible") {
            rememberSeen(newest.id, account.id);
          }
        }
      } catch (err) {
        if (!stopped) {
          setStatus("offline");
          if (openRef.current) setError(err instanceof Error ? err.message : "Could not reach Village Chat");
        }
      } finally {
        if (!stopped) timer = window.setTimeout(load, openRef.current ? 2500 : 5000);
      }
    };

    void load();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [account?.id, token]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }));
  }, [messages.length, open]);

  const roleCounts = useMemo(() => messages.slice(-40).reduce<Record<string, number>>((acc, item) => {
    acc[item.role] = (acc[item.role] || 0) + 1;
    return acc;
  }, {}), [messages]);

  function openChat(mode?: AuthMode) {
    if (mode) setAuthMode(mode);
    setError("");
    setOpen(true);
  }

  async function toggleNotifications() {
    if (notificationsEnabled) {
      localStorage.setItem(NOTIFY_KEY, "disabled");
      notificationsEnabledRef.current = false;
      setNotificationsEnabled(false);
      return;
    }
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      setError("This browser does not support chat notifications. Unread badges will still work.");
      return;
    }
    let permission = Notification.permission;
    if (permission === "default") permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === "granted") {
      localStorage.setItem(NOTIFY_KEY, "enabled");
      notificationsEnabledRef.current = true;
      setNotificationsEnabled(true);
      setError("");
    } else {
      localStorage.setItem(NOTIFY_KEY, "disabled");
      notificationsEnabledRef.current = false;
      setNotificationsEnabled(false);
      setError("Browser notifications are blocked. You can still use the unread badge, or allow notifications in your browser settings.");
    }
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authBusy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    if (!email || password.length < 4) {
      setError("Enter an email and a password with at least 4 characters.");
      return;
    }
    if (authMode === "register" && data.get("safe") !== "on") {
      setError("Please accept the public-room safety rule.");
      return;
    }
    setAuthBusy(true);
    setError("");
    try {
      const payload = authMode === "register"
        ? { email, password, nickname: String(data.get("nickname") || "").trim(), role: String(data.get("role") || "Adult") as ChatRole }
        : { email, password };
      const result = await jsonRequest<AuthResponse>(
        `${CHAT_API}/api/kgm-chat/auth/${authMode === "register" ? "register" : "login"}`,
        { method: "POST", body: JSON.stringify(payload) },
      );
      localStorage.setItem(TOKEN_KEY, result.token);
      cacheAccount(result.user);
      setToken(result.token);
      setAccount(result.user);
      setMessages([]);
      setUnreadCount(0);
      setStatus("connecting");
      emitAuthState({ authenticated: true, user: result.user, token: result.token });
      window.dispatchEvent(new Event("kgm-auth-changed"));
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setAuthBusy(false);
    }
  }

  function signOut() {
    localStorage.removeItem(TOKEN_KEY);
    cacheAccount(null);
    setToken("");
    setAccount(null);
    setMessages([]);
    setDraft("");
    setReported(new Set());
    setUnreadCount(0);
    setToastCount(0);
    setStatus("connecting");
    setAuthMode("signin");
    setError("");
    latestIdRef.current = "";
    bootstrappedRef.current = false;
    emitAuthState({ authenticated: false });
    window.dispatchEvent(new Event("kgm-auth-changed"));
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account || !token || !draft.trim() || sending) return;
    setSending(true);
    try {
      const message = await jsonRequest<ChatMessage>(`${CHAT_API}/api/kgm-chat/messages`, {
        method: "POST",
        body: JSON.stringify({ text: draft.trim() }),
      }, token);
      setMessages((current) => [...current.filter((item) => item.id !== message.id), message].slice(-120));
      rememberSeen(message.id, account.id);
      setDraft("");
      setStatus("live");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that message");
    } finally {
      setSending(false);
    }
  }

  async function reportMessage(message: ChatMessage) {
    if (!token || reported.has(message.id)) return;
    try {
      const result = await jsonRequest<{ hidden?: boolean }>(`${CHAT_API}/api/kgm-chat/messages/${message.id}/report`, {
        method: "POST",
        body: JSON.stringify({ reason: "Reported from KGM Village Chat" }),
      }, token);
      setReported((current) => new Set(current).add(message.id));
      if (result.hidden) setMessages((current) => current.filter((item) => item.id !== message.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not report this message");
    }
  }

  async function deleteMessage(message: ChatMessage) {
    if (!token || !message.mine) return;
    try {
      await jsonRequest(`${CHAT_API}/api/kgm-chat/messages/${message.id}/delete`, { method: "POST" }, token);
      setMessages((current) => current.filter((item) => item.id !== message.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this message");
    }
  }

  const unreadLabel = unreadCount > 99 ? "99+" : String(unreadCount);
  const headerControls = navHost ? createPortal(<>
    <button className="kgm-chat-nav-link" type="button" onClick={() => openChat()}>Village Chat{unreadCount > 0 && <span className="kgm-chat-unread-inline">{unreadLabel}</span>}</button>
    <button className="kgm-account-nav-link" type="button" onClick={() => openChat("signin")}>{account ? account.nickname : "Sign in"}</button>
  </>, navHost) : null;

  return (
    <>
      {headerControls}
      <button className="village-chat-launcher" onClick={() => openChat()} aria-label={`Open Koratlagudem Village Chat${unreadCount ? `, ${unreadCount} unread messages` : ""}`}>
        <span className="village-chat-pulse" aria-hidden="true" />
        <span className="village-chat-icon" aria-hidden="true">☺</span>
        <span><strong>Village Chat</strong><small>{account ? "మన ఊరి మాటలు · Live" : token ? "Restoring your KGM session…" : "Sign in / Register"}</small></span>
        {unreadCount > 0 && <b className="village-chat-unread-badge" aria-label={`${unreadCount} unread messages`}>{unreadLabel}</b>}
      </button>

      {!open && toastCount > 0 && <button className="kgm-chat-toast" type="button" onClick={() => openChat()}>
        <span aria-hidden="true">💬</span>
        <div><strong>{toastCount === 1 ? "New Village Chat message" : `${toastCount} new Village Chat messages`}</strong><small>Tap to open KGM Village Chat.</small></div>
        <b>{toastCount > 99 ? "99+" : toastCount}</b>
      </button>}

      {open && <div className="village-chat-shell" role="dialog" aria-modal="true" aria-label="Koratlagudem Village Chat">
        <header className="village-chat-head">
          <div><span className={`chat-status ${account ? status : "connecting"}`} /><div><strong>KGM Village Chat</strong><small>{!account ? (token ? "Restoring your KGM session…" : "Sign in to join our village room") : status === "live" ? "Live public room · Koratlagudem" : status === "offline" ? "Trying to reconnect…" : "Connecting…"}</small></div></div>
          <button onClick={() => setOpen(false)} aria-label="Close chat">×</button>
        </header>

        {!account ? <div className="village-chat-auth">
          {token ? <div className="chat-empty"><span>↻</span><strong>Restoring your KGM account.</strong><p>Your saved login is still here. KGM will reconnect when the network is ready.</p></div> : <>
          <div className="chat-auth-tabs" role="tablist" aria-label="KGM account access">
            <button type="button" className={authMode === "signin" ? "active" : ""} onClick={() => { setAuthMode("signin"); setError(""); }}>Sign in</button>
            <button type="button" className={authMode === "register" ? "active" : ""} onClick={() => { setAuthMode("register"); setError(""); }}>Create account</button>
          </div>
          <form className="village-chat-join" onSubmit={handleAuth}>
            <span className="chat-kicker">KGM ACCOUNT · మన ఊరి ఖాతా</span>
            <h2>{authMode === "register" ? "Join our village." : "Welcome back."}</h2>
            <p>{authMode === "register" ? "Create a simple account for Village Chat. Your email stays private; only your nickname and role appear publicly." : "Sign in with the email and password you used when creating your KGM account."}</p>
            <label>Email<input name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></label>
            <label>Password<input name="password" type="password" required minLength={4} maxLength={64} autoComplete={authMode === "register" ? "new-password" : "current-password"} placeholder="Minimum 4 characters" /></label>
            {authMode === "register" && <>
              <label>Public nickname<input name="nickname" required minLength={2} maxLength={24} placeholder="e.g. CuriousKiran" autoComplete="nickname" /></label>
              <fieldset><legend>I am joining as</legend><div className="chat-role-options">{(["Child", "Teen", "Adult"] as ChatRole[]).map((role) => <label key={role}><input type="radio" name="role" value={role} defaultChecked={role === "Adult"} /><span>{role}</span></label>)}</div></fieldset>
              <label className="chat-safe-check"><input type="checkbox" name="safe" required /><span>I’ll keep the room friendly and won’t share personal contact information.</span></label>
            </>}
            <div className="chat-no-verification"><span>✓</span><p><strong>No email verification for now.</strong> Any valid email format can register immediately. Passwords are still stored securely as hashes.</p></div>
            <button className="chat-join-button" type="submit" disabled={authBusy || sessionChecking}>{authBusy ? "Please wait…" : authMode === "register" ? "Create account & enter chat →" : "Sign in & open chat →"}</button>
            {error && <p className="chat-error">{error}</p>}
          </form>
          </>}
        </div> : <>
          <div className="village-chat-safety"><span>🛡</span><p><strong>Public village room.</strong> No DMs, photos, links, phone numbers or email addresses. Report anything uncomfortable.</p></div>
          <div className="village-chat-meta">
            <span><b>{account.nickname}</b> · {account.role}</span>
            <span>{roleCounts.Child || 0} kids · {roleCounts.Teen || 0} teens · {roleCounts.Adult || 0} adults in recent chat</span>
            <div className="village-chat-meta-actions">
              <button className={`chat-notification-toggle${notificationsEnabled ? " enabled" : ""}`} type="button" onClick={toggleNotifications} title="Browser notifications use generic text so message content is not shown on your lock screen">
                {notificationsEnabled ? "🔔 Alerts on" : notificationPermission === "denied" ? "🔕 Alerts blocked" : "🔔 Notify me"}
              </button>
              <button type="button" onClick={signOut}>Sign out</button>
            </div>
          </div>
          <div className="village-chat-messages" ref={listRef} aria-live="polite">
            {!messages.length && status === "live" && <div className="chat-empty"><span>👋</span><strong>Start today’s village conversation.</strong><p>Ask about school, farming, science, sports, local events—or simply say hello.</p></div>}
            {messages.map((message) => <article className={message.mine ? "chat-message mine" : "chat-message"} key={message.id}>
              <div className="chat-message-top"><span className={`role-dot ${message.role.toLowerCase()}`} /><strong>{message.nickname}</strong><em>{message.role}</em><time>{timeLabel(message.created_at)}</time></div>
              <p>{message.text}</p>
              <div className="chat-message-actions">{message.mine ? <button onClick={() => deleteMessage(message)}>Delete</button> : <button disabled={reported.has(message.id)} onClick={() => reportMessage(message)}>{reported.has(message.id) ? "Reported ✓" : "Report"}</button>}</div>
            </article>)}
          </div>
          <form className="village-chat-compose" onSubmit={sendMessage}>
            {error && <p className="chat-error">{error}</p>}
            <div><textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={280} rows={2} placeholder="Write something friendly…" /><button type="submit" disabled={sending || !draft.trim()}>{sending ? "…" : "Send"}</button></div>
            <small>{draft.length}/280 · Personal contact details and links are blocked.</small>
          </form>
        </>}
      </div>}
    </>
  );
}
