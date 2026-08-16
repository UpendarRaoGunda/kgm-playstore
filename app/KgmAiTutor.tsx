"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

const API_BASE = (process.env.NEXT_PUBLIC_KGM_TUTOR_API || "https://bayesian-dosing-backend-full.onrender.com/public/kgm-tutor").replace(/\/$/, "");
const SESSION_KEY = "kgm-ai-tutor-v1";
const MAX_HISTORY = 10;
const MAX_TRANSCRIPT = 42;

const SUBJECTS = [
  ["auto", "✨", "Auto"],
  ["math", "π", "Maths"],
  ["science", "⚛", "Science"],
  ["coding", "</>", "Coding"],
  ["english", "Aa", "English"],
  ["general", "🌍", "General"],
  ["create", "✦", "Create"],
] as const;

const MODES = [
  ["explain", "Explain"],
  ["hint", "Hint"],
  ["quiz", "Quiz me"],
  ["challenge", "Challenge"],
  ["create", "Build"],
] as const;

const STARTERS = [
  { label: "Make it click", subject: "math", mode: "explain", prompt: "Why does dividing by a fraction sometimes make a number bigger? Explain it with an everyday example." },
  { label: "Debug with me", subject: "coding", mode: "hint", prompt: "I am learning Python. Show me how to think through a bug before giving the final fix, with a tiny example." },
  { label: "Quiz me", subject: "science", mode: "quiz", prompt: "Quiz me on the solar system. Ask one question at a time and adapt the difficulty from my answers." },
  { label: "Build something", subject: "create", mode: "create", prompt: "Give me a fun one-evening science or coding project I can build with things I probably already have at home." },
];

type ChatRole = "user" | "assistant";
type HistoryMessage = { role: ChatRole; content: string };
type TranscriptItem = {
  id: string;
  role: ChatRole;
  content: string;
  at: number;
  meta?: { thinking?: boolean; subject?: string; mode?: string; elapsedMs?: number; model?: string };
};

type Subject = (typeof SUBJECTS)[number][0];
type Mode = (typeof MODES)[number][0];
type Language = "auto" | "english" | "telugu" | "mix";
type Depth = "auto" | "quick" | "deep";

function uid(prefix = "msg") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseSse(buffer: string) {
  const blocks = buffer.split("\n\n");
  const remainder = blocks.pop() || "";
  const events: any[] = [];
  for (const block of blocks) {
    for (const line of block.split("\n")) {
      if (!line.startsWith("data:")) continue;
      try { events.push(JSON.parse(line.slice(5).trim())); } catch { /* ignore malformed frame */ }
    }
  }
  return { events, remainder };
}

function renderText(text: string) {
  const chunks = String(text || "").split(/(```[\s\S]*?```|`[^`]+`)/g).filter(Boolean);
  return chunks.map((chunk, index) => {
    if (chunk.startsWith("```") && chunk.endsWith("```")) {
      const inner = chunk.slice(3, -3).replace(/^\w+\n/, "");
      return <pre key={index}><code>{inner}</code></pre>;
    }
    if (chunk.startsWith("`") && chunk.endsWith("`")) return <code key={index}>{chunk.slice(1, -1)}</code>;
    return <span key={index}>{chunk}</span>;
  });
}

export default function KgmAiTutor() {
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState<"checking" | "online" | "offline">("checking");
  const [input, setInput] = useState("");
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [subject, setSubject] = useState<Subject>("auto");
  const [mode, setMode] = useState<Mode>("explain");
  const [language, setLanguage] = useState<Language>("auto");
  const [level, setLevel] = useState("9-10");
  const [depth, setDepth] = useState<Depth>("auto");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState("");
  const [copiedId, setCopiedId] = useState("");

  const historyRef = useRef<HistoryMessage[]>([]);
  const transcriptRef = useRef<TranscriptItem[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const subjectLabel = useMemo(() => SUBJECTS.find(([id]) => id === subject)?.[2] || "Auto", [subject]);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
      if (saved?.history && Array.isArray(saved.history)) historyRef.current = saved.history.slice(-MAX_HISTORY);
      if (saved?.transcript && Array.isArray(saved.transcript)) {
        transcriptRef.current = saved.transcript.slice(-MAX_TRANSCRIPT);
        setTranscript(transcriptRef.current);
      }
      if (saved?.subject && SUBJECTS.some(([id]) => id === saved.subject)) setSubject(saved.subject);
      if (saved?.mode && MODES.some(([id]) => id === saved.mode)) setMode(saved.mode);
      if (["auto", "english", "telugu", "mix"].includes(saved?.language)) setLanguage(saved.language);
      if (["auto", "quick", "deep"].includes(saved?.depth)) setDepth(saved.depth);
      if (typeof saved?.level === "string") setLevel(saved.level);
    } catch { /* fresh session */ }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        history: historyRef.current.slice(-MAX_HISTORY),
        transcript: transcriptRef.current.slice(-MAX_TRANSCRIPT),
        subject, mode, language, level, depth,
      }));
    } catch { /* storage is optional */ }
  }, [transcript, subject, mode, language, level, depth]);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const response = await fetch(`${API_BASE}/status`, { cache: "no-store" });
        const body = await response.json().catch(() => ({}));
        if (!cancelled) setOnline(response.ok && body.available ? "online" : "offline");
      } catch {
        if (!cancelled) setOnline("offline");
      }
    }
    check();
    const timer = window.setInterval(check, 45000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 120);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prior = document.body.style.overflow;
    const media = window.matchMedia("(max-width: 760px)");
    if (media.matches) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prior; };
  }, [open]);

  useEffect(() => {
    const el = listRef.current;
    if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [transcript, progress, sending]);

  function updateTranscript(next: TranscriptItem[] | ((items: TranscriptItem[]) => TranscriptItem[])) {
    setTranscript((items) => {
      const value = (typeof next === "function" ? next(items) : next).slice(-MAX_TRANSCRIPT);
      transcriptRef.current = value;
      return value;
    });
  }

  function clearChat() {
    controllerRef.current?.abort();
    historyRef.current = [];
    transcriptRef.current = [];
    setTranscript([]);
    setInput("");
    setProgress("");
    setSending(false);
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* optional */ }
  }

  function stop() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setSending(false);
    setProgress("Stopped — you can edit the question or try again.");
  }

  async function copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(""), 1100);
    } catch { /* no clipboard permission */ }
  }

  async function send(promptOverride?: string, settings?: { subject?: Subject; mode?: Mode }) {
    const text = String(promptOverride ?? input).trim();
    if (!text || sending) return;

    const activeSubject = settings?.subject || subject;
    const activeMode = settings?.mode || mode;
    if (settings?.subject) setSubject(settings.subject);
    if (settings?.mode) setMode(settings.mode);

    const userItem: TranscriptItem = { id: uid("u"), role: "user", content: text, at: Date.now(), meta: { subject: activeSubject, mode: activeMode } };
    const assistantId = uid("a");
    const assistantItem: TranscriptItem = { id: assistantId, role: "assistant", content: "", at: Date.now(), meta: { subject: activeSubject, mode: activeMode } };
    const nextHistory: HistoryMessage[] = [...historyRef.current, { role: "user", content: text }].slice(-MAX_HISTORY);

    updateTranscript((items) => [...items, userItem, assistantItem]);
    historyRef.current = nextHistory;
    setInput("");
    setSending(true);
    setProgress("Connecting to KGM AI…");

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const response = await fetch(`${API_BASE}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          messages: nextHistory,
          subject: activeSubject,
          mode: activeMode,
          language,
          level,
          depth,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || `KGM AI returned ${response.status}.`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      let finalMeta: TranscriptItem["meta"] = { subject: activeSubject, mode: activeMode };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSse(buffer);
        buffer = parsed.remainder;
        for (const event of parsed.events) {
          if (event.type === "progress") {
            setProgress(event.label || "Thinking with you…");
            if (typeof event.thinking === "boolean") finalMeta = { ...finalMeta, thinking: event.thinking };
          }
          if (event.type === "delta") {
            assistantText += String(event.delta || "");
            updateTranscript((items) => items.map((item) => item.id === assistantId ? { ...item, content: assistantText, meta: finalMeta } : item));
          }
          if (event.type === "done") {
            finalMeta = {
              ...finalMeta,
              thinking: Boolean(event.thinking),
              subject: event.subject || activeSubject,
              mode: event.mode || activeMode,
              elapsedMs: Number(event.elapsed_ms || 0),
              model: event.model || "Qwen3-8B",
            };
            updateTranscript((items) => items.map((item) => item.id === assistantId ? { ...item, meta: finalMeta } : item));
            setProgress("");
          }
          if (event.type === "error") throw new Error(event.detail || "KGM AI had a temporary problem.");
        }
      }

      if (!assistantText.trim()) throw new Error("KGM AI did not return an answer. Please try again.");
      historyRef.current = [...nextHistory, { role: "assistant", content: assistantText }].slice(-MAX_HISTORY);
      setOnline("online");
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      const message = String(error?.message || "KGM AI is temporarily unavailable. Please retry.");
      updateTranscript((items) => items.map((item) => item.id === assistantId ? { ...item, content: `Couldn’t finish that one 😵‍💫\n\n${message}` } : item));
      setProgress("");
      setOnline("offline");
    } finally {
      controllerRef.current = null;
      setSending(false);
    }
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  }

  return <>
    <button ref={launcherRef} type="button" className={`kgmAiLauncher ${open ? "open" : ""}`} aria-label={open ? "Close KGM AI Tutor" : "Open KGM AI Tutor"} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <span className="kgmAiLauncherGlow" aria-hidden="true" />
      <span className="kgmAiLauncherMark">K</span>
      <span className="kgmAiLauncherWords"><b>KGM AI</b><small>{online === "online" ? "online" : online === "checking" ? "checking" : "tap to retry"}</small></span>
      <i aria-hidden="true">{open ? "×" : "↗"}</i>
    </button>

    {open ? <div className="kgmAiLayer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && window.innerWidth <= 760) setOpen(false); }}>
      <section className="kgmAiPanel" role="dialog" aria-modal="true" aria-label="KGM AI learning tutor">
        <header className="kgmAiHeader">
          <div className="kgmAiIdentity">
            <span className="kgmAiAvatar"><b>K</b><i /></span>
            <div><span>KGM YOUTHVERSE</span><strong>KGM AI <em>BETA</em></strong><small>your learning buddy · Qwen3-8B</small></div>
          </div>
          <div className="kgmAiHeaderActions">
            <button type="button" onClick={clearChat} title="New chat">↺</button>
            <button type="button" onClick={() => { setOpen(false); launcherRef.current?.focus(); }} aria-label="Close KGM AI">×</button>
          </div>
        </header>

        <div className="kgmAiControlDeck">
          <div className="kgmAiSubjectRail" aria-label="Choose a subject">
            {SUBJECTS.map(([id, icon, label]) => <button type="button" key={id} className={subject === id ? "active" : ""} aria-pressed={subject === id} onClick={() => setSubject(id)}><i>{icon}</i><span>{label}</span></button>)}
          </div>
          <div className="kgmAiModeRail" aria-label="Choose a tutor mode">
            {MODES.map(([id, label]) => <button type="button" key={id} className={mode === id ? "active" : ""} aria-pressed={mode === id} onClick={() => setMode(id)}>{label}</button>)}
          </div>
          <div className="kgmAiSelectors">
            <label><span>Level</span><select value={level} onChange={(event) => setLevel(event.target.value)}><option value="6-8">Class 6–8</option><option value="9-10">Class 9–10</option><option value="11-12">Class 11–12</option><option value="college">College</option><option value="general">General</option></select></label>
            <label><span>Language</span><select value={language} onChange={(event) => setLanguage(event.target.value as Language)}><option value="auto">Auto</option><option value="english">English</option><option value="telugu">తెలుగు</option><option value="mix">తెలుగు + English</option></select></label>
            <div className="kgmAiDepth" role="group" aria-label="Reasoning depth"><button className={depth === "quick" ? "active" : ""} onClick={() => setDepth("quick")} type="button">⚡ Quick</button><button className={depth === "auto" ? "active" : ""} onClick={() => setDepth("auto")} type="button">Auto</button><button className={depth === "deep" ? "active" : ""} onClick={() => setDepth("deep")} type="button">🧠 Deep</button></div>
          </div>
        </div>

        <div ref={listRef} className="kgmAiConversation" aria-live="polite">
          {!transcript.length ? <div className="kgmAiWelcome">
            <div className="kgmAiWelcomeArt" aria-hidden="true"><span>π</span><span>{"{}"}</span><span>⚛</span><span>Aa</span></div>
            <span className="kgmAiKicker">ASK. TRY. BUILD. REPEAT.</span>
            <h2>School brain stuck?<br/><em>We got you.</em></h2>
            <p>Get an explanation, a tiny hint, a one-question-at-a-time quiz, a harder challenge, or turn an idea into something you can build.</p>
            <div className="kgmAiStarterGrid">{STARTERS.map((starter) => <button type="button" key={starter.label} onClick={() => send(starter.prompt, { subject: starter.subject as Subject, mode: starter.mode as Mode })}><span>{starter.label}</span><small>{starter.prompt}</small><i>↗</i></button>)}</div>
            <p className="kgmAiPrivacy">Keep personal info private. You never need to share your phone number, address, school name or passwords to learn here.</p>
          </div> : transcript.map((item) => item.role === "user" ? <article key={item.id} className="kgmAiMessage user"><div className="kgmAiBubble"><small>{item.meta?.subject || subjectLabel}</small><p>{item.content}</p></div></article> : <article key={item.id} className="kgmAiMessage assistant">
            <div className="kgmAiBotDot">K</div>
            <div className="kgmAiAnswer">
              <div className="kgmAiAnswerMeta"><span>KGM AI</span>{item.meta?.thinking !== undefined ? <i>{item.meta.thinking ? "🧠 deep" : "⚡ quick"}</i> : null}</div>
              <div className={`kgmAiAnswerText ${!item.content && sending ? "loading" : ""}`}>{item.content ? renderText(item.content) : <><span/><span/><span/></>}</div>
              {item.content ? <div className="kgmAiAnswerActions"><button type="button" onClick={() => copy(item.content, item.id)}>{copiedId === item.id ? "✓ copied" : "copy"}</button><button type="button" onClick={() => { setMode("challenge"); setInput("Give me a slightly harder challenge based on that answer, but do not reveal the solution immediately."); inputRef.current?.focus(); }}>level up ↗</button>{item.meta?.elapsedMs ? <span>{(item.meta.elapsedMs / 1000).toFixed(1)}s</span> : null}</div> : null}
            </div>
          </article>)}
          {progress ? <div className="kgmAiProgress"><i/><span>{progress}</span></div> : null}
        </div>

        <footer className="kgmAiComposerWrap">
          <div className="kgmAiNow"><span>{SUBJECTS.find(([id]) => id === subject)?.[1]} {subjectLabel}</span><b>·</b><span>{MODES.find(([id]) => id === mode)?.[1]}</span><b>·</b><span>{depth === "deep" ? "🧠 Deep" : depth === "quick" ? "⚡ Quick" : "Auto depth"}</span></div>
          <div className="kgmAiComposer">
            <textarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value.slice(0, 5000))} onKeyDown={onComposerKeyDown} rows={1} placeholder={mode === "hint" ? "Tell me where you’re stuck — I’ll hint, not spoil it…" : mode === "quiz" ? "What should I quiz you on?" : mode === "create" ? "What do you want to build?" : "Ask anything you’re learning…"} />
            {sending ? <button type="button" className="kgmAiSend stop" onClick={stop} aria-label="Stop KGM AI response">■</button> : <button type="button" className="kgmAiSend" onClick={() => send()} disabled={!input.trim()} aria-label="Send to KGM AI">↑</button>}
          </div>
          <div className="kgmAiComposerMeta"><span>Enter to send · Shift+Enter for a new line</span><strong><i className={online}/>{online === "online" ? "free · self-hosted" : online === "checking" ? "checking AI" : "AI reconnecting"}</strong></div>
        </footer>
      </section>
    </div> : null}
  </>;
}
