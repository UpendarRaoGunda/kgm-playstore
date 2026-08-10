"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { isKgmAvatarUpload } from "./KgmAvatar";

type GalleryKind = "all" | "image" | "audio" | "video" | "apk";
type Account = { id: string; email: string; nickname: string; role: "Child" | "Teen" | "Adult" };
type UploadItem = {
  id: string;
  title: string;
  description: string;
  kind: Exclude<GalleryKind, "all">;
  content_type: string;
  filename: string;
  size: number;
  sha256: string;
  created_at: string;
  uploader: { id: string; nickname: string; role: string };
  file_url: string;
  download_url: string;
  report_count: number;
  community_warning?: string | null;
};

const API = (process.env.NEXT_PUBLIC_KGM_CHAT_API || "https://mana-koratlagudem.onrender.com").replace(/\/$/, "");
const TOKEN_KEY = "kgm-village-chat-token-v2";
const kinds: { id: GalleryKind; label: string; icon: string }[] = [
  { id: "all", label: "Everything", icon: "✦" },
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

async function json<T>(url: string, init?: RequestInit, token?: string): Promise<T> {
  const headers = new Headers(init?.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Could not complete that request");
  return data as T;
}

export default function CommunityGallery() {
  const [open, setOpen] = useState(false);
  const [navHost, setNavHost] = useState<Element | null>(null);
  const [kind, setKind] = useState<GalleryKind>("all");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<UploadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [reported, setReported] = useState<Set<string>>(new Set());

  useEffect(() => setNavHost(document.querySelector(".nav-links")), []);

  async function refreshAccount() {
    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token) {
      setAccount(null);
      return null;
    }
    try {
      const me = await json<Account>(`${API}/api/kgm-chat/auth/me`, undefined, token);
      setAccount(me);
      return me;
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setAccount(null);
      return null;
    }
  }

  async function load(nextKind = kind, nextQuery = query) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ kind: nextKind, limit: "100" });
      if (nextQuery.trim()) params.set("q", nextQuery.trim());
      const data = await json<{ items: UploadItem[] }>(`${API}/api/kgm-uploads?${params}`);
      setItems((data.items || []).filter((item) => !isKgmAvatarUpload(item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load village uploads");
    } finally {
      setLoading(false);
    }
  }

  function openGallery() {
    setOpen(true);
    setError("");
    refreshAccount();
    load();
  }

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await load(kind, query);
  }

  async function selectKind(next: GalleryKind) {
    setKind(next);
    await load(next, query);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading) return;
    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token) {
      setError("Sign in to your KGM account first, then upload to the public village gallery.");
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    if (data.get("rights_confirmed") !== "on") {
      setError("Confirm that you own the file or have permission to share it publicly.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      data.set("rights_confirmed", "true");
      const item = await json<UploadItem>(`${API}/api/kgm-uploads`, { method: "POST", body: data }, token);
      setItems((current) => [item, ...current.filter((entry) => entry.id !== item.id)]);
      setKind("all");
      setQuery("");
      form.reset();
      setUploadOpen(false);
      await refreshAccount();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function deleteItem(item: UploadItem) {
    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token || account?.id !== item.uploader.id) return;
    try {
      await json(`${API}/api/kgm-uploads/${item.id}`, { method: "DELETE" }, token);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete upload");
    }
  }

  async function reportItem(item: UploadItem) {
    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token) {
      setError("Sign in before reporting an upload.");
      return;
    }
    if (reported.has(item.id)) return;
    try {
      const result = await json<{ hidden?: boolean }>(`${API}/api/kgm-uploads/${item.id}/report`, {
        method: "POST",
        body: JSON.stringify({ reason: "Reported from KGM public gallery" }),
      }, token);
      setReported((current) => new Set(current).add(item.id));
      if (result.hidden) setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not report upload");
    }
  }

  const counts = useMemo(() => items.reduce<Record<string, number>>((acc, item) => {
    acc[item.kind] = (acc[item.kind] || 0) + 1;
    return acc;
  }, {}), [items]);

  const navControl = navHost ? createPortal(
    <button className="kgm-gallery-nav-link" type="button" onClick={openGallery}>Gallery</button>,
    navHost,
  ) : null;

  return <>
    {navControl}
    {open && <div className="kgm-gallery-backdrop" role="dialog" aria-modal="true" aria-label="KGM public upload gallery">
      <section className="kgm-gallery-shell">
        <header className="kgm-gallery-head">
          <div>
            <span>KGM COMMUNITY · మన ఊరి గ్యాలరీ</span>
            <h2>Made here. Shared with everyone.</h2>
            <p>Photos, village videos, songs and community APKs uploaded by KGM members.</p>
          </div>
          <div className="kgm-gallery-head-actions">
            <button className="kgm-gallery-upload-button" type="button" onClick={async () => { await refreshAccount(); setUploadOpen(true); }}>＋ Upload</button>
            <button className="kgm-gallery-close" type="button" onClick={() => setOpen(false)} aria-label="Close gallery">×</button>
          </div>
        </header>

        <div className="kgm-gallery-toolbar">
          <div className="kgm-gallery-tabs">{kinds.map((entry) => <button key={entry.id} className={kind === entry.id ? "active" : ""} onClick={() => selectKind(entry.id)}><span>{entry.icon}</span>{entry.label}{entry.id !== "all" && counts[entry.id] ? <b>{counts[entry.id]}</b> : null}</button>)}</div>
          <form onSubmit={submitSearch}><input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={80} placeholder="Search village uploads…" /><button>Search</button></form>
        </div>

        <div className="kgm-gallery-public-note"><span>🌍</span><p><strong>Public by design.</strong> Anyone can browse and enjoy these uploads without signing in. Uploading, deleting and reporting use KGM accounts.</p></div>
        {error && <p className="kgm-gallery-error">{error}</p>}

        <div className="kgm-gallery-grid">
          {loading && <div className="kgm-gallery-empty"><span>◌</span><strong>Loading village uploads…</strong></div>}
          {!loading && !items.length && <div className="kgm-gallery-empty"><span>✦</span><strong>No uploads here yet.</strong><p>Be the first KGM member to share something useful, creative or fun.</p></div>}
          {!loading && items.map((item) => <article className={`kgm-upload-card ${item.kind}`} key={item.id}>
            <div className="kgm-upload-media">
              {item.kind === "image" && <img src={absolute(item.file_url)} alt={item.title} loading="lazy" />}
              {item.kind === "video" && <video src={absolute(item.file_url)} controls preload="metadata" playsInline />}
              {item.kind === "audio" && <div className="kgm-audio-art"><span>♪</span><strong>{item.title}</strong><small>{item.uploader.nickname}</small><audio src={absolute(item.file_url)} controls preload="metadata" /></div>}
              {item.kind === "apk" && <div className="kgm-apk-art"><span>APK</span><strong>{item.title}</strong><small>Unverified community app</small></div>}
            </div>
            <div className="kgm-upload-body">
              <div className="kgm-upload-kind"><span>{item.kind === "audio" ? "MUSIC" : item.kind.toUpperCase()}</span><b>{bytes(item.size)}</b></div>
              <h3>{item.title}</h3>
              {item.description && <p>{item.description}</p>}
              <div className="kgm-upload-by"><span>{item.uploader.nickname.slice(0, 1).toUpperCase()}</span><div><strong>{item.uploader.nickname}</strong><small>{item.uploader.role} · {dateLabel(item.created_at)}</small></div></div>
              {item.kind === "apk" && <div className="kgm-apk-warning"><strong>⚠ Unverified community APK</strong><span>SHA-256: {item.sha256.slice(0, 16)}…</span><small>Install only if you trust the uploader. KGM does not auto-install community APKs.</small></div>}
              <div className="kgm-upload-actions">
                {item.kind === "apk" ? <a href={absolute(item.download_url)} download>Download APK</a> : <a href={absolute(item.download_url)} download>Save file</a>}
                {account?.id === item.uploader.id ? <button onClick={() => deleteItem(item)}>Delete</button> : <button disabled={reported.has(item.id)} onClick={() => reportItem(item)}>{reported.has(item.id) ? "Reported ✓" : "Report"}</button>}
              </div>
            </div>
          </article>)}
        </div>
      </section>

      {uploadOpen && <div className="kgm-upload-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setUploadOpen(false); }}>
        <form className="kgm-upload-modal" onSubmit={handleUpload}>
          <header><div><span>SHARE WITH KORATLAGUDEM</span><h3>Upload to the public gallery</h3></div><button type="button" onClick={() => setUploadOpen(false)}>×</button></header>
          {account ? <div className="kgm-upload-account"><span>{account.nickname.slice(0, 1).toUpperCase()}</span><p>Posting as <strong>{account.nickname}</strong> · {account.role}</p></div> : <div className="kgm-upload-signin"><strong>Sign in first.</strong><p>Use the <b>Sign in</b> button in the KGM navigation, then come back to upload.</p></div>}
          <label>Title<input name="title" required maxLength={100} placeholder="What are you sharing?" disabled={!account} /></label>
          <label>Description<textarea name="description" maxLength={500} rows={3} placeholder="A short public description (optional)" disabled={!account} /></label>
          <label className="kgm-upload-file">Choose photo, song, video or APK<input name="file" type="file" required disabled={!account} accept="image/jpeg,image/png,image/webp,image/gif,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg,audio/webm,video/mp4,video/webm,.apk,application/vnd.android.package-archive" /><small>Images ≤10 MB · music ≤25 MB · videos/APKs ≤50 MB</small></label>
          <label className="kgm-upload-rights"><input name="rights_confirmed" type="checkbox" required disabled={!account} /><span>I own this file or have permission to share it, and it is suitable for a public village gallery used by children and adults.</span></label>
          <div className="kgm-upload-policy"><strong>Public upload</strong><p>Your nickname, role and upload will be visible to everyone. Do not upload private photos, personal documents, contact details, harmful content, pirated media or APKs you do not trust.</p></div>
          <button className="kgm-upload-submit" type="submit" disabled={!account || uploading}>{uploading ? "Uploading…" : "Publish for everyone →"}</button>
        </form>
      </div>}
    </div>}
  </>;
}
