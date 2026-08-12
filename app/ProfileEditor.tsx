"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import KgmAvatar, {
  KGM_AVATAR_PRESETS,
  KGM_AVATAR_PRESET_PREFIX,
  KGM_AVATAR_UPLOAD_TITLE,
  avatarFromUploads,
  getAvatarPreset,
  isKgmAvatarUpload,
  type KgmAvatarUpload,
  type KgmProfile,
} from "./KgmAvatar";

const API = (process.env.NEXT_PUBLIC_KGM_CHAT_API || "").replace(/\/$/, "");
const TOKEN_KEY = "kgm-village-chat-token-v2";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

type Role = "Child" | "Teen" | "Adult";
type Account = { id: string; email: string; nickname: string; role: Role; created_at?: string };
type UploadItem = KgmAvatarUpload & { uploader?: { id: string }; download_url?: string };
type CinemaMovie = { id: string; title: string; category?: string; duration_label?: string; source?: string };
type CinemaPlaylist = { id: string; name: string; movie_ids: string[] };
type CinemaMe = { liked_ids: string[]; playlists: CinemaPlaylist[]; progress?: Record<string, unknown>; can_curate?: boolean };
type CinemaProfileState = { liked: CinemaMovie[]; saved: CinemaMovie[] };

async function apiRequest<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const headers = new Headers(init?.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API}${path}`, { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Could not update your KGM profile");
  return data as T;
}

function buildProfile(account: Account, uploads: UploadItem[]): KgmProfile {
  return {
    id: account.id,
    email: account.email,
    nickname: account.nickname,
    role: account.role,
    created_at: account.created_at,
    avatar: avatarFromUploads(uploads),
  };
}

async function presetPng(id: string): Promise<File> {
  const preset = getAvatarPreset(id);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot create avatar images.");

  const gradient = ctx.createLinearGradient(44, 24, 470, 490);
  gradient.addColorStop(0, preset.colors[0]);
  gradient.addColorStop(1, preset.colors[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  ctx.globalAlpha = .18;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(120, 90, 78, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(440, 410, 140, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "230px system-ui, Apple Color Emoji, Segoe UI Emoji, sans-serif";
  ctx.fillText(preset.emoji, 256, 238);

  ctx.fillStyle = "rgba(8,8,13,.78)";
  ctx.fillRect(0, 428, 512, 84);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 32px system-ui, sans-serif";
  ctx.fillText("KGM", 256, 466);
  ctx.fillStyle = "#d8ff3e";
  ctx.beginPath(); ctx.arc(465, 465, 12, 0, Math.PI * 2); ctx.fill();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not create avatar image.")), "image/png");
  });
  return new File([blob], `kgm-avatar-${id}.png`, { type: "image/png" });
}

export default function ProfileEditor() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<KgmProfile | null>(null);
  const [avatarUploads, setAvatarUploads] = useState<UploadItem[]>([]);
  const [nickname, setNickname] = useState("");
  const [role, setRole] = useState<Role>("Adult");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [avatarDirty, setAvatarDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [cinema, setCinema] = useState<CinemaProfileState>({ liked: [], saved: [] });
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadProfile() {
    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token) {
      setOpen(false);
      (document.querySelector(".kgm-account-nav-link") as HTMLElement | null)?.click();
      return;
    }
    setLoading(true);
    setError("");
    try {
      const account = await apiRequest<Account>("/api/kgm-chat/auth/me", undefined, token);
      const [uploadsResult, cinemaMe, movieResult] = await Promise.all([
        apiRequest<{ items: UploadItem[] }>("/api/kgm-uploads/mine", undefined, token).catch(() => ({ items: [] })),
        apiRequest<CinemaMe>("/api/kgm-cinema/me", undefined, token).catch(() => ({ liked_ids: [], playlists: [] } as CinemaMe)),
        apiRequest<{ items: CinemaMovie[] }>("/api/kgm-cinema/movies?limit=120").catch(() => ({ items: [] })),
      ]);
      const avatars = (uploadsResult.items || []).filter((item) => isKgmAvatarUpload(item) && item.kind === "image");
      const next = buildProfile(account, avatars);
      const movieMap = new Map((movieResult.items || []).map((movie) => [movie.id, movie]));
      const liked = (cinemaMe.liked_ids || []).map((id) => movieMap.get(String(id))).filter((movie): movie is CinemaMovie => Boolean(movie));
      const savedIds = [...new Set((cinemaMe.playlists || []).flatMap((playlist) => playlist.movie_ids || []).map(String))];
      const savedMovies = savedIds.map((id) => movieMap.get(id)).filter((movie): movie is CinemaMovie => Boolean(movie));
      setCinema({ liked, saved: savedMovies });
      setAvatarUploads(avatars);
      setProfile(next);
      setNickname(next.nickname);
      setRole(next.role);
      setSelectedPreset(next.avatar.preset || null);
      setFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview("");
      setAvatarDirty(false);
      setSaved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handler = () => {
      if (!localStorage.getItem(TOKEN_KEY)) {
        (document.querySelector(".kgm-account-nav-link") as HTMLElement | null)?.click();
        return;
      }
      setOpen(true);
      void loadProfile();
    };
    const refreshCinema = () => {
      if (open) void loadProfile();
    };
    window.addEventListener("kgm-open-profile", handler);
    window.addEventListener("kgm-cinema-library-changed", refreshCinema);
    return () => {
      window.removeEventListener("kgm-open-profile", handler);
      window.removeEventListener("kgm-cinema-library-changed", refreshCinema);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.classList.add("kgm-profile-is-open");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.documentElement.classList.remove("kgm-profile-is-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function choosePreset(id: string) {
    if (preview) URL.revokeObjectURL(preview);
    setPreview("");
    setFile(null);
    setSelectedPreset(id);
    setAvatarDirty(true);
    setSaved(false);
    setError("");
  }

  function chooseFile(next: File | null) {
    if (!next) return;
    if (next.size > MAX_AVATAR_BYTES) {
      setError("Avatar images must be 5 MB or smaller.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(next.type)) {
      setError("Use a JPG, PNG, WebP or GIF avatar.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(next));
    setFile(next);
    setSelectedPreset(null);
    setAvatarDirty(true);
    setSaved(false);
    setError("");
  }

  async function uploadAvatar(token: string, avatarFile: File, description: string): Promise<UploadItem> {
    const form = new FormData();
    form.set("title", KGM_AVATAR_UPLOAD_TITLE);
    form.set("description", description);
    form.set("rights_confirmed", "true");
    form.set("file", avatarFile);
    return apiRequest<UploadItem>("/api/kgm-uploads", { method: "POST", body: form }, token);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || busy) return;
    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const account = await apiRequest<Account>("/api/kgm-chat/auth/me", {
        method: "PUT",
        body: JSON.stringify({ nickname: nickname.trim(), role }),
      }, token);

      let avatars = avatarUploads;
      if (avatarDirty) {
        const avatarFile = file || await presetPng(selectedPreset || "orbit-pop");
        const description = file ? "KGM avatar custom upload" : `${KGM_AVATAR_PRESET_PREFIX} ${selectedPreset || "orbit-pop"}`;
        const uploaded = await uploadAvatar(token, avatarFile, description);
        const old = avatars.filter((item) => item.id !== uploaded.id);
        await Promise.allSettled(old.map((item) => apiRequest(`/api/kgm-uploads/${item.id}`, { method: "DELETE" }, token)));
        avatars = [uploaded];
        setAvatarUploads(avatars);
      }

      const next = buildProfile(account, avatars);
      setProfile(next);
      setNickname(next.nickname);
      setRole(next.role);
      setSelectedPreset(next.avatar.preset || null);
      setFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview("");
      setAvatarDirty(false);
      setSaved(true);
      window.dispatchEvent(new CustomEvent("kgm-profile-updated", { detail: next }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile");
    } finally {
      setBusy(false);
    }
  }

  function logOut() {
    localStorage.removeItem(TOKEN_KEY);
    setOpen(false);
    setProfile(null);
    setAvatarUploads([]);
    setCinema({ liked: [], saved: [] });
    window.dispatchEvent(new Event("kgm-auth-changed"));
    window.location.reload();
  }

  if (!open) return null;

  const previewAvatar = selectedPreset
    ? { type: "preset" as const, preset: selectedPreset }
    : profile?.avatar;

  return (
    <div className="kgm-profile-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) setOpen(false);
    }}>
      <section className="kgm-profile-panel" role="dialog" aria-modal="true" aria-label="Edit KGM profile">
        <header className="kgm-profile-head">
          <div>
            <span>KGM PROFILE LAB</span>
            <strong>Make it yours.</strong>
            <small>Your nickname, role, avatar and Science Cinema library travel with your KGM account.</small>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close profile editor">×</button>
        </header>

        {loading && !profile ? <div className="kgm-profile-loading"><span>✦</span><p>Loading your KGM identity…</p></div> : profile && <form className="kgm-profile-form" onSubmit={saveProfile}>
          <aside className="kgm-profile-preview-card">
            <div className="kgm-profile-preview-glow" />
            {preview ? <span className="kgm-avatar kgm-avatar-xl kgm-avatar-violet"><img src={preview} alt={`${nickname || profile.nickname} avatar preview`} /><i /></span> : <KgmAvatar value={previewAvatar} nickname={nickname || profile.nickname} size="xl" />}
            <span className="kgm-profile-preview-kicker">YOUR KGM ID</span>
            <h2>{nickname || profile.nickname}</h2>
            <p>{role} · Koratlagudem Youthverse</p>
            <div><b>✦ CREATOR</b><b>⚡ KGM MEMBER</b></div>
          </aside>

          <div className="kgm-profile-editor-body">
            <section className="kgm-profile-fields">
              <label><span>Public nickname</span><input value={nickname} onChange={(event) => { setNickname(event.target.value); setSaved(false); }} minLength={2} maxLength={24} required placeholder="e.g. QuantumKiran" /></label>
              <fieldset>
                <legend>I’m joining as</legend>
                <div className="kgm-profile-roles">{(["Child", "Teen", "Adult"] as Role[]).map((item) => <label key={item} className={role === item ? "active" : ""}><input type="radio" name="profile-role" value={item} checked={role === item} onChange={() => { setRole(item); setSaved(false); }} /><span>{item === "Child" ? "🛝" : item === "Teen" ? "⚡" : "🌱"}</span><strong>{item}</strong></label>)}</div>
              </fieldset>
            </section>

            <section className="kgm-profile-cinema">
              <div className="kgm-profile-cinema-head">
                <div><span>SCIENCE CINEMA</span><h3>Your curiosity shelf.</h3></div>
                <button type="button" onClick={() => { setOpen(false); window.dispatchEvent(new Event("kgm-open-cinema")); }}>Open Cinema →</button>
              </div>
              <div className="kgm-profile-cinema-stats">
                <article><strong>♥ {cinema.liked.length}</strong><span>Liked films</span></article>
                <article><strong>＋ {cinema.saved.length}</strong><span>My STEM List</span></article>
              </div>
              <div className="kgm-profile-cinema-groups">
                <div><b>♥ LIKED SCIENCE FILMS</b>{cinema.liked.length ? <div className="kgm-profile-film-chips">{cinema.liked.slice(0, 8).map((movie) => <span key={`liked-${movie.id}`} title={movie.title}>{movie.title}</span>)}</div> : <p>Like a Science Cinema film and it will appear here.</p>}</div>
                <div><b>＋ MY STEM LIST</b>{cinema.saved.length ? <div className="kgm-profile-film-chips">{cinema.saved.slice(0, 8).map((movie) => <span key={`saved-${movie.id}`} title={movie.title}>{movie.title}</span>)}</div> : <p>Save a film to My List and it will appear here.</p>}</div>
              </div>
            </section>

            <section className="kgm-avatar-lab">
              <div className="kgm-avatar-lab-title"><div><span>AVATAR LAB</span><h3>Pick your energy.</h3></div><button type="button" onClick={() => fileInputRef.current?.click()}>📸 Upload yours</button></div>
              <input ref={fileInputRef} className="kgm-avatar-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => chooseFile(event.target.files?.[0] || null)} />
              <div className="kgm-avatar-grid">
                {KGM_AVATAR_PRESETS.map((item) => <button type="button" key={item.id} className={selectedPreset === item.id && !file ? "active" : ""} onClick={() => choosePreset(item.id)} aria-label={`Choose ${item.name} avatar`}>
                  <KgmAvatar value={{ type: "preset", preset: item.id }} nickname={item.name} size="lg" />
                  <strong>{item.name}</strong><small>{item.vibe}</small>
                </button>)}
              </div>
              <div className="kgm-avatar-upload-note"><span>BACKEND</span><p>JPG · PNG · WebP · GIF · max 5 MB. Custom images and KGM preset choices are saved through the existing authenticated KGM backend/GridFS storage. Upload only images you own or may use.</p></div>
            </section>

            {error && <p className="kgm-profile-error">{error}</p>}
            {saved && <p className="kgm-profile-saved">✓ Profile glow-up saved.</p>}
            <div className="kgm-profile-actions"><button className="danger" type="button" onClick={logOut}>↪ Log out</button><button type="button" onClick={() => setOpen(false)}>Cancel</button><button className="primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save profile →"}</button></div>
          </div>
        </form>}
      </section>
    </div>
  );
}
