"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import KgmAvatar, { KGM_AVATAR_PRESETS, type KgmProfile } from "./KgmAvatar";

const PROFILE_API = (process.env.NEXT_PUBLIC_KGM_PROFILE_API || "https://kgm-profile-api.onrender.com").replace(/\/$/, "");
const TOKEN_KEY = "kgm-village-chat-token-v2";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

type Role = "Child" | "Teen" | "Adult";

async function apiRequest<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const headers = new Headers(init?.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${PROFILE_API}${path}`, { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Could not update your KGM profile");
  return data as T;
}

export default function ProfileEditor() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<KgmProfile | null>(null);
  const [nickname, setNickname] = useState("");
  const [role, setRole] = useState<Role>("Adult");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
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
      const next = await apiRequest<KgmProfile>("/api/kgm-profile/me", undefined, token);
      setProfile(next);
      setNickname(next.nickname);
      setRole(next.role);
      setSelectedPreset(next.avatar.type === "preset" ? next.avatar.preset || "orbit-pop" : null);
      setFile(null);
      setPreview("");
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
    window.addEventListener("kgm-open-profile", handler);
    return () => window.removeEventListener("kgm-open-profile", handler);
  }, []);

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
    setSaved(false);
    setError("");
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
      const payload: Record<string, string> = { nickname: nickname.trim(), role };
      if (selectedPreset) payload.avatar_preset = selectedPreset;
      let next = await apiRequest<KgmProfile>("/api/kgm-profile/me", {
        method: "PUT",
        body: JSON.stringify(payload),
      }, token);

      if (file) {
        const form = new FormData();
        form.append("file", file);
        next = await apiRequest<KgmProfile>("/api/kgm-profile/me/avatar", { method: "POST", body: form }, token);
      }

      setProfile(next);
      setNickname(next.nickname);
      setRole(next.role);
      setSelectedPreset(next.avatar.type === "preset" ? next.avatar.preset || "orbit-pop" : null);
      setFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview("");
      setSaved(true);
      window.dispatchEvent(new CustomEvent("kgm-profile-updated", { detail: next }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile");
    } finally {
      setBusy(false);
    }
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
            <small>Your nickname, role and avatar travel with your KGM account.</small>
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

            <section className="kgm-avatar-lab">
              <div className="kgm-avatar-lab-title"><div><span>AVATAR LAB</span><h3>Pick your energy.</h3></div><button type="button" onClick={() => fileInputRef.current?.click()}>📸 Upload yours</button></div>
              <input ref={fileInputRef} className="kgm-avatar-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => chooseFile(event.target.files?.[0] || null)} />
              <div className="kgm-avatar-grid">
                {KGM_AVATAR_PRESETS.map((item) => <button type="button" key={item.id} className={selectedPreset === item.id && !file ? "active" : ""} onClick={() => choosePreset(item.id)} aria-label={`Choose ${item.name} avatar`}>
                  <KgmAvatar value={{ type: "preset", preset: item.id }} nickname={item.name} size="lg" />
                  <strong>{item.name}</strong><small>{item.vibe}</small>
                </button>)}
              </div>
              <div className="kgm-avatar-upload-note"><span>UPLOAD</span><p>JPG · PNG · WebP · GIF · max 5 MB. Uploaded avatars are stored server-side with your KGM profile, not in browser storage.</p></div>
            </section>

            {error && <p className="kgm-profile-error">{error}</p>}
            {saved && <p className="kgm-profile-saved">✓ Profile glow-up saved.</p>}
            <div className="kgm-profile-actions"><button type="button" onClick={() => setOpen(false)}>Cancel</button><button className="primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save profile →"}</button></div>
          </div>
        </form>}
      </section>
    </div>
  );
}
