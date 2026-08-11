"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
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

type SelectedUpload = {
  file: File;
  kind: Exclude<GalleryKind, "all">;
  previewUrl: string;
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

function detectFileKind(file: File): Exclude<GalleryKind, "all"> {
  const type = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/") || /\.(mp4|mov|m4v|3gp|3gpp|webm|mpeg|mpg|avi)$/i.test(name)) return "video";
  if (type.startsWith("audio/") || /\.(mp3|m4a|aac|wav|ogg|opus|webm)$/i.test(name)) return "audio";
  return "apk";
}

function maxBytesFor(kind: Exclude<GalleryKind, "all">) {
  if (kind === "image") return 10 * 1024 * 1024;
  if (kind === "audio") return 25 * 1024 * 1024;
  return 50 * 1024 * 1024;
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
  const [selectedUpload, setSelectedUpload] = useState<SelectedUpload | null>(null);
  const [editingItem, setEditingItem] = useState<UploadItem | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => setNavHost(document.querySelector(".nav-links")), []);
  useEffect(() => () => {
    if (selectedUpload?.previewUrl) URL.revokeObjectURL(selectedUpload.previewUrl);
  }, [selectedUpload]);

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

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      setSelectedUpload(null);
      return;
    }
    const nextKind = detectFileKind(file);
    const limit = maxBytesFor(nextKind);
    if (file.size > limit) {
      setError(`${nextKind === "video" ? "Video" : "File"} is ${bytes(file.size)}. Maximum allowed size is ${bytes(limit)}.`);
      event.currentTarget.value = "";
      setSelectedUpload(null);
      return;
    }
    setError("");
    const previewUrl = nextKind === "apk" ? "" : URL.createObjectURL(file);
    setSelectedUpload({ file, kind: nextKind, previewUrl });
  }

  function clearSelectedUpload() {
    const input = document.querySelector<HTMLInputElement>("#kgm-community-upload-file");
    if (input) input.value = "";
    setSelectedUpload(null);
  }

  function closeUploadModal() {
    clearSelectedUpload();
    setUploadOpen(false);
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
    const file = data.get("file");
    if (!(file instanceof File) || !file.size) {
      setError("Choose a photo, video, song or APK before publishing.");
      return;
    }
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
      clearSelectedUpload();
      setUploadOpen(false);
      await refreshAccount();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function openEdit(item: UploadItem) {
    if (account?.id !== item.uploader.id) return;
    setError("");
    setEditingItem(item);
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingItem || savingEdit) return;
    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token || account?.id !== editingItem.uploader.id) {
      setError("Sign in with the account that uploaded this item to edit it.");
      return;
    }
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") || "").trim();
    const description = String(data.get("description") || "").trim();
    if (!title) {
      setError("Add a title before saving.");
      return;
    }
    setSavingEdit(true);
    setError("");
    try {
      const updated = await json<UploadItem>(`${API}/api/kgm-uploads/${editingItem.id}`, {
        method: "PUT",
        body: JSON.stringify({ title, description }),
      }, token);
      setItems((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
      setEditingItem(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes");
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteItem(item: UploadItem) {
    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token || account?.id !== item.uploader.id) return;
    try {
      await json(`${API}/api/kgm-uploads/${item.id}`, { method: "DELETE" }, token);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      if (editingItem?.id === item.id) setEditingItem(null);
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
            <button className="kgm-gallery-upload-button" type="button" onClick={async () => { await refreshAccount(); setSelectedUpload(null); setUploadOpen(true); }}>＋ Upload</button>
            <button className="kgm-gallery-close" type="button" onClick={() => setOpen(false)} aria-label="Close gallery">×</button>
          </div>
        </header>

        <div className="kgm-gallery-toolbar">
          <div className="kgm-gallery-tabs">{kinds.map((entry) => <button key={entry.id} className={kind === entry.id ? "active" : ""} onClick={() => selectKind(entry.id)}><span>{entry.icon}</span>{entry.label}{entry.id !== "all" && counts[entry.id] ? <b>{counts[entry.id]}</b> : null}</button>)}</div>
          <form onSubmit={submitSearch}><input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={80} placeholder="Search village uploads…" /><button>Search</button></form>
        </div>

        <div className="kgm-gallery-public-note"><span>🌍</span><p><strong>Public by design.</strong> Anyone can browse and enjoy these uploads without signing in. Uploading, editing, deleting and reporting use KGM accounts.</p></div>
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
              <div className={`kgm-upload-actions ${account?.id === item.uploader.id ? "owner-actions" : ""}`}>
                {item.kind === "apk" ? <a href={absolute(item.download_url)} download>Download APK</a> : <a href={absolute(item.download_url)} download>Save file</a>}
                {account?.id === item.uploader.id ? <><button className="kgm-edit-upload" onClick={() => openEdit(item)}>Edit</button><button className="kgm-delete-upload" onClick={() => deleteItem(item)}>Delete</button></> : <button disabled={reported.has(item.id)} onClick={() => reportItem(item)}>{reported.has(item.id) ? "Reported ✓" : "Report"}</button>}
              </div>
            </div>
          </article>)}
        </div>
      </section>

      {uploadOpen && <div className="kgm-upload-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeUploadModal(); }}>
        <form className="kgm-upload-modal" onSubmit={handleUpload}>
          <header><div><span>SHARE WITH KORATLAGUDEM</span><h3>Upload to the public gallery</h3></div><button type="button" onClick={closeUploadModal}>×</button></header>
          {account ? <div className="kgm-upload-account"><span>{account.nickname.slice(0, 1).toUpperCase()}</span><p>Posting as <strong>{account.nickname}</strong> · {account.role}</p></div> : <div className="kgm-upload-signin"><strong>Sign in first.</strong><p>Use the <b>Sign in</b> button in the KGM navigation, then come back to upload.</p></div>}
          <label>Title<input name="title" required maxLength={100} placeholder="What are you sharing?" disabled={!account} /></label>
          <label>Description<textarea name="description" maxLength={500} rows={3} placeholder="A short public description (optional)" disabled={!account} /></label>
          <label className="kgm-upload-file">
            Choose photo, song, video or APK
            <input
              id="kgm-community-upload-file"
              name="file"
              type="file"
              required
              disabled={!account}
              accept="image/*,video/*,audio/*,.mp4,.mov,.m4v,.3gp,.3gpp,.webm,.mpeg,.mpg,.avi,.mp3,.m4a,.aac,.wav,.ogg,.opus,.apk,application/vnd.android.package-archive"
              onChange={handleFileSelection}
            />
            <small>Phone camera videos are supported. Choose an existing recording from Photos/Gallery or Files. Images ≤10 MB · music ≤25 MB · videos/APKs ≤50 MB.</small>
          </label>

          {selectedUpload && <div className={`kgm-upload-selection ${selectedUpload.kind}`}>
            <div className="kgm-upload-selection-head">
              <div><span>SELECTED {selectedUpload.kind.toUpperCase()}</span><strong>{selectedUpload.file.name || "Camera recording"}</strong><small>{bytes(selectedUpload.file.size)}{selectedUpload.file.type ? ` · ${selectedUpload.file.type}` : " · phone media"}</small></div>
              <button type="button" onClick={clearSelectedUpload}>Change</button>
            </div>
            {selectedUpload.kind === "video" && <video src={selectedUpload.previewUrl} controls playsInline preload="metadata" />}
            {selectedUpload.kind === "image" && <img src={selectedUpload.previewUrl} alt="Selected upload preview" />}
            {selectedUpload.kind === "audio" && <audio src={selectedUpload.previewUrl} controls preload="metadata" />}
            {selectedUpload.kind === "apk" && <div className="kgm-upload-apk-preview"><span>APK</span><p>Ready to upload this Android package.</p></div>}
          </div>}

          <label className="kgm-upload-rights"><input name="rights_confirmed" type="checkbox" required disabled={!account} /><span>I own this file or have permission to share it, and it is suitable for a public village gallery used by children and adults.</span></label>
          <div className="kgm-upload-policy"><strong>Public upload</strong><p>Your nickname, role and upload will be visible to everyone. Do not upload private photos, personal documents, contact details, harmful content, pirated media or APKs you do not trust.</p></div>
          <button className="kgm-upload-submit" type="submit" disabled={!account || uploading || !selectedUpload}>{uploading ? "Uploading…" : selectedUpload ? `Publish ${selectedUpload.kind} for everyone →` : "Choose a file to continue"}</button>
        </form>
      </div>}

      {editingItem && <div className="kgm-upload-modal-backdrop kgm-edit-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingItem(null); }}>
        <form className="kgm-upload-modal kgm-edit-modal" onSubmit={handleEdit}>
          <header><div><span>YOUR UPLOAD · EDIT DETAILS</span><h3>Edit what everyone sees</h3></div><button type="button" onClick={() => setEditingItem(null)}>×</button></header>
          <div className="kgm-edit-preview">
            <span>{editingItem.kind === "image" ? "▧" : editingItem.kind === "video" ? "▶" : editingItem.kind === "audio" ? "♪" : "APK"}</span>
            <div><small>{editingItem.kind.toUpperCase()} · {bytes(editingItem.size)}</small><strong>{editingItem.filename}</strong><p>The media file stays unchanged. You can update its public title and description.</p></div>
          </div>
          <label>Title<input name="title" required maxLength={100} defaultValue={editingItem.title} autoFocus /></label>
          <label>Description<textarea name="description" maxLength={500} rows={4} defaultValue={editingItem.description} placeholder="Add or improve the public description" /></label>
          <div className="kgm-edit-help"><strong>You stay in control.</strong><p>Only the account that uploaded this item can edit or delete it. Changes appear in the public gallery after saving.</p></div>
          {error && <p className="kgm-gallery-error kgm-edit-error">{error}</p>}
          <div className="kgm-edit-actions"><button type="button" onClick={() => setEditingItem(null)}>Cancel</button><button className="kgm-edit-save" type="submit" disabled={savingEdit}>{savingEdit ? "Saving…" : "Save changes →"}</button></div>
        </form>
      </div>}
    </div>}
  </>;
}
