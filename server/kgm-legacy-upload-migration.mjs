import crypto from "node:crypto";
import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

function safeName(name = "file") {
  return basename(String(name)).replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-140) || "file";
}
function readJson(path, fallback) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return fallback; }
}
function saveJson(path, value) {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2));
  renameSync(tmp, path);
}

export async function migrateLegacyUploads({ storage, source }) {
  const base = String(source || "").replace(/\/$/, "");
  if (!base) return { skipped: true, reason: "no source" };

  const root = join(storage, "kgm-data");
  const uploadDir = join(root, "uploads");
  const uploadsPath = join(root, "uploads.json");
  const marker = join(root, "legacy-uploads-imported.json");
  mkdirSync(uploadDir, { recursive: true });
  if (existsSync(marker)) return { skipped: true, reason: "already imported" };

  console.log("[kgm-migration] starting one-time upload import");
  const response = await fetch(`${base}/api/kgm-uploads?kind=all&limit=120`, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Legacy upload list failed: ${response.status}`);
  const payload = await response.json();
  const incoming = Array.isArray(payload?.items) ? payload.items : [];
  const existing = readJson(uploadsPath, []);
  const known = new Set(existing.map((item) => String(item.legacy_source_id || item.id)));
  let imported = 0;
  let failed = 0;

  for (const item of incoming) {
    const sourceId = String(item?.id || "");
    if (!sourceId || known.has(sourceId)) continue;
    try {
      const fileUrl = new URL(String(item.file_url || item.download_url || ""), `${base}/`).toString();
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok || !fileResponse.body) throw new Error(`file ${fileResponse.status}`);
      const stored = `legacy-${sourceId}-${safeName(item.filename || "upload")}`;
      const path = join(uploadDir, stored);
      const hash = crypto.createHash("sha256");
      const reader = Readable.fromWeb(fileResponse.body);
      reader.on("data", (chunk) => hash.update(chunk));
      await pipeline(reader, createWriteStream(path, { flags: "wx" }));
      existing.push({
        id: sourceId,
        legacy_source_id: sourceId,
        title: String(item.title || item.filename || "Village upload").slice(0, 100),
        description: String(item.description || "").slice(0, 500),
        kind: item.kind,
        content_type: item.content_type || fileResponse.headers.get("content-type") || "application/octet-stream",
        filename: item.filename || stored,
        stored_filename: stored,
        size: Number(item.size || fileResponse.headers.get("content-length") || 0),
        sha256: item.sha256 || hash.digest("hex"),
        created_at: item.created_at || new Date().toISOString(),
        uploader: item.uploader || { id: "legacy", nickname: "KGM member", role: "Member" },
        report_count: Number(item.report_count || 0),
        hidden: false,
        imported_from_legacy: true,
      });
      known.add(sourceId);
      imported += 1;
      console.log(`[kgm-migration] imported ${sourceId}`);
    } catch (error) {
      failed += 1;
      console.error(`[kgm-migration] failed ${sourceId}:`, error?.message || error);
    }
  }

  existing.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  saveJson(uploadsPath, existing);
  saveJson(marker, { completed_at: new Date().toISOString(), imported, failed, source_count: incoming.length });
  console.log(`[kgm-migration] complete: ${imported} imported, ${failed} failed`);
  return { imported, failed, source_count: incoming.length };
}
