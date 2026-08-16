"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ChatRole = "Child" | "Teen" | "Adult";
type AuthMode = "signin" | "register";
type ChatAccount = { id: string; email: string; nickname: string; role: ChatRole; email_verified?: boolean; created_at: string };
type AuthResponse = { token: string; user: ChatAccount };
type ChatMessage = { id: string; nickname: string; role: ChatRole; text: string; created_at: string; mine: boolean };

class KgmApiError extends Error { status: number; constructor(message: string, status: number) { super(message); this.name = "KgmApiError"; this.status = status; } }

const CHAT_API = (process.env.NEXT_PUBLIC_KGM_CHAT_API || "").replace(/\/$/, "");
const TOKEN_KEY = "kgm-village-chat-token-v2";
const ACCOUNT_CACHE_KEY = "kgm-account-cache-v1";
const MUTED_KEY = "kgm-village-chat-muted-v1";

function cacheAccount(account: ChatAccount | null) { if (account) localStorage.setItem(ACCOUNT_CACHE_KEY, JSON.stringify(account)); else localStorage.removeItem(ACCOUNT_CACHE_KEY); }
function readCachedAccount(): ChatAccount | null { try { const item = JSON.parse(localStorage.getItem(ACCOUNT_CACHE_KEY) || "null") as ChatAccount | null; return item?.id && item.nickname ? item : null; } catch { return null; } }
function readMuted(): string[] { try { const value = JSON.parse(localStorage.getItem(MUTED_KEY) || "[]"); return Array.isArray(value) ? value.filter((item) => typeof item === "string") : []; } catch { return []; } }
function timeLabel(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "now" : new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(date); }

async function jsonRequest<T>(url: string, init?: RequestInit, token?: string): Promise<T> {
  const headers = new Headers(init?.headers || {}); headers.set("Content-Type", "application/json"); if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(url, { ...init, headers }); const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new KgmApiError(typeof data?.detail === "string" ? data.detail : "Village Chat is temporarily unavailable", response.status);
  return data as T;
}

export default function VillageChat() {
  const [open, setOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [account, setAccount] = useState<ChatAccount | null>(null);
  const [token, setToken] = useState("");
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const [muted, setMuted] = useState<Set<string>>(new Set());
  const [unread, setUnread] = useState(0);
  const [navHost, setNavHost] = useState<Element | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const latestIdRef = useRef("");
  const openRef = useRef(false);

  useEffect(() => {
    setNavHost(document.querySelector(".nav-links"));
    setMuted(new Set(readMuted()));
    const stored = localStorage.getItem(TOKEN_KEY) || "";
    if (!stored) { setChecking(false); return; }
    setToken(stored);
    const cached = readCachedAccount();
    if (cached) setAccount(cached);
    jsonRequest<ChatAccount>(`${CHAT_API}/api/kgm-chat/auth/me`, undefined, stored).then((user) => { setAccount(user); cacheAccount(user); window.dispatchEvent(new CustomEvent("kgm-auth-state", { detail: { authenticated: true, user } })); }).catch((err) => {
      if (err instanceof KgmApiError && err.status === 401) { localStorage.removeItem(TOKEN_KEY); cacheAccount(null); setToken(""); setAccount(null); }
      else setStatus("offline");
    }).finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("kgm-open-village-chat", onOpen);
    return () => window.removeEventListener("kgm-open-village-chat", onOpen);
  }, []);

  useEffect(() => {
    openRef.current = open;
    document.documentElement.classList.toggle("kgm-chat-open", open);
    window.dispatchEvent(new CustomEvent("kgm-village-chat-state", { detail: { open } }));
    if (open) setUnread(0);
    return () => document.documentElement.classList.remove("kgm-chat-open");
  }, [open]);

  useEffect(() => { window.dispatchEvent(new CustomEvent("kgm-chat-unread", { detail: { count: unread } })); }, [unread]);

  useEffect(() => {
    if (!account || !token) return;
    let stopped = false; let timer = 0; latestIdRef.current = "";
    const load = async () => {
      try {
        const cursor = latestIdRef.current ? `&after=${encodeURIComponent(latestIdRef.current)}` : "";
        const data = await jsonRequest<{ items: ChatMessage[] }>(`${CHAT_API}/api/kgm-chat/messages?limit=100${cursor}`, undefined, token);
        if (stopped) return;
        setStatus("live"); setError("");
        const incoming = data.items || [];
        if (!latestIdRef.current) setMessages(incoming.slice(-120));
        else if (incoming.length) setMessages((current) => { const known = new Set(current.map((item) => item.id)); return [...current, ...incoming.filter((item) => !known.has(item.id))].slice(-120); });
        if (incoming.length) {
          latestIdRef.current = incoming[incoming.length - 1].id;
          const attention = incoming.filter((message) => !message.mine && !muted.has(message.nickname)).length;
          if (attention && !openRef.current) setUnread((value) => Math.min(99, value + attention));
        }
      } catch (err) { if (!stopped) { setStatus("offline"); if (openRef.current) setError(err instanceof Error ? err.message : "Could not reach Village Chat"); } }
      finally { if (!stopped) timer = window.setTimeout(load, openRef.current ? 3000 : 12000); }
    };
    void load(); return () => { stopped = true; window.clearTimeout(timer); };
  }, [account?.id, token, muted]);

  useEffect(() => { if (open) requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight })); }, [messages.length, open]);

  const visibleMessages = useMemo(() => messages.filter((message) => message.mine || !muted.has(message.nickname)), [messages, muted]);
  const roleCounts = useMemo(() => visibleMessages.slice(-40).reduce<Record<string, number>>((acc, item) => { acc[item.role] = (acc[item.role] || 0) + 1; return acc; }, {}), [visibleMessages]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget; const data = new FormData(form); const email = String(data.get("email") || "").trim(); const password = String(data.get("password") || "");
    if (!email || password.length < 4) { setError("Enter an email and a password with at least 4 characters."); return; }
    if (authMode === "register" && (data.get("safe") !== "on" || !data.get("role"))) { setError("Choose your age group and accept the public-room safety rule."); return; }
    setBusy(true); setError("");
    try {
      const payload = authMode === "register" ? { email, password, nickname: String(data.get("nickname") || "").trim(), role: String(data.get("role")) as ChatRole } : { email, password };
      const result = await jsonRequest<AuthResponse>(`${CHAT_API}/api/kgm-chat/auth/${authMode === "register" ? "register" : "login"}`, { method: "POST", body: JSON.stringify(payload) });
      localStorage.setItem(TOKEN_KEY, result.token); cacheAccount(result.user); setToken(result.token); setAccount(result.user); setMessages([]); setUnread(0); setStatus("connecting"); form.reset();
      window.dispatchEvent(new CustomEvent("kgm-auth-state", { detail: { authenticated: true, user: result.user } })); window.dispatchEvent(new Event("kgm-auth-changed"));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not sign in"); } finally { setBusy(false); }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!account || !token || !draft.trim() || sending) return; setSending(true);
    try { const message = await jsonRequest<ChatMessage>(`${CHAT_API}/api/kgm-chat/messages`, { method: "POST", body: JSON.stringify({ text: draft.trim() }) }, token); setMessages((current) => [...current.filter((item) => item.id !== message.id), message].slice(-120)); setDraft(""); setStatus("live"); setError(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not send that message"); } finally { setSending(false); }
  }

  async function reportMessage(message: ChatMessage) {
    if (!token || reported.has(message.id)) return;
    try { const result = await jsonRequest<{ hidden?: boolean }>(`${CHAT_API}/api/kgm-chat/messages/${message.id}/report`, { method: "POST", body: JSON.stringify({ reason: "Reported from KGM Village Chat" }) }, token); setReported((current) => new Set(current).add(message.id)); if (result.hidden) setMessages((current) => current.filter((item) => item.id !== message.id)); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not report this message"); }
  }

  async function deleteMessage(message: ChatMessage) { if (!token || !message.mine) return; try { await jsonRequest(`${CHAT_API}/api/kgm-chat/messages/${message.id}/delete`, { method: "POST" }, token); setMessages((current) => current.filter((item) => item.id !== message.id)); } catch (err) { setError(err instanceof Error ? err.message : "Could not delete this message"); } }
  function mutePerson(nickname: string) { const next = new Set(muted); next.add(nickname); setMuted(next); localStorage.setItem(MUTED_KEY, JSON.stringify([...next])); }
  function signOut() { localStorage.removeItem(TOKEN_KEY); cacheAccount(null); setToken(""); setAccount(null); setMessages([]); setDraft(""); setUnread(0); setError(""); setAuthMode("signin"); window.dispatchEvent(new CustomEvent("kgm-auth-state", { detail: { authenticated: false } })); window.dispatchEvent(new Event("kgm-auth-changed")); }

  const headerControls = navHost ? createPortal(<><button className="kgm-chat-nav-link" type="button" onClick={() => setOpen(true)}>Village Chat</button><button className="kgm-account-nav-link" type="button" onClick={() => setOpen(true)}>{account ? account.nickname : "Sign in"}</button></>, navHost) : null;

  return <>{headerControls}{open ? <div className="village-chat-shell" role="dialog" aria-modal="true" aria-label="Koratlagudem Village Chat">
    <header className="village-chat-head"><div><span className={`chat-status ${account ? status : "connecting"}`}/><div><strong>KGM Village Chat</strong><small>{account ? status === "live" ? "Public room · Koratlagudem" : status === "offline" ? "Reconnecting…" : "Connecting…" : "Public community room"}</small></div></div><button type="button" onClick={() => setOpen(false)} aria-label="Close chat">×</button></header>
    {!account ? <div className="village-chat-auth">{token || checking ? <div className="chat-empty"><span>↻</span><strong>Restoring your KGM account.</strong><p>Your saved login remains on this device while KGM reconnects.</p></div> : <>
      <div className="chat-auth-tabs" role="tablist"><button type="button" className={authMode === "signin" ? "active" : ""} onClick={() => setAuthMode("signin")}>Sign in</button><button type="button" className={authMode === "register" ? "active" : ""} onClick={() => setAuthMode("register")}>Create account</button></div>
      <form className="village-chat-join" onSubmit={handleAuth}><span className="chat-kicker">KGM ACCOUNT · PUBLIC COMMUNITY</span><h2>{authMode === "register" ? "Join with care." : "Welcome back."}</h2><p>{authMode === "register" ? "Only your nickname and age group appear in chat. Never use your real full name, school name, phone number or address as a nickname." : "Sign in with your KGM account."}</p>
        <label>Email<input name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></label><label>Password<input name="password" type="password" required minLength={4} maxLength={64} autoComplete={authMode === "register" ? "new-password" : "current-password"} placeholder="Minimum 4 characters" /></label>
        {authMode === "register" ? <><label>Public nickname<input name="nickname" required minLength={2} maxLength={24} placeholder="e.g. CuriousKiran" autoComplete="nickname" /></label><fieldset><legend>Your age group</legend><div className="chat-role-options">{(["Child", "Teen", "Adult"] as ChatRole[]).map((role) => <label key={role}><input type="radio" name="role" value={role} required/><span>{role}</span></label>)}</div></fieldset><label className="chat-safe-check"><input type="checkbox" name="safe" required/><span>I understand this is a public room. I won’t share contact details, school details, addresses, passwords or other private information.</span></label></> : null}
        <button className="chat-join-button" type="submit" disabled={busy}>{busy ? "Please wait…" : authMode === "register" ? "Create KGM account →" : "Sign in →"}</button>{error ? <p className="chat-error">{error}</p> : null}
      </form></>}</div> : <>
      <div className="village-chat-safety"><span>🛡</span><p><strong>Public room.</strong> No phone numbers, addresses, school details, passwords or personal contact links. Report or mute anything uncomfortable.</p></div>
      <div className="village-chat-meta"><span><b>{account.nickname}</b> · {account.role}</span><span>{roleCounts.Child || 0} kids · {roleCounts.Teen || 0} teens · {roleCounts.Adult || 0} adults in recent visible chat</span><div className="village-chat-meta-actions"><button type="button" onClick={signOut}>Sign out</button></div></div>
      <div className="village-chat-messages" ref={listRef} aria-live="polite">{!visibleMessages.length && status === "live" ? <div className="chat-empty"><span>👋</span><strong>Start today’s village conversation.</strong><p>Ask about school, farming, science, sports, local events—or simply say hello.</p></div> : null}{visibleMessages.map((message) => <article className={message.mine ? "chat-message mine" : "chat-message"} key={message.id}><div className="chat-message-top"><span className={`role-dot ${message.role.toLowerCase()}`}/><strong>{message.nickname}</strong><em>{message.role}</em><time>{timeLabel(message.created_at)}</time></div><p>{message.text}</p><div className="chat-message-actions">{message.mine ? <button type="button" onClick={() => void deleteMessage(message)}>Delete</button> : <><button type="button" disabled={reported.has(message.id)} onClick={() => void reportMessage(message)}>{reported.has(message.id) ? "Reported ✓" : "Report"}</button><button type="button" onClick={() => mutePerson(message.nickname)}>Mute {message.nickname}</button></>}</div></article>)}</div>
      <form className="village-chat-compose" onSubmit={sendMessage}>{error ? <p className="chat-error">{error}</p> : null}<div><textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={280} rows={2} placeholder="Write something friendly and public…"/><button type="submit" disabled={sending || !draft.trim()}>{sending ? "…" : "Send"}</button></div><small>{draft.length}/280 · Treat every message as public.</small></form>
    </>}
  </div> : null}</>;
}
