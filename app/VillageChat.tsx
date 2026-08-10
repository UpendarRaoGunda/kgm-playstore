"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ChatRole = "Child" | "Teen" | "Adult";
type AuthMode = "signin" | "register";
type ChatAccount = { id: string; email: string; nickname: string; role: ChatRole; email_verified: boolean; created_at: string };
type AuthResponse = { token: string; user: ChatAccount; verification_required: boolean };
type ChatMessage = { id: string; nickname: string; role: ChatRole; text: string; created_at: string; mine: boolean };

const CHAT_API = (process.env.NEXT_PUBLIC_KGM_CHAT_API || "https://mana-koratlagudem.onrender.com").replace(/\/$/, "");
const TOKEN_KEY = "kgm-village-chat-token-v2";

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
  if (!response.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Village Chat is temporarily unavailable");
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
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNavHost(document.querySelector(".nav-links"));
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setSessionChecking(false);
      return;
    }
    setToken(stored);
    jsonRequest<ChatAccount>(`${CHAT_API}/api/kgm-chat/auth/me`, undefined, stored)
      .then((user) => setAccount(user))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken("");
      })
      .finally(() => setSessionChecking(false));
  }, []);

  const lastId = messages.length ? messages[messages.length - 1].id : "";

  useEffect(() => {
    if (!open || !account || !token) return;
    let stopped = false;
    const load = async (incremental: boolean) => {
      try {
        const cursor = incremental && lastId ? `&after=${encodeURIComponent(lastId)}` : "";
        const data = await jsonRequest<{ items: ChatMessage[] }>(`${CHAT_API}/api/kgm-chat/messages?limit=100${cursor}`, undefined, token);
        if (stopped) return;
        setStatus("live");
        setError("");
        if (incremental) {
          setMessages((current) => {
            const known = new Set(current.map((message) => message.id));
            return [...current, ...data.items.filter((message) => !known.has(message.id))].slice(-120);
          });
        } else setMessages(data.items);
      } catch (err) {
        if (!stopped) {
          setStatus("offline");
          setError(err instanceof Error ? err.message : "Could not reach Village Chat");
        }
      }
    };
    load(false);
    const timer = window.setInterval(() => load(true), 2500);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [open, account, token, lastId]);

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
        ? {
            email,
            password,
            nickname: String(data.get("nickname") || "").trim(),
            role: String(data.get("role") || "Adult") as ChatRole,
          }
        : { email, password };
      const result = await jsonRequest<AuthResponse>(
        `${CHAT_API}/api/kgm-chat/auth/${authMode === "register" ? "register" : "login"}`,
        { method: "POST", body: JSON.stringify(payload) },
      );
      localStorage.setItem(TOKEN_KEY, result.token);
      setToken(result.token);
      setAccount(result.user);
      setMessages([]);
      setStatus("connecting");
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setAuthBusy(false);
    }
  }

  function signOut() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setAccount(null);
    setMessages([]);
    setDraft("");
    setReported(new Set());
    setStatus("connecting");
    setAuthMode("signin");
    setError("");
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

  const headerControls = navHost ? createPortal(<>
    <button className="kgm-chat-nav-link" type="button" onClick={() => openChat()}>Village Chat</button>
    <button className="kgm-account-nav-link" type="button" onClick={() => openChat("signin")}>{account ? account.nickname : "Sign in"}</button>
  </>, navHost) : null;

  return (
    <>
      {headerControls}
      <button className="village-chat-launcher" onClick={() => openChat()} aria-label="Open Koratlagudem Village Chat">
        <span className="village-chat-pulse" aria-hidden="true" />
        <span className="village-chat-icon" aria-hidden="true">☺</span>
        <span><strong>Village Chat</strong><small>{account ? "మన ఊరి మాటలు · Live" : "Sign in / Register"}</small></span>
      </button>

      {open && <div className="village-chat-shell" role="dialog" aria-modal="true" aria-label="Koratlagudem Village Chat">
        <header className="village-chat-head">
          <div><span className={`chat-status ${account ? status : "connecting"}`} /><div><strong>KGM Village Chat</strong><small>{!account ? "Sign in to join our village room" : status === "live" ? "Live public room · Koratlagudem" : status === "offline" ? "Trying to reconnect…" : "Connecting…"}</small></div></div>
          <button onClick={() => setOpen(false)} aria-label="Close chat">×</button>
        </header>

        {!account ? <div className="village-chat-auth">
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
        </div> : <>
          <div className="village-chat-safety"><span>🛡</span><p><strong>Public village room.</strong> No DMs, photos, links, phone numbers or email addresses. Report anything uncomfortable.</p></div>
          <div className="village-chat-meta"><span><b>{account.nickname}</b> · {account.role}</span><span>{roleCounts.Child || 0} kids · {roleCounts.Teen || 0} teens · {roleCounts.Adult || 0} adults in recent chat</span><button onClick={signOut}>Sign out</button></div>
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
