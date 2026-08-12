import crypto from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { Readable } from "node:stream";

const ROOT = process.env.KGM_DATA_DIR || process.env.KGM_CINEMA_STORAGE_DIR || "/var/data/kgm-cinema";
const DATA_DIR = join(ROOT, "kgm-data");
const UPLOAD_DIR = join(ROOT, "community-uploads");
const STATE_FILE = join(DATA_DIR, "state.json");
mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(UPLOAD_DIR, { recursive: true });

const emptyState = () => ({ users: [], sessions: {}, messages: [], uploads: [], cinema: {} });
function readState() { try { return { ...emptyState(), ...JSON.parse(readFileSync(STATE_FILE, "utf8")) }; } catch { return emptyState(); } }
function saveState(state) { const tmp = `${STATE_FILE}.tmp`; writeFileSync(tmp, JSON.stringify(state)); renameSync(tmp, STATE_FILE); }
function now() { return new Date().toISOString(); }
function id(prefix) { return `${prefix}-${crypto.randomUUID()}`; }
function json(res, status, value) { const body = Buffer.from(JSON.stringify(value)); res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": body.length, "cache-control": "no-store" }); res.end(body); }
function safeText(value, max = 500) { return String(value || "").replace(/[<>]/g, "").trim().slice(0, max); }
function safeName(value = "upload") { return basename(String(value)).replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-150) || "upload"; }
function role(value) { return ["Child", "Teen", "Adult"].includes(value) ? value : "Adult"; }
function publicUser(user) { return { id: user.id, email: user.email, nickname: user.nickname, role: user.role, email_verified: true, created_at: user.created_at }; }
function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) { const hash = crypto.scryptSync(String(password), salt, 64).toString("hex"); return { salt, hash }; }
function verifyPassword(password, user) { try { const got = crypto.scryptSync(String(password), user.password_salt, 64); return crypto.timingSafeEqual(got, Buffer.from(user.password_hash, "hex")); } catch { return false; } }
function tokenFrom(req) { const auth = String(req.headers.authorization || ""); return auth.startsWith("Bearer ") ? auth.slice(7).trim() : ""; }
function authUser(req, state) { const token = tokenFrom(req); const userId = token && state.sessions[token]; return userId ? state.users.find((u) => u.id === userId) || null : null; }
function requireUser(req, res, state) { const user = authUser(req, state); if (!user) { json(res, 401, { detail: "Sign in to your KGM account" }); return null; } return user; }
async function bodyJson(req) { return new Response(Readable.toWeb(req)).json().catch(() => ({})); }
function classify(filename, type = "") { const name = String(filename).toLowerCase(); const mime = String(type).toLowerCase(); if (mime.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(name)) return "image"; if (mime.startsWith("video/") || /\.(mp4|mov|m4v|3gp|3gpp|webm|mpeg|mpg|avi)$/i.test(name)) return "video"; if (mime.startsWith("audio/") || /\.(mp3|m4a|aac|wav|ogg|opus)$/i.test(name)) return "audio"; if (/\.apk$/i.test(name) || mime === "application/vnd.android.package-archive") return "apk"; return "other"; }
const LIMITS = { image: 10 * 1024 * 1024, audio: 25 * 1024 * 1024, video: 500 * 1024 * 1024, apk: 200 * 1024 * 1024 };
function serializeUpload(item) { return { ...item, file_url: `/api/kgm-uploads/${item.id}/file`, download_url: `/api/kgm-uploads/${item.id}/file?download=1`, community_warning: item.kind === "apk" ? "Unverified community APK" : null }; }
function cinemaState(state, userId) { state.cinema[userId] ||= { liked_ids: [], progress: {}, playlists: [] }; return state.cinema[userId]; }

export function getKgmLocalUser(req) { const state = readState(); return authUser(req, state); }

export async function handleKgmLocalApi(req, res, url) {
  const path = url.pathname;
  if (!path.startsWith("/api/kgm-")) return false;

  let state = readState();

  if (path === "/api/kgm-health") return json(res, 200, { status: "ok", service: "kgm-playstore", storage: ROOT }), true;

  if (path === "/api/kgm-chat/auth/register" && req.method === "POST") {
    const b = await bodyJson(req); const email = safeText(b.email, 180).toLowerCase(); const password = String(b.password || ""); const nickname = safeText(b.nickname, 24);
    if (!email.includes("@") || password.length < 4 || nickname.length < 2) return json(res, 400, { detail: "Enter a valid email, nickname and password" }), true;
    if (state.users.some((u) => u.email === email)) return json(res, 409, { detail: "An account with that email already exists" }), true;
    const pass = hashPassword(password); const user = { id: id("usr"), email, nickname, role: role(b.role), password_salt: pass.salt, password_hash: pass.hash, created_at: now() };
    state.users.push(user); const token = crypto.randomBytes(32).toString("hex"); state.sessions[token] = user.id; saveState(state);
    return json(res, 201, { token, user: publicUser(user), verification_required: false }), true;
  }
  if (path === "/api/kgm-chat/auth/login" && req.method === "POST") {
    const b = await bodyJson(req); const email = safeText(b.email, 180).toLowerCase(); const user = state.users.find((u) => u.email === email);
    if (!user || !verifyPassword(b.password, user)) return json(res, 401, { detail: "Email or password is incorrect" }), true;
    const token = crypto.randomBytes(32).toString("hex"); state.sessions[token] = user.id; saveState(state); return json(res, 200, { token, user: publicUser(user), verification_required: false }), true;
  }
  if (path === "/api/kgm-chat/auth/me" && req.method === "GET") { const user = requireUser(req, res, state); if (!user) return true; return json(res, 200, publicUser(user)), true; }
  if (path === "/api/kgm-chat/auth/me" && req.method === "PUT") { const user = requireUser(req, res, state); if (!user) return true; const b = await bodyJson(req); if (b.nickname !== undefined) user.nickname = safeText(b.nickname, 24) || user.nickname; if (b.role !== undefined) user.role = role(b.role); saveState(state); return json(res, 200, publicUser(user)), true; }

  if (path === "/api/kgm-chat/messages" && req.method === "GET") {
    const user = requireUser(req, res, state); if (!user) return true; const limit = Math.min(120, Math.max(1, Number(url.searchParams.get("limit") || 100))); const after = url.searchParams.get("after") || "";
    let items = state.messages.filter((m) => !m.hidden); if (after) { const i = items.findIndex((m) => m.id === after); if (i >= 0) items = items.slice(i + 1); } items = items.slice(-limit).map((m) => ({ ...m, mine: m.user_id === user.id })); return json(res, 200, { items }), true;
  }
  if (path === "/api/kgm-chat/messages" && req.method === "POST") { const user = requireUser(req, res, state); if (!user) return true; const b = await bodyJson(req); const text = safeText(b.text, 280); if (!text) return json(res, 400, { detail: "Write a message first" }), true; const m = { id: id("msg"), user_id: user.id, nickname: user.nickname, role: user.role, text, created_at: now(), mine: true, report_count: 0, hidden: false }; state.messages.push(m); state.messages = state.messages.slice(-1500); saveState(state); return json(res, 201, m), true; }
  let mm = path.match(/^\/api\/kgm-chat\/messages\/([^/]+)\/(report|delete)$/);
  if (mm && req.method === "POST") { const user = requireUser(req, res, state); if (!user) return true; const m = state.messages.find((x) => x.id === mm[1]); if (!m) return json(res, 404, { detail: "Message not found" }), true; if (mm[2] === "delete") { if (m.user_id !== user.id) return json(res, 403, { detail: "You can only delete your own message" }), true; m.hidden = true; } else { m.report_count = (m.report_count || 0) + 1; if (m.report_count >= 3) m.hidden = true; } saveState(state); return json(res, 200, { hidden: !!m.hidden }), true; }

  if (path === "/api/kgm-uploads" && req.method === "GET") { const kind = url.searchParams.get("kind") || "all"; const q = (url.searchParams.get("q") || "").toLowerCase(); const limit = Math.min(120, Math.max(1, Number(url.searchParams.get("limit") || 60))); let items = state.uploads.filter((x) => !x.hidden && (kind === "all" || x.kind === kind)); if (q) items = items.filter((x) => `${x.title} ${x.description} ${x.filename} ${x.uploader.nickname}`.toLowerCase().includes(q)); items = items.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, limit).map(serializeUpload); return json(res, 200, { items, public: true }), true; }
  if (path === "/api/kgm-uploads/mine" && req.method === "GET") { const user = requireUser(req, res, state); if (!user) return true; return json(res, 200, { items: state.uploads.filter((x) => !x.hidden && x.uploader.id === user.id).map(serializeUpload) }), true; }
  if (path === "/api/kgm-uploads" && req.method === "POST") {
    const user = requireUser(req, res, state); if (!user) return true; const contentLength = Number(req.headers["content-length"] || 0); if (contentLength > 505 * 1024 * 1024) return json(res, 413, { detail: "Upload is too large" }), true;
    const request = new Request(`http://localhost${req.url}`, { method: "POST", headers: req.headers, body: Readable.toWeb(req), duplex: "half" }); const form = await request.formData(); const file = form.get("file"); if (!(file instanceof File)) return json(res, 400, { detail: "Choose a file" }), true;
    const kind = classify(file.name, file.type); if (!LIMITS[kind]) return json(res, 415, { detail: "Unsupported file type" }), true; if (file.size > LIMITS[kind]) return json(res, 413, { detail: `${kind} uploads must be ${Math.round(LIMITS[kind] / 1024 / 1024)} MB or smaller` }), true; if (!["true", "on", "1"].includes(String(form.get("rights_confirmed")))) return json(res, 400, { detail: "Confirm that you have permission to share this file" }), true;
    const uploadId = id("upl"); const filename = `${uploadId}-${safeName(file.name)}`; const pathOnDisk = join(UPLOAD_DIR, filename); const digest = crypto.createHash("sha256"); const out = await import("node:fs").then((fs) => fs.createWriteStream(pathOnDisk)); const stream = Readable.fromWeb(file.stream()); await new Promise((resolve, reject) => { stream.on("data", (chunk) => digest.update(chunk)); stream.on("error", reject); out.on("error", reject); out.on("finish", resolve); stream.pipe(out); });
    const item = { id: uploadId, title: safeText(form.get("title"), 100) || file.name, description: safeText(form.get("description"), 500), kind, content_type: file.type || "application/octet-stream", filename: file.name, stored_filename: filename, size: file.size, sha256: digest.digest("hex"), created_at: now(), uploader: { id: user.id, nickname: user.nickname, role: user.role }, report_count: 0, hidden: false }; state = readState(); state.uploads.unshift(item); saveState(state); return json(res, 201, serializeUpload(item)), true;
  }
  let uf = path.match(/^\/api\/kgm-uploads\/([^/]+)\/file$/);
  if (uf && req.method === "GET") { const item = state.uploads.find((x) => x.id === uf[1] && !x.hidden); if (!item) return json(res, 404, { detail: "File not found" }), true; const filePath = join(UPLOAD_DIR, item.stored_filename); if (!existsSync(filePath)) return json(res, 404, { detail: "File is missing" }), true; const total = statSync(filePath).size; const range = req.headers.range; const disposition = url.searchParams.get("download") === "1" ? `attachment; filename="${safeName(item.filename)}"` : "inline"; if (range) { const [s, e] = range.replace(/bytes=/, "").split("-"); const start = Number(s || 0), end = Math.min(Number(e || total - 1), total - 1); res.writeHead(206, { "content-type": item.content_type, "accept-ranges": "bytes", "content-range": `bytes ${start}-${end}/${total}`, "content-length": end - start + 1, "content-disposition": disposition, "cache-control": "public, max-age=3600" }); createReadStream(filePath, { start, end }).pipe(res); return true; } res.writeHead(200, { "content-type": item.content_type, "content-length": total, "accept-ranges": "bytes", "content-disposition": disposition, "cache-control": "public, max-age=3600" }); createReadStream(filePath).pipe(res); return true; }
  let ui = path.match(/^\/api\/kgm-uploads\/([^/]+)$/);
  if (ui && req.method === "PUT") { const user = requireUser(req, res, state); if (!user) return true; const item = state.uploads.find((x) => x.id === ui[1]); if (!item) return json(res, 404, { detail: "Upload not found" }), true; if (item.uploader.id !== user.id) return json(res, 403, { detail: "You can only edit your own upload" }), true; const b = await bodyJson(req); item.title = safeText(b.title, 100) || item.title; item.description = safeText(b.description, 500); saveState(state); return json(res, 200, serializeUpload(item)), true; }
  if (ui && req.method === "DELETE") { const user = requireUser(req, res, state); if (!user) return true; const index = state.uploads.findIndex((x) => x.id === ui[1]); if (index < 0) return json(res, 404, { detail: "Upload not found" }), true; const item = state.uploads[index]; if (item.uploader.id !== user.id) return json(res, 403, { detail: "You can only delete your own upload" }), true; state.uploads.splice(index, 1); saveState(state); try { unlinkSync(join(UPLOAD_DIR, item.stored_filename)); } catch {} return json(res, 200, { deleted: true }), true; }
  let ur = path.match(/^\/api\/kgm-uploads\/([^/]+)\/report$/);
  if (ur && req.method === "POST") { const user = requireUser(req, res, state); if (!user) return true; const item = state.uploads.find((x) => x.id === ur[1]); if (!item) return json(res, 404, { detail: "Upload not found" }), true; item.report_count = (item.report_count || 0) + 1; if (item.report_count >= 3) item.hidden = true; saveState(state); return json(res, 200, { hidden: !!item.hidden }), true; }

  if (path === "/api/kgm-cinema/me" && req.method === "GET") { const user = requireUser(req, res, state); if (!user) return true; const me = cinemaState(state, user.id); saveState(state); return json(res, 200, { ...me, can_curate: user.role === "Adult" }), true; }
  let cp = path.match(/^\/api\/kgm-cinema\/movies\/([^/]+)\/progress$/);
  if (cp && req.method === "PUT") { const user = requireUser(req, res, state); if (!user) return true; const b = await bodyJson(req); const me = cinemaState(state, user.id); me.progress[decodeURIComponent(cp[1])] = { seconds: Number(b.seconds || 0), duration: Number(b.duration || 0), completed: Number(b.duration || 0) > 0 && Number(b.seconds || 0) >= Math.max(Number(b.duration) * .9, Number(b.duration) - 30), updated_at: now() }; saveState(state); return json(res, 200, me.progress[decodeURIComponent(cp[1])]), true; }
  let cl = path.match(/^\/api\/kgm-cinema\/movies\/([^/]+)\/like$/);
  if (cl && req.method === "POST") { const user = requireUser(req, res, state); if (!user) return true; const movieId = decodeURIComponent(cl[1]); const me = cinemaState(state, user.id); const has = me.liked_ids.includes(movieId); me.liked_ids = has ? me.liked_ids.filter((x) => x !== movieId) : [...me.liked_ids, movieId]; saveState(state); return json(res, 200, { liked: !has, like_count: state.users.reduce((n, u) => n + (cinemaState(state, u.id).liked_ids.includes(movieId) ? 1 : 0), 0) }), true; }
  if (path === "/api/kgm-cinema/playlists" && req.method === "POST") { const user = requireUser(req, res, state); if (!user) return true; const b = await bodyJson(req); const me = cinemaState(state, user.id); const p = { id: id("pl"), name: safeText(b.name, 60) || "My STEM List", movie_ids: [] }; me.playlists.unshift(p); saveState(state); return json(res, 201, p), true; }
  let pm = path.match(/^\/api\/kgm-cinema\/playlists\/([^/]+)\/movies\/([^/]+)$/);
  if (pm && req.method === "POST") { const user = requireUser(req, res, state); if (!user) return true; const me = cinemaState(state, user.id); const p = me.playlists.find((x) => x.id === pm[1]); if (!p) return json(res, 404, { detail: "Playlist not found" }), true; const movieId = decodeURIComponent(pm[2]); const has = p.movie_ids.includes(movieId); p.movie_ids = has ? p.movie_ids.filter((x) => x !== movieId) : [...p.movie_ids, movieId]; saveState(state); return json(res, 200, { added: !has, movie_ids: p.movie_ids }), true; }

  return false;
}
