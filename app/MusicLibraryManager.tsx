"use client";

import { FormEvent, useEffect, useState } from "react";

type StoredSong = {
  id: string;
  title: string;
  artist: string;
  language: "Telugu" | "English / Folk";
  fileName: string;
  mimeType: string;
  blob: Blob;
  createdAt: number;
};

const DB_NAME = "kgm-music-library";
const STORE_NAME = "songs";

function openSongDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readSongs(): Promise<StoredSong[]> {
  const db = await openSongDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result as StoredSong[]).sort((a, b) => b.createdAt - a.createdAt));
    request.onerror = () => reject(request.error);
  });
}

async function saveSong(song: StoredSong): Promise<void> {
  const db = await openSongDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(song);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export default function MusicLibraryManager() {
  const [songs, setSongs] = useState<StoredSong[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    readSongs().then(setSongs).catch(() => undefined);
  }, []);

  if (!songs.length) return null;

  const editingSong = songs.find((song) => song.id === editingId) ?? null;

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingSong) return;
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") || "").trim();
    const artist = String(data.get("artist") || "").trim();
    const language = String(data.get("language") || editingSong.language) as StoredSong["language"];

    if (!title || !artist) {
      setMessage("Song title and artist are required.");
      return;
    }

    const updated: StoredSong = {
      ...editingSong,
      title,
      artist,
      language,
    };

    try {
      await saveSong(updated);
      setSongs((current) => current.map((song) => song.id === updated.id ? updated : song));
      setMessage("Song details updated. Refreshing KGM so the player and cards use the new metadata…");
      window.location.reload();
    } catch {
      setMessage("Could not update this song. Check browser storage permissions.");
    }
  }

  return (
    <>
      <button className="music-library-manager-trigger" onClick={() => setOpen(true)} aria-label="Manage uploaded songs">
        <span aria-hidden="true">✎</span>
        <span><strong>Manage uploads</strong><small>Edit song details</small></span>
      </button>

      {open && (
        <div className="music-library-manager-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <section className="music-library-manager" role="dialog" aria-modal="true" aria-labelledby="music-manager-title">
            <div className="music-manager-head">
              <div><span>MY KGM MUSIC</span><h2 id="music-manager-title">Edit uploaded songs</h2><p>Change the visible song details without uploading the audio again.</p></div>
              <button onClick={() => setOpen(false)} aria-label="Close music manager">×</button>
            </div>

            {!editingSong ? (
              <div className="music-manager-list">
                {songs.map((song) => (
                  <button key={song.id} className="music-manager-song" onClick={() => { setEditingId(song.id); setMessage(""); }}>
                    <span className="music-manager-note">♫</span>
                    <span><strong>{song.title}</strong><small>{song.artist} · {song.language}</small></span>
                    <b>Edit →</b>
                  </button>
                ))}
              </div>
            ) : (
              <form className="music-manager-form" onSubmit={handleSave}>
                <button type="button" className="music-manager-back" onClick={() => { setEditingId(null); setMessage(""); }}>← All uploads</button>
                <div className="music-manager-file"><span>Audio file</span><strong>{editingSong.fileName}</strong><small>The audio file itself is never replaced by this edit.</small></div>
                <div className="music-manager-fields">
                  <label>Song title<input name="title" required defaultValue={editingSong.title} /></label>
                  <label>Artist / singer<input name="artist" required defaultValue={editingSong.artist} /></label>
                  <label>Language<select name="language" defaultValue={editingSong.language}><option>Telugu</option><option>English / Folk</option></select></label>
                </div>
                <div className="music-manager-actions"><button type="submit">Save changes</button><button type="button" onClick={() => { setEditingId(null); setMessage(""); }}>Cancel</button></div>
                {message && <p className="music-manager-message">{message}</p>}
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
