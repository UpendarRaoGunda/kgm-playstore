"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";

const API_BASE = (process.env.NEXT_PUBLIC_KGM_TUTOR_API || "https://bayesian-dosing-backend-full.onrender.com/public/kgm-tutor").replace(/\/$/, "");
const SESSION_KEY = "kgm-ai-tutor-v2";
const MAX_HISTORY = 10;
const MAX_TRANSCRIPT = 40;

const MODES = [
  ["explain", "Explain", "Make this clear"],
  ["hint", "Hint", "Help without spoiling"],
  ["quiz", "Quiz", "Test what I know"],
  ["create", "Build", "Turn an idea into something"],
] as const;

const STARTERS = [
  ["π", "Make maths click", "Why does dividing by a fraction sometimes make a number bigger? Explain it with an everyday example.", "math", "explain"],
  ["⚛", "Quiz my science", "Quiz me on the solar system. Ask one question at a time and adapt the difficulty from my answers.", "science", "quiz"],
  ["</>", "Debug with me", "I am learning Python. Help me think through a bug before giving the final fix, with a tiny example.", "coding", "hint"],
  ["✦", "Build something", "Give me a fun one-evening science or coding project I can build with things I probably already have at home.", "create", "create"],
] as const;

type ChatRole = "user" | "assistant";
type HistoryMessage = { role: ChatRole; content: string };
type TranscriptItem = { id: string; role: ChatRole; content: string; meta?: { thinking?: boolean; elapsedMs?: number; model?: string } };
type Mode = (typeof MODES)[number][0];
type Language = "auto" | "english" | "telugu" | "mix";
type Depth = "auto" | "quick" | "deep";
type Subject = "auto" | "math" | "science" | "coding" | "english" | "general" | "create";

function uid(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
function parseSse(buffer: string) {
  const blocks = buffer.split("\n\n");
  const remainder = blocks.pop() || "";
  const events: any[] = [];
  for (const block of blocks) for (const line of block.split("\n")) if (line.startsWith("data:")) try { events.push(JSON.parse(line.slice(5).trim())); } catch { /* ignore malformed frames */ }
  return { events, remainder };
}
function inferSubject(text: string): Subject {
  const value = text.toLowerCase();
  if (/code|python|javascript|bug|program|html|css|react/.test(value)) return "coding";
  if (/math|algebra|fraction|equation|geometry|calculus|number/.test(value)) return "math";
  if (/physics|chemistry|biology|science|planet|space|atom|cell/.test(value)) return "science";
  if (/grammar|english|essay|sentence|word|vocabulary/.test(value)) return "english";
  if (/build|make|create|project|idea/.test(value)) return "create";
  return "auto";
}

export default function KgmAiTutor() {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [online, setOnline] = useState<"checking" | "online" | "offline">("checking");
  const [input, setInput] = useState("");
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [mode, setMode] = useState<Mode>("explain");
  const [language, setLanguage] = useState<Language>("auto");
  const [level, setLevel] = useState("9-10");
  const [depth, setDepth] = useState<Depth>("auto");
  const [subjectOverride, setSubjectOverride] = useState<Subject>("auto");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const historyRef = useRef<HistoryMessage[]>([]);
  const transcriptRef = useRef<TranscriptItem[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
      if (Array.isArray(saved?.history)) historyRef.current = saved.history.slice(-MAX_HISTORY);
      if (Array.isArray(saved?.transcript)) { transcriptRef.current = saved.transcript.slice(-MAX_TRANSCRIPT); setTranscript(transcriptRef.current); }
      if (MODES.some(([id]) => id === saved?.mode)) setMode(saved.mode);
      if (["auto", "english", "telugu", "mix"].includes(saved?.language)) setLanguage(saved.language);
      if (["auto", "quick", "deep"].includes(saved?.depth)) setDepth(saved.depth);
      if (typeof saved?.level === "string") setLevel(saved.level);
    } catch { /* fresh session */ }
  }, []);

  useEffect(() => {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ history: historyRef.current.slice(-MAX_HISTORY), transcript: transcriptRef.current.slice(-MAX_TRANSCRIPT), mode, language, level, depth })); } catch { /* optional */ }
  }, [transcript, mode, language, level, depth]);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const response = await fetch(`${API_BASE}/status`, { cache: "no-store" });
        const body = await response.json().catch(() => ({}));
        if (!cancelled) setOnline(response.ok && body.available ? "online" : "offline");
      } catch { if (!cancelled) setOnline("offline"); }
    };
    void check();
    const timer = window.setInterval(check, 45000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const openAi = () => setOpen(true);
    const villageState = (event: Event) => { if ((event as CustomEvent<{ open?: boolean }>).detail?.open) setOpen(false); };
    window.addEventListener("kgm-open-ai-tutor", openAi);
    window.addEventListener("kgm-village-chat-state", villageState as EventListener);
    return () => { window.removeEventListener("kgm-open-ai-tutor", openAi); window.removeEventListener("kgm-village-chat-state", villageState as EventListener); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const prior = document.body.style.overflow;
    document.documentElement.classList.add("kgm-ai-open");
    if (window.innerWidth <= 760) document.body.style.overflow = "hidden";
    window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 100);
    const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.documentElement.classList.remove("kgm-ai-open"); document.body.style.overflow = prior; window.removeEventListener("keydown", onKey); };
  }, [open]);

  useEffect(() => { if (listRef.current) requestAnimationFrame(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }); }, [transcript, progress]);

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

  function stop() { controllerRef.current?.abort(); controllerRef.current = null; setSending(false); setProgress("Stopped — change the question or try again."); }
  async function copy(text: string, id: string) { try { await navigator.clipboard.writeText(text); setCopiedId(id); window.setTimeout(() => setCopiedId(""), 1200); } catch { /* no permission */ } }

  async function send(promptOverride?: string, overrides?: { mode?: Mode; subject?: Subject }) {
    const text = String(promptOverride ?? input).trim();
    if (!text || sending) return;
    const activeMode = overrides?.mode || mode;
    const activeSubject = subjectOverride !== "auto" ? subjectOverride : (overrides?.subject || inferSubject(text));
    if (overrides?.mode) setMode(overrides.mode);
    const userItem: TranscriptItem = { id: uid("u"), role: "user", content: text };
    const assistantId = uid("a");
    const assistantItem: TranscriptItem = { id: assistantId, role: "assistant", content: "" };
    const nextHistory: HistoryMessage[] = [...historyRef.current, { role: "user", content: text }].slice(-MAX_HISTORY);
    updateTranscript((items) => [...items, userItem, assistantItem]);
    historyRef.current = nextHistory;
    setInput("");
    setSending(true);
    setProgress("Thinking with you…");
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const response = await fetch(`${API_BASE}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ messages: nextHistory, subject: activeSubject, mode: activeMode, language, level, depth }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error((await response.json().catch(() => ({})))?.detail || `KGM AI returned ${response.status}.`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let answer = "";
      let meta: TranscriptItem["meta"] = {};
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSse(buffer); buffer = parsed.remainder;
        for (const event of parsed.events) {
          if (event.type === "progress") setProgress(event.label || "Thinking with you…");
          if (event.type === "delta") { answer += String(event.delta || ""); updateTranscript((items) => items.map((item) => item.id === assistantId ? { ...item, content: answer, meta } : item)); }
          if (event.type === "done") { meta = { thinking: Boolean(event.thinking), elapsedMs: Number(event.elapsed_ms || 0), model: event.model || undefined }; updateTranscript((items) => items.map((item) => item.id === assistantId ? { ...item, meta } : item)); setProgress(""); }
          if (event.type === "error") throw new Error(event.detail || "KGM AI had a temporary problem.");
        }
      }
      if (!answer.trim()) throw new Error("KGM AI did not return an answer. Please try again.");
      historyRef.current = [...nextHistory, { role: "assistant", content: answer }].slice(-MAX_HISTORY);
      setOnline("online");
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      updateTranscript((items) => items.map((item) => item.id === assistantId ? { ...item, content: `Couldn’t finish that one.\n\n${String(error?.message || "KGM AI is temporarily unavailable.")}` } : item));
      setProgress("");
      setOnline("offline");
    } finally { controllerRef.current = null; setSending(false); }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }

  return open ? <div className="kgmAiV3Layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && window.innerWidth <= 760) setOpen(false); }}>
    <section className="kgmAiV3" role="dialog" aria-modal="true" aria-label="KGM AI learning buddy">
      <header>
        <div className="kgmAiV3Identity"><span>K</span><div><small>KORATLAGUDEM YOUTHVERSE</small><strong>KGM AI <em>BETA</em></strong><p>Free learning buddy · English + తెలుగు</p></div></div>
        <div className="kgmAiV3HeaderActions"><button type="button" onClick={clearChat} aria-label="Start new KGM AI chat">↺</button><button type="button" onClick={() => setOpen(false)} aria-label="Close KGM AI">×</button></div>
      </header>

      <div className="kgmAiV3Modes" aria-label="Choose learning style">
        {MODES.map(([id, label, help]) => <button key={id} type="button" className={mode === id ? "active" : ""} onClick={() => setMode(id)}><strong>{label}</strong><small>{help}</small></button>)}
        <button type="button" className={`settings ${settingsOpen ? "active" : ""}`} onClick={() => setSettingsOpen((value) => !value)} aria-expanded={settingsOpen}>⚙<small>Tune</small></button>
      </div>

      {settingsOpen ? <div className="kgmAiV3Settings">
        <label><span>Class / level</span><select value={level} onChange={(event) => setLevel(event.target.value)}><option value="6-8">Class 6–8</option><option value="9-10">Class 9–10</option><option value="11-12">Class 11–12</option><option value="college">College</option><option value="general">General</option></select></label>
        <label><span>Language</span><select value={language} onChange={(event) => setLanguage(event.target.value as Language)}><option value="auto">Auto</option><option value="english">English</option><option value="telugu">తెలుగు</option><option value="mix">తెలుగు + English</option></select></label>
        <label><span>Topic</span><select value={subjectOverride} onChange={(event) => setSubjectOverride(event.target.value as Subject)}><option value="auto">Auto-detect</option><option value="math">Maths</option><option value="science">Science</option><option value="coding">Coding</option><option value="english">English</option><option value="general">General</option><option value="create">Create</option></select></label>
        <div className="kgmAiV3Depth"><span>Answer depth</span><div>{(["quick", "auto", "deep"] as Depth[]).map((item) => <button type="button" className={depth === item ? "active" : ""} onClick={() => setDepth(item)} key={item}>{item === "quick" ? "⚡ Quick" : item === "deep" ? "🧠 Deep" : "Auto"}</button>)}</div></div>
      </div> : null}

      <div className="kgmAiV3Conversation" ref={listRef} aria-live="polite">
        {!transcript.length ? <div className="kgmAiV3Welcome"><span className="spark">✦</span><h2>What do you want<br/><em>to understand?</em></h2><p>Ask a question. Get a hint instead of a spoiler. Quiz yourself. Or turn an idea into something you can build.</p><div>{STARTERS.map(([icon, label, prompt, subject, starterMode]) => <button type="button" key={label} onClick={() => void send(prompt, { subject: subject as Subject, mode: starterMode as Mode })}><span>{icon}</span><strong>{label}</strong><b>→</b></button>)}</div><aside><span>🔒</span><p><strong>Learn without oversharing.</strong> Don’t post your phone number, address, school name or passwords.</p></aside></div>
        : transcript.map((item) => item.role === "user" ? <article className="user" key={item.id}><p>{item.content}</p></article> : <article className="assistant" key={item.id}><span>K</span><div><small>KGM AI</small><p>{item.content || (sending ? "…" : "")}</p>{item.content ? <footer><button type="button" onClick={() => void copy(item.content, item.id)}>{copiedId === item.id ? "✓ copied" : "copy"}</button><button type="button" onClick={() => { setMode("quiz"); setInput("Quiz me on that answer, one question at a time."); inputRef.current?.focus(); }}>quiz me</button>{item.meta?.elapsedMs ? <time>{(item.meta.elapsedMs / 1000).toFixed(1)}s</time> : null}<span className="kgmAiTechnical" title={item.meta?.model ? `Model: ${item.meta.model}` : "KGM AI technical details"}>ⓘ</span></footer> : null}</div></article>)}
        {progress ? <div className="kgmAiV3Progress"><i/><span>{progress}</span></div> : null}
      </div>

      <div className="kgmAiV3ComposerWrap">
        <div className="kgmAiV3Composer"><textarea ref={inputRef} rows={1} value={input} onChange={(event) => setInput(event.target.value.slice(0, 5000))} onKeyDown={onKeyDown} placeholder={mode === "hint" ? "Where are you stuck? I’ll hint, not spoil…" : mode === "quiz" ? "What should I quiz you on?" : mode === "create" ? "What do you want to build?" : "Ask anything you’re learning…"} />{sending ? <button type="button" className="stop" onClick={stop} aria-label="Stop response">■</button> : <button type="button" onClick={() => void send()} disabled={!input.trim()} aria-label="Send to KGM AI">↑</button>}</div>
        <div className="kgmAiV3Meta"><span>Enter to send · Shift+Enter for new line</span><strong><i className={online}/>{online === "online" ? "online" : online === "checking" ? "checking" : "reconnecting"}</strong></div>
      </div>
    </section>
  </div> : null;
}
