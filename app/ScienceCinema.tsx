"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Movie = {
  id: string;
  title: string;
  description: string;
  category: string;
  source: "youtube" | "youtube_playlist" | "render";
  youtube_id?: string | null;
  youtube_playlist_id?: string | null;
  channel?: string;
  age_rating?: string;
  duration_label?: string;
  language?: string;
  topics?: string[];
  learn?: string[];
  attribution?: string;
  source_page?: string;
  featured?: boolean;
  like_count?: number;
  download_allowed?: boolean;
  stream_url?: string;
  download_url?: string;
};

type Progress = { seconds: number; duration: number; completed: boolean; updated_at?: string };
type Playlist = { id: string; name: string; movie_ids: string[] };
type MeState = { liked_ids: string[]; progress: Record<string, Progress>; playlists: Playlist[]; can_curate: boolean };

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const API = (process.env.NEXT_PUBLIC_KGM_CHAT_API || "https://mana-koratlagudem.onrender.com").replace(/\/$/, "");
const TOKEN_KEY = "kgm-village-chat-token-v2";
let ytPromise: Promise<any> | null = null;

function apiUrl(path?: string) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API}${path.startsWith("/") ? path : `/${path}`}`;
}

function loadYouTubeApi() {
  if (typeof window === "undefined") return Promise.reject(new Error("YouTube unavailable"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytPromise) return ytPromise;
  ytPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
  });
  return ytPromise;
}

async function requestJson<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const headers = new Headers(init?.headers || {});
  if (!(init?.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(apiUrl(path), { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Science Cinema is temporarily unavailable");
  return data as T;
}

function formatTime(seconds = 0) {
  const safe = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : `${minutes}:${String(secs).padStart(2, "0")}`;
}

function parseYouTubeInput(value: string) {
  const raw = value.trim();
  let videoId = "";
  let playlistId = "";
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://youtube.com/watch?v=${raw}`);
    if (url.hostname.includes("youtu.be")) videoId = url.pathname.replace(/^\//, "").split("/")[0];
    else if (url.pathname.startsWith("/embed/")) videoId = url.pathname.split("/")[2] || "";
    else videoId = url.searchParams.get("v") || "";
    playlistId = url.searchParams.get("list") || "";
  } catch {
    videoId = raw;
  }
  return { videoId, playlistId };
}

function YouTubePlayer({ movie, initialSeconds, onProgress }: { movie: Movie; initialSeconds: number; onProgress: (seconds: number, duration: number) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!movie.youtube_id || !hostRef.current) return;
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current) return;
      playerRef.current = new YT.Player(hostRef.current, {
        videoId: movie.youtube_id,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, origin: window.location.origin, list: movie.youtube_playlist_id || undefined },
        events: {
          onReady: (event: any) => {
            if (initialSeconds > 3) event.target.seekTo(initialSeconds, true);
          },
          onStateChange: (event: any) => {
            const save = () => {
              try { onProgress(event.target.getCurrentTime() || 0, event.target.getDuration() || 0); } catch { /* player disposed */ }
            };
            if (event.data === YT.PlayerState.PLAYING) {
              if (timerRef.current) window.clearInterval(timerRef.current);
              timerRef.current = window.setInterval(save, 12000);
            } else {
              if (timerRef.current) window.clearInterval(timerRef.current);
              timerRef.current = null;
              if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) save();
            }
          },
        },
      });
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      try { playerRef.current?.destroy?.(); } catch { /* noop */ }
    };
  }, [movie.id, movie.youtube_id, movie.youtube_playlist_id, initialSeconds, onProgress]);

  return <div className="kgm-cinema-youtube" ref={hostRef} />;
}

export default function ScienceCinema() {
  const [open, setOpen] = useState(false);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<Movie | null>(null);
  const [me, setMe] = useState<MeState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [curateOpen, setCurateOpen] = useState(false);
  const [curateTab, setCurateTab] = useState<"youtube" | "render">("youtube");
  const [curateBusy, setCurateBusy] = useState(false);
  const renderSaveRef = useRef(0);
  const toastTimer = useRef<number | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) || "" : "";

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3200);
  }

  async function loadMovies() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "120" });
      if (category !== "All") params.set("category", category);
      if (search.trim()) params.set("q", search.trim());
      const data = await requestJson<{ items: Movie[]; categories: string[] }>(`/api/kgm-cinema/movies?${params}`);
      setMovies(data.items || []);
      setCategories(data.categories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Science Cinema");
    } finally {
      setLoading(false);
    }
  }

  async function loadMe() {
    const current = localStorage.getItem(TOKEN_KEY) || "";
    if (!current) { setMe(null); return; }
    try {
      setMe(await requestJson<MeState>("/api/kgm-cinema/me", undefined, current));
    } catch {
      setMe(null);
    }
  }

  useEffect(() => {
    const openCinema = () => setOpen(true);
    window.addEventListener("kgm-open-cinema", openCinema);
    return () => window.removeEventListener("kgm-open-cinema", openCinema);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.classList.add("kgm-cinema-is-open");
    loadMovies();
    loadMe();
    return () => {
      document.body.style.overflow = previous;
      document.documentElement.classList.remove("kgm-cinema-is-open");
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => loadMovies(), 180);
    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, search]);

  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current); }, []);

  const featured = useMemo(() => movies.find((movie) => movie.featured) || movies[0] || null, [movies]);
  const continueMovies = useMemo(() => {
    if (!me) return [];
    return movies.filter((movie) => {
      const progress = me.progress[movie.id];
      return progress && progress.seconds > 5 && !progress.completed;
    }).slice(0, 8);
  }, [me, movies]);
  const savedIds = useMemo(() => new Set(me?.playlists.flatMap((playlist) => playlist.movie_ids) || []), [me]);

  function requireAccount() {
    if (localStorage.getItem(TOKEN_KEY)) return true;
    showToast("Sign in to save likes, progress and playlists.");
    (document.querySelector(".kgm-account-nav-link") as HTMLElement | null)?.click();
    return false;
  }

  async function saveProgress(movieId: string, seconds: number, duration: number) {
    const current = localStorage.getItem(TOKEN_KEY) || "";
    if (!current || !Number.isFinite(seconds)) return;
    try {
      await requestJson(`/api/kgm-cinema/movies/${encodeURIComponent(movieId)}/progress`, {
        method: "PUT",
        body: JSON.stringify({ seconds, duration }),
      }, current);
      setMe((state) => state ? {
        ...state,
        progress: { ...state.progress, [movieId]: { seconds, duration, completed: duration > 0 && seconds >= Math.max(duration * .9, duration - 30) } },
      } : state);
    } catch { /* progress is best effort */ }
  }

  async function toggleLike(movie: Movie) {
    if (!requireAccount()) return;
    const current = localStorage.getItem(TOKEN_KEY) || "";
    try {
      const data = await requestJson<{ liked: boolean; like_count: number }>(`/api/kgm-cinema/movies/${encodeURIComponent(movie.id)}/like`, { method: "POST" }, current);
      setMe((state) => state ? { ...state, liked_ids: data.liked ? [...new Set([...state.liked_ids, movie.id])] : state.liked_ids.filter((id) => id !== movie.id) } : state);
      setMovies((items) => items.map((item) => item.id === movie.id ? { ...item, like_count: data.like_count } : item));
      if (active?.id === movie.id) setActive((item) => item ? { ...item, like_count: data.like_count } : item);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update like");
    }
  }

  async function toggleMyList(movie: Movie) {
    if (!requireAccount()) return;
    const current = localStorage.getItem(TOKEN_KEY) || "";
    try {
      let playlist = me?.playlists[0];
      if (!playlist) {
        playlist = await requestJson<Playlist>("/api/kgm-cinema/playlists", { method: "POST", body: JSON.stringify({ name: "My STEM List" }) }, current);
      }
      const data = await requestJson<{ added: boolean; movie_ids: string[] }>(`/api/kgm-cinema/playlists/${playlist.id}/movies/${encodeURIComponent(movie.id)}`, { method: "POST" }, current);
      const nextPlaylist = { ...playlist, movie_ids: data.movie_ids };
      setMe((state) => state ? { ...state, playlists: [nextPlaylist, ...state.playlists.filter((item) => item.id !== nextPlaylist.id)] } : { liked_ids: [], progress: {}, playlists: [nextPlaylist], can_curate: false });
      showToast(data.added ? "Added to My STEM List ✓" : "Removed from My STEM List");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update playlist");
    }
  }

  function openMovie(movie: Movie) {
    setActive(movie);
    renderSaveRef.current = 0;
    const current = localStorage.getItem(TOKEN_KEY) || "";
    if (current && !me?.progress[movie.id]) saveProgress(movie.id, 1, 0);
  }

  function closeCinema() {
    setActive(null);
    setCurateOpen(false);
    setOpen(false);
  }

  async function submitYoutube(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (curateBusy) return;
    const current = localStorage.getItem(TOKEN_KEY) || "";
    const form = event.currentTarget;
    const data = new FormData(form);
    const parsed = parseYouTubeInput(String(data.get("youtube") || ""));
    if (!parsed.videoId && !parsed.playlistId) { showToast("Paste a YouTube video or playlist URL."); return; }
    setCurateBusy(true);
    try {
      await requestJson("/api/kgm-cinema/admin/youtube", {
        method: "POST",
        body: JSON.stringify({
          title: String(data.get("title") || ""),
          description: String(data.get("description") || ""),
          category: String(data.get("category") || "Space"),
          youtube_id: parsed.videoId || null,
          youtube_playlist_id: parsed.playlistId || null,
          channel: String(data.get("channel") || ""),
          age_rating: String(data.get("age_rating") || "All ages"),
          duration_label: String(data.get("duration_label") || ""),
          language: String(data.get("language") || "English"),
          attribution: String(data.get("attribution") || ""),
          source_page: String(data.get("source_page") || ""),
          topics: String(data.get("topics") || "").split(",").map((value) => value.trim()).filter(Boolean),
          learn: String(data.get("learn") || "").split("\n").map((value) => value.trim()).filter(Boolean),
          stem_confirmed: data.get("stem_confirmed") === "on",
          embed_confirmed: data.get("embed_confirmed") === "on",
        }),
      }, current);
      form.reset();
      setCurateOpen(false);
      await loadMovies();
      showToast("YouTube STEM film added ✓");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not add film");
    } finally {
      setCurateBusy(false);
    }
  }

  async function submitRenderUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (curateBusy) return;
    const current = localStorage.getItem(TOKEN_KEY) || "";
    const form = event.currentTarget;
    const data = new FormData(form);
    setCurateBusy(true);
    try {
      await requestJson("/api/kgm-cinema/admin/upload", { method: "POST", body: data }, current);
      form.reset();
      setCurateOpen(false);
      await loadMovies();
      showToast("KGM-hosted STEM movie uploaded ✓");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not upload movie");
    } finally {
      setCurateBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="kgm-cinema-backdrop" role="dialog" aria-modal="true" aria-label="KGM Science Cinema">
      <div className="kgm-cinema-shell">
        <header className="kgm-cinema-topbar">
          <button className="kgm-cinema-brand" type="button" onClick={() => { setActive(null); document.querySelector(".kgm-cinema-content")?.scrollTo({ top: 0, behavior: "smooth" }); }}>
            <span>◉</span><div><strong>KGM SCIENCE CINEMA</strong><small>STEM ONLY · FREE KNOWLEDGE</small></div>
          </button>
          <nav>
            <button onClick={() => setCategory("All")} className={category === "All" ? "active" : ""}>Discover</button>
            <button onClick={() => setCategory("Space")}>Space</button>
            <button onClick={() => setCategory("Physics")}>Physics</button>
            <button onClick={() => setCategory("Biology")}>Life</button>
          </nav>
          <div className="kgm-cinema-top-actions">
            {me?.can_curate && <button className="kgm-cinema-curate" onClick={() => setCurateOpen(true)}>＋ Curate</button>}
            <button className="kgm-cinema-close" onClick={closeCinema} aria-label="Close Science Cinema">×</button>
          </div>
        </header>

        <div className="kgm-cinema-content">
          {featured && <section className="kgm-cinema-hero">
            <div className="kgm-cinema-hero-art" style={featured.youtube_id ? { backgroundImage: `linear-gradient(90deg,rgba(4,5,9,.96) 0%,rgba(4,5,9,.68) 48%,rgba(4,5,9,.1)),url(https://i.ytimg.com/vi/${featured.youtube_id}/maxresdefault.jpg)` } : undefined} />
            <div className="kgm-cinema-hero-copy">
              <span className="kgm-cinema-live-kicker">KGM° FEATURED SCIENCE</span>
              <h1>{featured.title}</h1>
              <p>{featured.description}</p>
              <div className="kgm-cinema-meta"><span>{featured.category}</span><span>{featured.age_rating || "All ages"}</span><span>{featured.duration_label || "STEM film"}</span><span>{featured.language || "English"}</span></div>
              <div className="kgm-cinema-hero-actions"><button className="primary" onClick={() => openMovie(featured)}>▶ Watch inside KGM</button><button onClick={() => toggleMyList(featured)}>{savedIds.has(featured.id) ? "✓ In My List" : "＋ My List"}</button></div>
              <small>{featured.source.startsWith("youtube") ? "YouTube is played through the official embedded player. KGM does not provide YouTube downloads." : "Hosted by KGM on Render. Download appears only when redistribution rights permit it."}</small>
            </div>
          </section>}

          <section className="kgm-cinema-controls">
            <div className="kgm-cinema-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search black holes, DNA, engineering…" /></div>
            <div className="kgm-cinema-categories">
              {["All", ...categories].map((item) => <button key={item} onClick={() => setCategory(item)} className={category === item ? "active" : ""}>{item}</button>)}
            </div>
          </section>

          {continueMovies.length > 0 && <section className="kgm-cinema-row-section">
            <div className="kgm-cinema-section-head"><div><span>CONTINUE WATCHING</span><h2>Pick up where you left off.</h2></div></div>
            <div className="kgm-cinema-horizontal">
              {continueMovies.map((movie) => <MovieCard key={`continue-${movie.id}`} movie={movie} progress={me?.progress[movie.id]} liked={me?.liked_ids.includes(movie.id) || false} saved={savedIds.has(movie.id)} onWatch={openMovie} onLike={toggleLike} onSave={toggleMyList} compact />)}
            </div>
          </section>}

          <section className="kgm-cinema-row-section">
            <div className="kgm-cinema-section-head"><div><span>{category === "All" ? "STEM LIBRARY" : category.toUpperCase()}</span><h2>{loading ? "Loading the science shelf…" : `${movies.length} ways to get curious.`}</h2></div><span className="kgm-cinema-trust">🛡 STEM-only curation</span></div>
            {error && <div className="kgm-cinema-error">{error}</div>}
            {!loading && !movies.length ? <div className="kgm-cinema-empty"><span>🔬</span><strong>No films in this filter yet.</strong><p>Try another STEM topic.</p></div> : <div className="kgm-cinema-grid">
              {movies.map((movie) => <MovieCard key={movie.id} movie={movie} progress={me?.progress[movie.id]} liked={me?.liked_ids.includes(movie.id) || false} saved={savedIds.has(movie.id)} onWatch={openMovie} onLike={toggleLike} onSave={toggleMyList} />)}
            </div>}
          </section>

          <section className="kgm-cinema-principles">
            <div><span>01</span><strong>STEM only.</strong><p>Space, physics, life, Earth, medicine, engineering, technology and mathematics.</p></div>
            <div><span>02</span><strong>Watch legally.</strong><p>Official embeds or KGM-hosted films with public-domain, Creative Commons, NASA or explicit redistribution rights.</p></div>
            <div><span>03</span><strong>Learn, don’t just scroll.</strong><p>Every film is paired with concepts, questions and a reason to stay curious.</p></div>
          </section>
        </div>
      </div>

      {active && <div className="kgm-cinema-player-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) setActive(null); }}>
        <div className="kgm-cinema-player-modal">
          <header><div><span>{active.category} · {active.source === "render" ? "KGM STREAM" : "YOUTUBE"}</span><h2>{active.title}</h2></div><button onClick={() => setActive(null)} aria-label="Close movie">×</button></header>
          <div className="kgm-cinema-player-grid">
            <div className="kgm-cinema-screen">
              {active.source === "render" ? <video
                controls
                playsInline
                preload="metadata"
                src={apiUrl(active.stream_url)}
                onLoadedMetadata={(event) => {
                  const progress = me?.progress[active.id];
                  if (progress?.seconds && progress.seconds < event.currentTarget.duration - 10) event.currentTarget.currentTime = progress.seconds;
                }}
                onTimeUpdate={(event) => {
                  const now = event.currentTarget.currentTime;
                  if (now - renderSaveRef.current > 12) { renderSaveRef.current = now; saveProgress(active.id, now, event.currentTarget.duration || 0); }
                }}
                onPause={(event) => saveProgress(active.id, event.currentTarget.currentTime, event.currentTarget.duration || 0)}
                onEnded={(event) => saveProgress(active.id, event.currentTarget.duration || 0, event.currentTarget.duration || 0)}
              /> : active.youtube_id ? <YouTubePlayer movie={active} initialSeconds={me?.progress[active.id]?.seconds || 0} onProgress={(seconds, duration) => saveProgress(active.id, seconds, duration)} /> : <iframe title={active.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen src={`https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(active.youtube_playlist_id || "")}&rel=0`} />}
            </div>
            <aside className="kgm-cinema-learning-panel">
              <span className="kgm-cinema-learning-kicker">WATCH → NOTICE → EXPLAIN</span>
              <h3>Science inside this film</h3>
              <div className="kgm-cinema-topic-list">{(active.topics || []).map((topic) => <span key={topic}>{topic}</span>)}</div>
              <h4>After watching, can you explain…</h4>
              <ol>{(active.learn?.length ? active.learn : ["What new idea did you learn?", "What evidence did the film show?", "What question would you investigate next?"]).map((item) => <li key={item}>{item}</li>)}</ol>
              <div className="kgm-cinema-player-actions">
                <button className={me?.liked_ids.includes(active.id) ? "liked" : ""} onClick={() => toggleLike(active)}>{me?.liked_ids.includes(active.id) ? "♥ Liked" : "♡ Like"} <small>{active.like_count || 0}</small></button>
                <button onClick={() => toggleMyList(active)}>{savedIds.has(active.id) ? "✓ My List" : "＋ My List"}</button>
                {active.source === "render" && active.download_allowed && active.download_url && <a href={apiUrl(active.download_url)}>↓ Download</a>}
              </div>
              <p className="kgm-cinema-source-note"><strong>{active.attribution || active.channel || "KGM Science Cinema"}</strong><br/>{active.source.startsWith("youtube") ? "Playback is provided by YouTube's official embedded player. Downloads are intentionally unavailable." : "KGM-hosted copy. Download is shown only when the curator confirmed redistribution rights."}</p>
            </aside>
          </div>
        </div>
      </div>}

      {curateOpen && me?.can_curate && <div className="kgm-cinema-curate-backdrop">
        <div className="kgm-cinema-curate-modal">
          <header><div><span>KGM CURATOR DESK</span><h2>Add STEM cinema</h2></div><button onClick={() => setCurateOpen(false)}>×</button></header>
          <div className="kgm-cinema-curate-tabs"><button className={curateTab === "youtube" ? "active" : ""} onClick={() => setCurateTab("youtube")}>YouTube embed</button><button className={curateTab === "render" ? "active" : ""} onClick={() => setCurateTab("render")}>Render-hosted movie</button></div>
          {curateTab === "youtube" ? <form onSubmit={submitYoutube} className="kgm-cinema-form">
            <label>Title<input name="title" required maxLength={120} /></label>
            <label>YouTube video or playlist URL<input name="youtube" required placeholder="https://www.youtube.com/watch?v=…" /></label>
            <label>Description<textarea name="description" required rows={3} maxLength={800} /></label>
            <div className="kgm-cinema-form-two"><label>Category<select name="category">{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label>Channel<input name="channel" placeholder="NASA, Khan Academy…" /></label></div>
            <div className="kgm-cinema-form-two"><label>Age rating<input name="age_rating" defaultValue="8+" /></label><label>Duration<input name="duration_label" placeholder="42 min / Series" /></label></div>
            <label>Topics<input name="topics" placeholder="gravity, orbits, Moon" /></label>
            <label>What learners should be able to explain<textarea name="learn" rows={3} placeholder={'One learning question per line\nWhy does…?'} /></label>
            <div className="kgm-cinema-form-two"><label>Attribution<input name="attribution" /></label><label>Source page<input name="source_page" type="url" /></label></div>
            <input type="hidden" name="language" value="English" />
            <label className="kgm-cinema-check"><input type="checkbox" name="stem_confirmed" required /><span>This is genuinely STEM/educational content.</span></label>
            <label className="kgm-cinema-check"><input type="checkbox" name="embed_confirmed" required /><span>The publisher allows playback through the official YouTube embed.</span></label>
            <button className="kgm-cinema-submit" disabled={curateBusy}>{curateBusy ? "Adding…" : "Add to Science Cinema →"}</button>
          </form> : <form onSubmit={submitRenderUpload} className="kgm-cinema-form">
            <div className="kgm-cinema-render-warning"><strong>Render disk only.</strong><p>Use this only for public-domain, CC-licensed, NASA media that permits reuse, your own films, or material with explicit redistribution permission.</p></div>
            <label>Movie file<input name="file" type="file" required accept="video/mp4,video/webm,.mp4,.webm" /></label>
            <label>Title<input name="title" required maxLength={120} /></label>
            <label>Description<textarea name="description" required rows={3} maxLength={800} /></label>
            <div className="kgm-cinema-form-two"><label>Category<select name="category">{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label>License<select name="license"><option value="public-domain">Public domain</option><option value="nasa">NASA media</option><option value="cc-by">CC BY</option><option value="cc-by-sa">CC BY-SA</option><option value="permission">Explicit permission</option></select></label></div>
            <div className="kgm-cinema-form-two"><label>Age rating<input name="age_rating" defaultValue="8+" /></label><label>Duration<input name="duration_label" /></label></div>
            <label>Attribution / creator<input name="attribution" required /></label>
            <input type="hidden" name="language" value="English" />
            <input type="hidden" name="download_allowed" value="true" />
            <label className="kgm-cinema-check"><input type="checkbox" name="stem_confirmed" required /><span>This movie is STEM-focused.</span></label>
            <label className="kgm-cinema-check"><input type="checkbox" name="rights_confirmed" required /><span>KGM has the legal right to stream and redistribute this file.</span></label>
            <button className="kgm-cinema-submit" disabled={curateBusy}>{curateBusy ? "Uploading…" : "Upload to KGM Render storage →"}</button>
          </form>}
        </div>
      </div>}

      {toast && <button className="kgm-cinema-toast" onClick={() => setToast("")}>{toast}</button>}
    </div>
  );
}

function MovieCard({ movie, progress, liked, saved, onWatch, onLike, onSave, compact = false }: { movie: Movie; progress?: Progress; liked: boolean; saved: boolean; onWatch: (movie: Movie) => void; onLike: (movie: Movie) => void; onSave: (movie: Movie) => void; compact?: boolean }) {
  const percent = progress?.duration ? Math.min(100, (progress.seconds / progress.duration) * 100) : progress?.completed ? 100 : 0;
  return <article className={`kgm-cinema-card${compact ? " compact" : ""}`}>
    <button className="kgm-cinema-poster" onClick={() => onWatch(movie)} aria-label={`Watch ${movie.title}`}>
      {movie.youtube_id ? <img src={`https://i.ytimg.com/vi/${movie.youtube_id}/hqdefault.jpg`} alt="" loading="lazy" /> : <div className={`kgm-cinema-poster-fallback ${movie.source}`}><span>{movie.source === "render" ? "KGM" : "NASA"}</span><strong>{movie.category}</strong></div>}
      <span className="kgm-cinema-play">▶</span>
      <small className="kgm-cinema-source-badge">{movie.source === "render" ? "KGM STREAM" : movie.source === "youtube_playlist" ? "YOUTUBE SERIES" : "YOUTUBE"}</small>
      {percent > 0 && <i className="kgm-cinema-card-progress"><b style={{ width: `${percent}%` }} /></i>}
    </button>
    <div className="kgm-cinema-card-body">
      <div className="kgm-cinema-card-meta"><span>{movie.category}</span><span>{movie.age_rating || "All ages"}</span><span>{movie.duration_label || "STEM"}</span></div>
      <h3><button onClick={() => onWatch(movie)}>{movie.title}</button></h3>
      <p>{movie.description}</p>
      {progress?.seconds ? <small className="kgm-cinema-resume">{progress.completed ? "✓ Watched" : `Continue at ${formatTime(progress.seconds)}`}</small> : null}
      <div className="kgm-cinema-card-actions"><button className={liked ? "liked" : ""} onClick={() => onLike(movie)}>{liked ? "♥" : "♡"} <span>{movie.like_count || 0}</span></button><button className={saved ? "saved" : ""} onClick={() => onSave(movie)}>{saved ? "✓ Saved" : "＋ List"}</button></div>
    </div>
  </article>;
}
