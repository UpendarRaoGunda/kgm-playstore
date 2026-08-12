import crypto from "node:crypto";
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import Busboy from "busboy";

const MB = 1024 * 1024;
const MAX_IMAGE = 10 * MB;
const MAX_AUDIO = 25 * MB;
const MAX_VIDEO = 500 * MB;
const MAX_APK = 200 * MB;
const ALLOWED_ROLES = new Set(["Child", "Teen", "Adult"]);
const LINK_RE = /(?:https?:\/\/|www\.)\S+/i;
const EMAIL_RE = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/i;
const PHONE_RE = /(?<!\d)(?:\+?\d[\s\-()]*){8,}(?!\d)/;
const BLOCKED_TERMS = ["porn", "nude", "nudes", "sext", "sex chat", "rape", "kill yourself", "suicide pact", "meet me alone", "send photo", "send pics", "send number"];

let configured = null;

function now() { return new Date().toISOString(); }
function safeName(name = "file") { return basename(name).replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-140) || "file"; }
function sendJson(res, status, value) {
  const body = Buffer.from(JSON.stringify(value));
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": body.length, "cache-control": "no-store" });
  res.end(body);
}
function readJson(path, fallback) { try { return JSON.parse(readFileSync(path, "utf8")); } catch { return fallback; } }
function saveJson(path, value) { const tmp = `${path}.tmp`; writeFileSync(tmp, JSON.stringify(value, null, 2)); renameSync(tmp, path); }
async function readBody(req, max = MB) {
  const chunks = []; let total = 0;
  for await (const chunk of req) { total += chunk.length; if (total > max) throw Object.assign(new Error("Request too large"), { status: 413 }); chunks.push(chunk); }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw Object.assign(new Error("Invalid JSON"), { status: 400 }); }
}
function cleanNickname(value) {
  const next = String(value || "").replace(/\s+/g, " ").trim().slice(0, 24);
  if (next.length < 2) throw Object.assign(new Error("Choose a nickname"), { status: 400 });
  if (LINK_RE.test(next) || EMAIL_RE.test(next) || PHONE_RE.test(next)) throw Object.assign(new Error("Please use only a nickname, not contact information"), { status: 400 });
  return next;
}
function cleanMessage(value) {
  const next = String(value || "").replace(/\s+/g, " ").trim().slice(0, 280);
  if (!next) throw Object.assign(new Error("Write a message first"), { status: 400 });
  if (LINK_RE.test(next)) throw Object.assign(new Error("Links are not allowed in Village Chat"), { status: 400 });
  if (EMAIL_RE.test(next) || PHONE_RE.test(next)) throw Object.assign(new Error("Please do not share phone numbers or email addresses"), { status: 400 });
  const lower = next.toLowerCase();
  if (BLOCKED_TERMS.some((term) => lower.includes(term))) throw Object.assign(new Error("That message is not suitable for the village public room"), { status: 400 });
  return next;
}
function passwordHash(password, salt = crypto.randomBytes(16).toString("hex")) { return `${salt}:${crypto.scryptSync(String(password), salt, 64).toString("hex")}`; }
function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":"); if (!salt || !hash) return false;
  const actual = crypto.scryptSync(String(password), salt, 64); const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
function parseAuth(req) { const header = String(req.headers.authorization || ""); return header.startsWith("Bearer ") ? header.slice(7).trim() : ""; }
function kindFrom(filename, contentType) {
  const type = String(contentType || "").toLowerCase(), name = String(filename || "").toLowerCase();
  if (type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(name)) return "image";
  if (type.startsWith("video/") || /\.(mp4|mov|m4v|3gp|3gpp|webm|mpeg|mpg|avi)$/i.test(name)) return "video";
  if (type.startsWith("audio/") || /\.(mp3|m4a|aac|wav|ogg|opus)$/i.test(name)) return "audio";
  if (name.endsWith(".apk") || type === "application/vnd.android.package-archive" || type === "application/octet-stream") return "apk";
  return "unknown";
}
function limitFor(kind) { return kind === "image" ? MAX_IMAGE : kind === "audio" ? MAX_AUDIO : kind === "video" ? MAX_VIDEO : kind === "apk" ? MAX_APK : 0; }

export function configureKgmLocalApi(options) {
  if (configured) return configured;
  const { storage, renderCatalog, saveRenderCatalog, pinnedMovies = [] } = options;
  const root = join(storage, "kgm-data"), uploadDir = join(root, "uploads");
  mkdirSync(uploadDir, { recursive: true });
  const paths = { users: join(root, "users.json"), messages: join(root, "messages.json"), reports: join(root, "reports.json"), uploads: join(root, "uploads.json"), cinema: join(root, "cinema.json"), secret: join(root, "auth-secret.txt") };
  if (!existsSync(paths.secret)) writeFileSync(paths.secret, crypto.randomBytes(48).toString("hex"));
  const secret = readFileSync(paths.secret, "utf8").trim();
  const users = () => readJson(paths.users, []);
  const serializeUser = (u) => ({ id: u.id, email: u.email, nickname: u.nickname, role: u.role, email_verified: false, created_at: u.created_at });
  const signToken = (id) => { const payload = Buffer.from(JSON.stringify({ sub: `kgm:${id}`, exp: Date.now() + 90 * 86400000 })).toString("base64url"); const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url"); return `${payload}.${sig}`; };
  const tokenUserId = (token) => {
    const [payload, sig] = String(token || "").split("."); if (!payload || !sig) return "";
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return "";
    try { const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); return data?.sub?.startsWith("kgm:") && Number(data.exp) > Date.now() ? data.sub.slice(4) : ""; } catch { return ""; }
  };
  const authUser = (req) => { const id = tokenUserId(parseAuth(req)); return id ? users().find((u) => u.id === id && !u.disabled) || null : null; };
  const requireUser = (req) => { const user = authUser(req); if (!user) throw Object.assign(new Error("Please sign in with your KGM account"), { status: 401 }); return user; };
  const canCurate = (user) => Boolean(user && (user.role === "Adult" || String(process.env.KGM_CURATOR_EMAILS || "").split(",").map((x) => x.trim().toLowerCase()).includes(user.email)));
  const authResponse = (user) => ({ token: signToken(user.id), user: serializeUser(user), verification_required: false });
  const publicUpload = (item) => ({ ...item, file_url: `/api/kgm-uploads/${item.id}/file`, download_url: `/api/kgm-uploads/${item.id}/download` });
  const cinemaState = () => readJson(paths.cinema, { youtube: [], liked: {}, progress: {}, playlists: {} });
  const saveCinema = (state) => saveJson(paths.cinema, state);
  const renderMovies = () => renderCatalog().filter((x) => x.source === "render").map((x) => ({ ...x, stream_url: `/api/kgm-media/render/${x.id}/stream`, download_url: x.download_allowed ? `/api/kgm-media/render/${x.id}/download` : null }));
  const allMovies = () => { const state = cinemaState(); const local = [...renderMovies(), ...state.youtube]; const ids = new Set(local.map((x) => x.id)); return [...pinnedMovies.filter((x) => !ids.has(x.id)), ...local]; };

  async function parseUpload(req) {
    return await new Promise((resolve, reject) => {
      let bb; try { bb = Busboy({ headers: req.headers, limits: { files: 1, fields: 12, fileSize: MAX_VIDEO } }); } catch { reject(Object.assign(new Error("Use multipart/form-data for uploads"), { status: 400 })); return; }
      const fields = {}; let fileInfo = null, failed = null; let pending = Promise.resolve();
      bb.on("field", (name, value) => { fields[name] = String(value).slice(0, 5000); });
      bb.on("file", (_name, file, info) => {
        const kind = kindFrom(info.filename, info.mimeType), max = limitFor(kind);
        if (!max) { failed = Object.assign(new Error("Unsupported file type"), { status: 415 }); file.resume(); return; }
        const id = crypto.randomUUID(), stored = `${id}-${safeName(info.filename || "upload")}`, path = join(uploadDir, stored), hash = crypto.createHash("sha256");
        let size = 0, over = false; const out = createWriteStream(path, { flags: "wx" });
        pending = new Promise((done) => {
          file.on("data", (chunk) => { size += chunk.length; if (size > max && !over) { over = true; failed = Object.assign(new Error(`${kind === "video" ? "Video" : kind === "apk" ? "APK" : "File"} exceeds the ${Math.round(max / MB)} MB limit`), { status: 413 }); out.destroy(); } if (!over) hash.update(chunk); });
          file.on("limit", () => { over = true; failed = Object.assign(new Error("Video exceeds the 500 MB limit"), { status: 413 }); out.destroy(); });
          out.on("error", () => { if (!over) failed = Object.assign(new Error("Could not store upload"), { status: 500 }); });
          out.on("close", () => { if (over || failed) { try { rmSync(path, { force: true }); } catch {} } done(); });
          file.pipe(out);
        });
        fileInfo = { id, stored, path, original: info.filename || stored, contentType: info.mimeType || "application/octet-stream", kind, size: () => size, digest: () => hash.digest("hex") };
      });
      bb.on("error", reject);
      bb.on("finish", async () => { await pending; if (failed) return reject(failed); if (!fileInfo) return reject(Object.assign(new Error("Choose a file to upload"), { status: 400 })); resolve({ fields, file: fileInfo }); });
      req.pipe(bb);
    });
  }

  function serveUpload(req, res, item, disposition) {
    const path = join(uploadDir, item.stored_filename); if (!existsSync(path)) return sendJson(res, 404, { detail: "File missing" });
    const total = Number(item.size || 0), range = req.headers.range;
    const base = { "content-type": item.content_type || "application/octet-stream", "accept-ranges": "bytes", "cache-control": "private, max-age=3600", "content-disposition": `${disposition}; filename="${safeName(item.filename)}"` };
    if (range) { const [s, e] = String(range).replace(/bytes=/, "").split("-"); const start = Math.max(0, Number(s || 0)), end = Math.min(Number(e || total - 1), total - 1); if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return sendJson(res, 416, { detail: "Invalid range" }); res.writeHead(206, { ...base, "content-range": `bytes ${start}-${end}/${total}`, "content-length": end - start + 1 }); return createReadStream(path, { start, end }).pipe(res); }
    res.writeHead(200, { ...base, "content-length": total }); createReadStream(path).pipe(res);
  }

  async function handle(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`), path = url.pathname;
    try {
      if (path === "/api/kgm-chat/health" && req.method === "GET") return sendJson(res, 200, { status: "ok", room: "Koratlagudem Village Chat", storage: "KGM Render disk" }), true;
      if (path === "/api/kgm-chat/auth/register" && req.method === "POST") { const b = await readBody(req); const email = String(b.email || "").trim().toLowerCase(), password = String(b.password || ""), role = String(b.role || "Adult"); if (!/^\S+@\S+\.\S+$/.test(email)) throw Object.assign(new Error("Enter a valid email"), { status: 400 }); if (password.length < 4 || password.length > 64) throw Object.assign(new Error("Password must be 4–64 characters"), { status: 400 }); if (!ALLOWED_ROLES.has(role)) throw Object.assign(new Error("Choose Child, Teen or Adult"), { status: 400 }); const list = users(); if (list.some((u) => u.email === email)) throw Object.assign(new Error("An account already exists for that email. Please sign in"), { status: 409 }); const user = { id: crypto.randomUUID(), email, password_hash: passwordHash(password), nickname: cleanNickname(b.nickname), role, created_at: now(), updated_at: now(), disabled: false }; list.push(user); saveJson(paths.users, list); return sendJson(res, 201, authResponse(user)), true; }
      if (path === "/api/kgm-chat/auth/login" && req.method === "POST") { const b = await readBody(req); const user = users().find((u) => u.email === String(b.email || "").trim().toLowerCase()); if (!user || !verifyPassword(String(b.password || ""), user.password_hash)) throw Object.assign(new Error("Incorrect email or password"), { status: 401 }); return sendJson(res, 200, authResponse(user)), true; }
      if (path === "/api/kgm-chat/auth/me" && req.method === "GET") return sendJson(res, 200, serializeUser(requireUser(req))), true;
      if (path === "/api/kgm-chat/auth/me" && req.method === "PUT") { const current = requireUser(req), b = await readBody(req), list = users(), user = list.find((u) => u.id === current.id); if (b.nickname != null) user.nickname = cleanNickname(b.nickname); if (b.role != null) { if (!ALLOWED_ROLES.has(String(b.role))) throw Object.assign(new Error("Choose Child, Teen or Adult"), { status: 400 }); user.role = String(b.role); } user.updated_at = now(); saveJson(paths.users, list); return sendJson(res, 200, serializeUser(user)), true; }
      if (path === "/api/kgm-chat/messages" && req.method === "GET") { const user = requireUser(req), after = url.searchParams.get("after"), limit = Math.min(120, Math.max(1, Number(url.searchParams.get("limit") || 80))); let list = readJson(paths.messages, []).filter((m) => !m.hidden); if (after) { const idx = list.findIndex((m) => m.id === after); list = idx >= 0 ? list.slice(idx + 1) : []; } else list = list.slice(-limit); return sendJson(res, 200, { items: list.slice(0, limit).map((m) => ({ id: m.id, nickname: m.nickname, role: m.role, text: m.text, created_at: m.created_at, mine: m.author_id === user.id })), room: "Koratlagudem" }), true; }
      if (path === "/api/kgm-chat/messages" && req.method === "POST") { const user = requireUser(req), b = await readBody(req), list = readJson(paths.messages, []), item = { id: crypto.randomUUID(), author_id: user.id, nickname: user.nickname, role: user.role, text: cleanMessage(b.text), report_count: 0, hidden: false, created_at: now() }; list.push(item); saveJson(paths.messages, list.slice(-2000)); return sendJson(res, 201, { id: item.id, nickname: item.nickname, role: item.role, text: item.text, created_at: item.created_at, mine: true }), true; }
      let match = path.match(/^\/api\/kgm-chat\/messages\/([^/]+)\/(report|delete)$/);
      if (match) { const user = requireUser(req), list = readJson(paths.messages, []), item = list.find((m) => m.id === match[1] && !m.hidden); if (!item) throw Object.assign(new Error("Message not found"), { status: 404 }); if (match[2] === "delete") { if (item.author_id !== user.id) throw Object.assign(new Error("Message not found or not yours"), { status: 404 }); item.hidden = true; item.deleted_by_author = true; saveJson(paths.messages, list); return sendJson(res, 200, { ok: true }), true; } if (item.author_id === user.id) throw Object.assign(new Error("You can delete your own message instead"), { status: 400 }); const reports = readJson(paths.reports, []), key = `${item.id}:${user.id}`; if (!reports.some((r) => r.key === key)) { reports.push({ key, message_id: item.id, reporter_id: user.id, created_at: now() }); item.report_count = Number(item.report_count || 0) + 1; if (item.report_count >= 3) item.hidden = true; saveJson(paths.reports, reports.slice(-5000)); saveJson(paths.messages, list); } return sendJson(res, 201, { ok: true, hidden: Boolean(item.hidden) }), true; }

      if (path === "/api/kgm-uploads" && req.method === "GET") { const kind = url.searchParams.get("kind") || "all", q = String(url.searchParams.get("q") || "").toLowerCase(), limit = Math.min(120, Math.max(1, Number(url.searchParams.get("limit") || 80))); let list = readJson(paths.uploads, []).filter((x) => !x.hidden && (kind === "all" || x.kind === kind)); if (q) list = list.filter((x) => `${x.title} ${x.description} ${x.uploader?.nickname || ""}`.toLowerCase().includes(q)); return sendJson(res, 200, { items: list.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, limit).map(publicUpload) }), true; }
      if (path === "/api/kgm-uploads/mine" && req.method === "GET") { const user = requireUser(req); return sendJson(res, 200, { items: readJson(paths.uploads, []).filter((x) => !x.hidden && x.uploader?.id === user.id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).map(publicUpload) }), true; }
      if (path === "/api/kgm-uploads" && req.method === "POST") { const user = requireUser(req), { fields, file } = await parseUpload(req); if (!/^(true|on|1)$/i.test(String(fields.rights_confirmed || ""))) { try { rmSync(file.path, { force: true }); } catch {} throw Object.assign(new Error("Confirm that you own the file or have permission to share it"), { status: 400 }); } const item = { id: file.id, title: String(fields.title || file.original || "KGM upload").trim().slice(0, 120) || "KGM upload", description: String(fields.description || "").trim().slice(0, 600), kind: file.kind, content_type: file.contentType, filename: file.original, stored_filename: file.stored, size: file.size(), sha256: file.digest(), created_at: now(), uploader: { id: user.id, nickname: user.nickname, role: user.role }, report_count: 0, hidden: false, community_warning: file.kind === "apk" ? "Community APK — install only if you trust the creator." : null }; const list = readJson(paths.uploads, []); list.unshift(item); saveJson(paths.uploads, list); return sendJson(res, 201, publicUpload(item)), true; }
      match = path.match(/^\/api\/kgm-uploads\/([^/]+)\/(file|download|report)$/);
      if (match) { const list = readJson(paths.uploads, []), item = list.find((x) => x.id === match[1] && !x.hidden); if (!item) throw Object.assign(new Error("Upload not found"), { status: 404 }); if (match[2] === "file" && req.method === "GET") { serveUpload(req, res, item, "inline"); return true; } if (match[2] === "download" && req.method === "GET") { serveUpload(req, res, item, "attachment"); return true; } if (match[2] === "report" && req.method === "POST") { const user = requireUser(req); if (item.uploader?.id === user.id) throw Object.assign(new Error("You can delete your own upload instead"), { status: 400 }); const reports = readJson(paths.reports, []), key = `upload:${item.id}:${user.id}`; if (!reports.some((r) => r.key === key)) { reports.push({ key, upload_id: item.id, reporter_id: user.id, created_at: now() }); item.report_count = Number(item.report_count || 0) + 1; if (item.report_count >= 3) item.hidden = true; saveJson(paths.reports, reports.slice(-5000)); saveJson(paths.uploads, list); } return sendJson(res, 201, { ok: true, hidden: Boolean(item.hidden) }), true; } }
      match = path.match(/^\/api\/kgm-uploads\/([^/]+)$/);
      if (match && req.method === "PUT") { const user = requireUser(req), list = readJson(paths.uploads, []), item = list.find((x) => x.id === match[1] && !x.hidden); if (!item || item.uploader?.id !== user.id) throw Object.assign(new Error("Upload not found or not yours"), { status: 404 }); const b = await readBody(req); item.title = String(b.title || item.title).trim().slice(0, 120) || item.title; item.description = String(b.description ?? item.description).trim().slice(0, 600); saveJson(paths.uploads, list); return sendJson(res, 200, publicUpload(item)), true; }
      if (match && req.method === "DELETE") { const user = requireUser(req), list = readJson(paths.uploads, []), item = list.find((x) => x.id === match[1] && !x.hidden); if (!item || item.uploader?.id !== user.id) throw Object.assign(new Error("Upload not found or not yours"), { status: 404 }); item.hidden = true; saveJson(paths.uploads, list); try { rmSync(join(uploadDir, item.stored_filename), { force: true }); } catch {} return sendJson(res, 200, { ok: true }), true; }

      if (path === "/api/kgm-cinema/movies" && req.method === "GET") { const q = String(url.searchParams.get("q") || "").toLowerCase(), cat = String(url.searchParams.get("category") || ""); let items = allMovies(); if (cat && cat !== "All") items = items.filter((x) => x.category === cat); if (q) items = items.filter((x) => `${x.title} ${x.description || ""} ${x.category || ""} ${(x.topics || []).join(" ")}`.toLowerCase().includes(q)); return sendJson(res, 200, { items, categories: [...new Set(allMovies().map((x) => x.category).filter(Boolean))] }), true; }
      if (path === "/api/kgm-cinema/me" && req.method === "GET") { const user = requireUser(req), state = cinemaState(); return sendJson(res, 200, { liked_ids: state.liked[user.id] || [], progress: state.progress[user.id] || {}, playlists: state.playlists[user.id] || [], can_curate: canCurate(user) }), true; }
      match = path.match(/^\/api\/kgm-cinema\/movies\/([^/]+)\/(like|progress)$/);
      if (match?.[2] === "like" && req.method === "POST") { const user = requireUser(req), state = cinemaState(), movieId = decodeURIComponent(match[1]), ids = new Set(state.liked[user.id] || []), liked = !ids.has(movieId); if (liked) ids.add(movieId); else ids.delete(movieId); state.liked[user.id] = [...ids]; saveCinema(state); return sendJson(res, 200, { liked, like_count: Object.values(state.liked).filter((x) => Array.isArray(x) && x.includes(movieId)).length }), true; }
      if (match?.[2] === "progress" && req.method === "PUT") { const user = requireUser(req), b = await readBody(req), state = cinemaState(), movieId = decodeURIComponent(match[1]); state.progress[user.id] ||= {}; const seconds = Math.max(0, Number(b.seconds || 0)), duration = Math.max(0, Number(b.duration || 0)); state.progress[user.id][movieId] = { seconds, duration, completed: duration > 0 && seconds >= Math.max(duration * .9, duration - 30), updated_at: now() }; saveCinema(state); return sendJson(res, 200, state.progress[user.id][movieId]), true; }
      if (path === "/api/kgm-cinema/playlists" && req.method === "POST") { const user = requireUser(req), b = await readBody(req), state = cinemaState(); state.playlists[user.id] ||= []; const p = { id: crypto.randomUUID(), name: String(b.name || "My STEM List").trim().slice(0, 60), movie_ids: [] }; state.playlists[user.id].unshift(p); saveCinema(state); return sendJson(res, 201, p), true; }
      match = path.match(/^\/api\/kgm-cinema\/playlists\/([^/]+)\/movies\/([^/]+)$/);
      if (match && req.method === "POST") { const user = requireUser(req), state = cinemaState(); state.playlists[user.id] ||= []; const p = state.playlists[user.id].find((x) => x.id === match[1]); if (!p) throw Object.assign(new Error("Playlist not found"), { status: 404 }); const id = decodeURIComponent(match[2]), set = new Set(p.movie_ids || []), added = !set.has(id); if (added) set.add(id); else set.delete(id); p.movie_ids = [...set]; saveCinema(state); return sendJson(res, 200, { added, movie_ids: p.movie_ids }), true; }
      return false;
    } catch (err) { sendJson(res, Number(err?.status || 500), { detail: err instanceof Error ? err.message : "KGM API error" }); return true; }
  }

  configured = { handle, authUser, canCurate, paths, root };
  return configured;
}

export function getKgmLocalUser(req) { return configured?.authUser(req) || null; }
export async function handleKgmLocalApi(req, res, options) { if (!configured) configureKgmLocalApi(options); return configured.handle(req, res); }
