"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type DriveMovie = {
  id: string;
  drive_id: string;
  title: string;
  description: string;
  category: string;
  language: string;
  age_rating: string;
  attribution: string;
  topics?: string[];
};

type CinemaMe = { can_curate?: boolean };
const TOKEN_KEY = "kgm-village-chat-token-v2";

async function json<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const headers = new Headers(init?.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(path, { ...init, headers, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Could not complete that request");
  return data as T;
}

export default function ScienceCinemaDrive() {
  const [host, setHost] = useState<Element | null>(null);
  const [items, setItems] = useState<DriveMovie[]>([]);
  const [canCurate, setCanCurate] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [active, setActive] = useState<DriveMovie | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const data = await json<{ items: DriveMovie[] }>("/api/kgm-media/drive");
      setItems(data.items || []);
    } catch { setItems([]); }
    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token) return setCanCurate(false);
    try {
      const me = await json<CinemaMe>("/api/kgm-cinema/me", undefined, token);
      setCanCurate(Boolean(me.can_curate));
    } catch { setCanCurate(false); }
  }

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const next = document.querySelector(".kgm-cinema-content");
      if (next !== host) setHost(next);
      if (next) void refresh();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const token = localStorage.getItem(TOKEN_KEY) || "";
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setError("");
    try {
      await json("/api/kgm-media/drive", {
        method: "POST",
        body: JSON.stringify({
          drive_url: String(data.get("drive_url") || ""),
          title: String(data.get("title") || ""),
          description: String(data.get("description") || ""),
          category: String(data.get("category") || "Science"),
          language: String(data.get("language") || "English"),
          age_rating: String(data.get("age_rating") || "All ages"),
          attribution: String(data.get("attribution") || ""),
          topics: String(data.get("topics") || "").split(",").map(x => x.trim()).filter(Boolean),
          stem_confirmed: data.get("stem_confirmed") === "on",
          rights_confirmed: data.get("rights_confirmed") === "on",
        }),
      }, token);
      form.reset(); setAddOpen(false); await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not add Drive movie"); }
    finally { setBusy(false); }
  }

  if (!host) return null;
  return createPortal(<>
    <section className="kgm-drive-cinema">
      <div className="kgm-drive-head">
        <div><span>GOOGLE DRIVE LIBRARY</span><h2>More STEM films, still inside KGM.</h2><p>Drive-hosted science movies open in Google’s official embedded preview player.</p></div>
        {canCurate && <button type="button" onClick={() => setAddOpen(true)}>＋ Add Drive movie</button>}
      </div>
      {items.length ? <div className="kgm-drive-row">{items.map(item => <button className="kgm-drive-card" key={item.id} onClick={() => setActive(item)}>
        <span className="kgm-drive-play">▶</span><small>{item.category} · {item.language}</small><strong>{item.title}</strong><p>{item.description || "Open this STEM film inside KGM."}</p><b>GOOGLE DRIVE</b>
      </button>)}</div> : <div className="kgm-drive-empty"><span>☁</span><strong>Drive library is ready.</strong><p>{canCurate ? "Add a STEM movie from a shareable Google Drive link." : "Curated Drive-hosted STEM films will appear here."}</p></div>}
    </section>

    {active && <div className="kgm-drive-player-backdrop" onMouseDown={e => { if (e.currentTarget === e.target) setActive(null); }}>
      <div className="kgm-drive-player"><header><div><span>GOOGLE DRIVE · {active.category}</span><h3>{active.title}</h3></div><button onClick={() => setActive(null)} aria-label="Close Drive movie">×</button></header><iframe title={active.title} src={`https://drive.google.com/file/d/${encodeURIComponent(active.drive_id)}/preview`} allow="autoplay; fullscreen" allowFullScreen /><footer><strong>{active.attribution || "KGM Science Cinema"}</strong><span>{active.age_rating} · {active.language}</span></footer></div>
    </div>}

    {addOpen && canCurate && <div className="kgm-drive-add-backdrop"><form className="kgm-drive-add" onSubmit={submit}><header><div><span>KGM CURATOR DESK</span><h3>Add Google Drive STEM movie</h3></div><button type="button" onClick={() => setAddOpen(false)}>×</button></header>
      <label>Google Drive share link<input name="drive_url" required placeholder="https://drive.google.com/file/d/.../view" /></label>
      <label>Title<input name="title" required maxLength={120} /></label>
      <label>Description<textarea name="description" rows={3} maxLength={600} /></label>
      <div className="kgm-drive-fields"><label>Category<input name="category" defaultValue="Science" /></label><label>Language<input name="language" defaultValue="English" /></label><label>Age rating<input name="age_rating" defaultValue="All ages" /></label></div>
      <label>Attribution / creator<input name="attribution" placeholder="Creator or organization" /></label>
      <label>Science topics<input name="topics" placeholder="Space, gravity, astronomy" /></label>
      <label className="kgm-drive-check"><input type="checkbox" name="stem_confirmed" required /><span>This is STEM/educational science content.</span></label>
      <label className="kgm-drive-check"><input type="checkbox" name="rights_confirmed" required /><span>I have permission to share/view this Drive-hosted movie with the KGM community.</span></label>
      {error && <p className="kgm-drive-error">{error}</p>}
      <button className="kgm-drive-submit" disabled={busy}>{busy ? "Adding…" : "Add to KGM Drive Library →"}</button>
    </form></div>}
  </>, host);
}
