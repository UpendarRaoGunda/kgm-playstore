"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type ChatRole = "Child" | "Teen" | "Adult";
type ChatProfile = { nickname: string; role: ChatRole; clientId: string };
type ChatMessage = { id: string; nickname: string; role: ChatRole; text: string; created_at: string; mine: boolean };

const CHAT_API = (process.env.NEXT_PUBLIC_KGM_CHAT_API || "https://mana-koratlagudem.onrender.com").replace(/\/$/, "");
const PROFILE_KEY = "kgm-village-chat-profile-v1";

function createClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `kgm-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function timeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "now";
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(date);
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Village Chat is temporarily unavailable");
  return data as T;
}

export default function VillageChat() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<ChatProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) setProfile(JSON.parse(raw));
    } catch {
      localStorage.removeItem(PROFILE_KEY);
    }
  }, []);

  const lastId = messages.length ? messages[messages.length - 1].id : "";

  useEffect(() => {
    if (!open || !profile) return;
    let stopped = false;
    const load = async (incremental: boolean) => {
      try {
        const cursor = incremental && lastId ? `&after=${encodeURIComponent(lastId)}` : "";
        const data = await jsonRequest<{ items: ChatMessage[] }>(`${CHAT_API}/api/kgm-chat/messages?client_id=${encodeURIComponent(profile.clientId)}&limit=100${cursor}`);
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
  }, [open, profile, lastId]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }));
  }, [messages.length, open]);

  const roleCounts = useMemo(() => messages.slice(-40).reduce<Record<string, number>>((acc, item) => {
    acc[item.role] = (acc[item.role] || 0) + 1;
    return acc;
  }, {}), [messages]);

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nickname = String(data.get("nickname") || "").trim();
    const role = String(data.get("role") || "Adult") as ChatRole;
    const agreed = data.get("safe") === "on";
    if (!nickname || !agreed) {
      setError("Choose a nickname and accept the public-room safety rule.");
      return;
    }
    const next: ChatProfile = { nickname: nickname.slice(0, 24), role, clientId: profile?.clientId || createClientId() };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    setProfile(next);
    setError("");
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || !draft.trim() || sending) return;
    setSending(true);
    try {
      const message = await jsonRequest<ChatMessage>(`${CHAT_API}/api/kgm-chat/messages`, {
        method: "POST",
        body: JSON.stringify({ nickname: profile.nickname, role: profile.role, text: draft.trim(), client_id: profile.clientId }),
      });
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
    if (!profile || reported.has(message.id)) return;
    try {
      const result = await jsonRequest<{ hidden?: boolean }>(`${CHAT_API}/api/kgm-chat/messages/${message.id}/report`, {
        method: "POST",
        body: JSON.stringify({ client_id: profile.clientId, reason: "Reported from KGM Village Chat" }),
      });
      setReported((current) => new Set(current).add(message.id));
      if (result.hidden) setMessages((current) => current.filter((item) => item.id !== message.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not report this message");
    }
  }

  async function deleteMessage(message: ChatMessage) {
    if (!profile || !message.mine) return;
    try {
      await jsonRequest(`${CHAT_API}/api/kgm-chat/messages/${message.id}/delete`, {
        method: "POST",
        body: JSON.stringify({ client_id: profile.clientId }),
      });
      setMessages((current) => current.filter((item) => item.id !== message.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this message");
    }
  }

  return (
    <>
      <button className="village-chat-launcher" onClick={() => setOpen(true)} aria-label="Open Koratlagudem Village Chat">
        <span className="village-chat-pulse" aria-hidden="true" />
        <span className="village-chat-icon" aria-hidden="true">☺</span>
        <span><strong>Village Chat</strong><small>మన ఊరి మాటలు</small></span>
      </button>

      {open && <div className="village-chat-shell" role="dialog" aria-modal="true" aria-label="Koratlagudem Village Chat">
        <header className="village-chat-head">
          <div><span className={`chat-status ${status}`} /><div><strong>KGM Village Chat</strong><small>{status === "live" ? "Live public room · Koratlagudem" : status === "offline" ? "Trying to reconnect…" : "Connecting…"}</small></div></div>
          <button onClick={() => setOpen(false)} aria-label="Close chat">×</button>
        </header>

        {!profile ? <form className="village-chat-join" onSubmit={saveProfile}>
          <span className="chat-kicker">WELCOME · స్వాగతం</span>
          <h2>Talk to our village.</h2>
          <p>This is one shared public room for children, teens and adults. Use a nickname—never your phone number, email, address or school details.</p>
          <label>Nickname<input name="nickname" required maxLength={24} placeholder="e.g. CuriousKiran" autoComplete="off" /></label>
          <fieldset><legend>I am joining as</legend><div className="chat-role-options">{(["Child", "Teen", "Adult"] as ChatRole[]).map((role) => <label key={role}><input type="radio" name="role" value={role} defaultChecked={role === "Adult"} /><span>{role}</span></label>)}</div></fieldset>
          <label className="chat-safe-check"><input type="checkbox" name="safe" required /><span>I’ll keep the room friendly and won’t share personal contact information.</span></label>
          <button className="chat-join-button" type="submit">Enter Village Chat →</button>
          {error && <p className="chat-error">{error}</p>}
        </form> : <>
          <div className="village-chat-safety"><span>🛡</span><p><strong>Public village room.</strong> No DMs, photos, links, phone numbers or email addresses. Report anything uncomfortable.</p></div>
          <div className="village-chat-meta"><span><b>{profile.nickname}</b> · {profile.role}</span><span>{roleCounts.Child || 0} kids · {roleCounts.Teen || 0} teens · {roleCounts.Adult || 0} adults in recent chat</span><button onClick={() => { localStorage.removeItem(PROFILE_KEY); setProfile(null); setMessages([]); }}>Change name</button></div>
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
