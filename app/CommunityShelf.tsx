"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { isKgmAvatarUpload } from "./KgmAvatar";

type ShelfKind = "all" | "image" | "audio" | "video" | "apk";
type UploadItem = {
  id: string;
  title: string;
  description: string;
  kind: Exclude<ShelfKind, "all">;
  content_type: string;
  filename: string;
  size: number;
  sha256: string;
  created_at: string;
  uploader: { id: string; nickname: string; role: string };
  file_url: string;
  download_url: string;
  community_warning?: string | null;
};

const API = (process.env.NEXT_PUBLIC_KGM_CHAT_API || "https://mana-koratlagudem.onrender.com").replace(/\/$/, "");
const kinds: { id: ShelfKind; label: string; icon: string }[] = [
  { id: "all", label: "All", icon: "✦" },
  { id: "image", label: "Photos", icon: "▧" },
  { id: "video", label: "Videos", icon: "▶" },
  { id: "audio", label: "Music", icon: "♪" },
  { id: "apk", label: "APKs", icon: "⬡" },
];

function absolute(path: string) {
  return path.startsWith("http") ? path : `${API}${path}`;
}

function bytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(value > 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default function CommunityShelf() {
  const [host, setHost] = useState<Element | null>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [kind, setKind] = useState<ShelfKind>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      const response = await fetch(`${API}/api/kgm-uploads?kind=all&limit=100`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Could not load community uploads");
      const publicItems = Array.isArray(data.items) ? data.items.filter((item: UploadItem) => !isKgmAvatarUpload(item)) : [];
      setItems(publicItems);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load community uploads");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const target = document.querySelector(".apps-section");
    setHost(target);
    load();
    const refresh = () => load();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 15000);
    window.addEventListener("focus", refresh);
    window.addEventListener("kgm-gallery-updated", refresh as EventListener);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("kgm-gallery-updated", refresh as EventListener);
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (kind !== "all" && item.kind !== kind) return false;
      if (!needle) return true;
      return [item.title, item.description, item.uploader.nickname, item.kind, item.filename]
        .some((value) => String(value || "").toLowerCase().includes(needle));
    });
  }, [items, kind, query]);

  const visible = filtered.slice(0, 12);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  function openGallery() {
    document.querySelector<HTMLButtonElement>(".kgm-gallery-nav-link")?.click();
  }

  if (!host) return null;

  return createPortal(
    <div className="kgm-live-shelf">
      <div className="kgm-live-shelf-heading">
        <div>
          <span className="section-kicker">THE COMMUNITY SHELF</span>
          <h2>Made in Koratlagudem</h2>
          <p>Real photos, songs, videos and APKs shared by KGM members. No demo listings and no “coming soon” placeholders.</p>
        </div>
        <div className="kgm-live-shelf-count" aria-label={`${items.length} public community uploads`}>
          <strong>{items.length}</strong>
          <span>REAL<br />UPLOADS</span>
        </div>
      </div>

      <div className="kgm-live-shelf-tools">
        <form className="kgm-live-search" onSubmit={submitSearch}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search real community uploads…" aria-label="Search community uploads" />
        </form>
        <div className="kgm-live-filters" aria-label="Filter community uploads">
          {kinds.map((entry) => <button key={entry.id} type="button" className={kind === entry.id ? "active" : ""} onClick={() => setKind(entry.id)}><span>{entry.icon}</span>{entry.label}</button>)}
        </div>
      </div>

      {error && <div className="kgm-live-shelf-state error"><strong>Could not load the live shelf.</strong><span>{error}</span><button type="button" onClick={load}>Try again</button></div>}
      {loading && !error && <div className="kgm-live-shelf-state"><span className="kgm-live-loader">◌</span><strong>Loading real village uploads…</strong></div>}
      {!loading && !error && !visible.length && <div className="kgm-live-shelf-state empty"><span>✦</span><strong>{items.length ? "No uploads match this filter yet." : "The community shelf is ready for its first real upload."}</strong><p>{items.length ? "Try another type or search term." : "Upload a photo, song, video or APK in Gallery and it will appear here automatically."}</p><button type="button" onClick={openGallery}>Open Gallery →</button></div>}

      {!loading && !error && visible.length > 0 && <div className="kgm-live-grid">
        {visible.map((item) => <article className={`kgm-live-card ${item.kind}`} key={item.id}>
          <div className="kgm-live-media">
            {item.kind === "image" && <a href={absolute(item.file_url)} target="_blank" rel="noreferrer" aria-label={`Open ${item.title}`}><img src={absolute(item.file_url)} alt={item.title} loading="lazy" /></a>}
            {item.kind === "video" && <video src={absolute(item.file_url)} controls preload="metadata" playsInline />}
            {item.kind === "audio" && <div className="kgm-live-audio"><span>♪</span><div><small>COMMUNITY MUSIC</small><strong>{item.title}</strong></div><audio src={absolute(item.file_url)} controls preload="metadata" /></div>}
            {item.kind === "apk" && <div className="kgm-live-apk"><span>APK</span><strong>{item.title}</strong><small>Community Android package</small></div>}
          </div>
          <div className="kgm-live-card-body">
            <div className="kgm-live-card-kicker"><span>{item.kind === "image" ? "PHOTO" : item.kind === "audio" ? "MUSIC" : item.kind.toUpperCase()}</span><b>{bytes(item.size)}</b></div>
            <h3>{item.title}</h3>
            {item.description && <p>{item.description}</p>}
            <div className="kgm-live-uploader"><span>{item.uploader.nickname.slice(0, 1).toUpperCase()}</span><div><strong>{item.uploader.nickname}</strong><small>{item.uploader.role} · {dateLabel(item.created_at)}</small></div></div>
            {item.kind === "apk" && <div className="kgm-live-apk-warning"><strong>⚠ Unverified community APK</strong><small>SHA-256 {item.sha256.slice(0, 12)}…</small></div>}
            <div className="kgm-live-actions">
              {item.kind === "apk" ? <a href={absolute(item.download_url)} download>Download APK</a> : <a href={absolute(item.download_url)} download>Save file</a>}
              <button type="button" onClick={openGallery}>Open Gallery</button>
            </div>
          </div>
        </article>)}
      </div>}

      {!loading && !error && filtered.length > visible.length && <p className="kgm-live-more">Showing the latest {visible.length} of {filtered.length} matching uploads. <button type="button" onClick={openGallery}>See everything in Gallery →</button></p>}
      {!loading && !error && items.length > 0 && filtered.length <= visible.length && <div className="kgm-live-footer"><span>Everything here comes from the public KGM Gallery.</span><button type="button" onClick={openGallery}>Open full Gallery →</button></div>}
    </div>,
    host,
  );
}
