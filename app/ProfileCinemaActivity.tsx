"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type Movie = { id: string; title: string; category?: string; duration_label?: string; channel?: string };
type Playlist = { id: string; name: string; movie_ids: string[] };
type CinemaMe = { liked_ids: string[]; playlists: Playlist[]; progress: Record<string, unknown> };

const API = (process.env.NEXT_PUBLIC_KGM_CHAT_API || "https://mana-koratlagudem.onrender.com").replace(/\/$/, "");
const TOKEN_KEY = "kgm-village-chat-token-v2";

async function getJson<T>(path: string, token?: string): Promise<T> {
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API}${path}`, { headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Could not load Cinema activity");
  return data as T;
}

export default function ProfileCinemaActivity() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [me, setMe] = useState<CinemaMe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [catalog, state] = await Promise.all([
        getJson<{ items: Movie[] }>("/api/kgm-cinema/movies?limit=120"),
        getJson<CinemaMe>("/api/kgm-cinema/me", token),
      ]);
      setMovies(catalog.items || []);
      setMe(state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your Science Cinema activity");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let timer = 0;
    const attach = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const next = document.querySelector(".kgm-profile-editor-body") as HTMLElement | null;
        setTarget(next);
        if (next) void load();
      }, 60);
    };
    const detach = () => setTarget(null);
    window.addEventListener("kgm-open-profile", attach);
    window.addEventListener("kgm-profile-closed", detach);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("kgm-open-profile", attach);
      window.removeEventListener("kgm-profile-closed", detach);
    };
  }, []);

  useEffect(() => {
    if (!target) return;
    const observer = new MutationObserver(() => {
      if (!document.body.contains(target)) setTarget(null);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [target]);

  const byId = useMemo(() => new Map(movies.map((movie) => [movie.id, movie])), [movies]);
  const liked = useMemo(() => (me?.liked_ids || []).map((id) => byId.get(id)).filter(Boolean) as Movie[], [me, byId]);
  const savedIds = useMemo(() => Array.from(new Set((me?.playlists || []).flatMap((list) => list.movie_ids))), [me]);
  const saved = useMemo(() => savedIds.map((id) => byId.get(id)).filter(Boolean) as Movie[], [savedIds, byId]);

  if (!target) return null;

  const openCinema = () => {
    const close = document.querySelector(".kgm-profile-head > button") as HTMLButtonElement | null;
    close?.click();
    window.setTimeout(() => window.dispatchEvent(new Event("kgm-open-cinema")), 80);
  };

  return createPortal(
    <section className="kgm-profile-cinema-activity" aria-label="Your Science Cinema activity">
      <div className="kgm-profile-cinema-head">
        <div><span>YOUR SCIENCE CINEMA</span><h3>Films you connected with.</h3></div>
        <button type="button" onClick={openCinema}>Open Cinema →</button>
      </div>
      {loading ? <p className="kgm-profile-cinema-status">Loading your likes and list…</p> : error ? <p className="kgm-profile-cinema-status error">{error}</p> : <>
        <div className="kgm-profile-cinema-stats">
          <div><strong>♥ {liked.length}</strong><span>Liked films</span></div>
          <div><strong>＋ {saved.length}</strong><span>My STEM List</span></div>
        </div>
        <div className="kgm-profile-cinema-columns">
          <article>
            <header><b>♥ LIKED</b><span>{liked.length}</span></header>
            {liked.length ? <div className="kgm-profile-film-list">{liked.slice(0, 8).map((movie) => <button type="button" key={movie.id} onClick={openCinema}><strong>{movie.title}</strong><small>{movie.category || "Science"}{movie.channel ? ` · ${movie.channel}` : ""}</small></button>)}</div> : <p>No liked films yet. Tap ♥ Like inside Science Cinema.</p>}
          </article>
          <article>
            <header><b>＋ MY STEM LIST</b><span>{saved.length}</span></header>
            {saved.length ? <div className="kgm-profile-film-list">{saved.slice(0, 8).map((movie) => <button type="button" key={movie.id} onClick={openCinema}><strong>{movie.title}</strong><small>{movie.category || "Science"}{movie.duration_label ? ` · ${movie.duration_label}` : ""}</small></button>)}</div> : <p>Your list is empty. Add films with + My List.</p>}
          </article>
        </div>
      </>}
    </section>,
    target,
  );
}
