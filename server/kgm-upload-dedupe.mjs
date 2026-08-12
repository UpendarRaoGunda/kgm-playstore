import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function readJson(path, fallback) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return fallback; }
}
function saveJson(path, value) {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2));
  renameSync(tmp, path);
}

export function dedupeKgmUploads(storage) {
  const root = join(storage, "kgm-data");
  const uploadsPath = join(root, "uploads.json");
  const uploadDir = join(root, "uploads");
  const list = readJson(uploadsPath, []);
  if (!Array.isArray(list) || list.length < 2) return { removed: 0, kept: list?.length || 0 };

  const ordered = [...list].sort((a, b) => {
    const at = Date.parse(a?.created_at || "") || 0;
    const bt = Date.parse(b?.created_at || "") || 0;
    return at - bt;
  });
  const seen = new Map();
  const removeIds = new Set();
  const removedFiles = [];

  for (const item of ordered) {
    const digest = String(item?.sha256 || "").trim().toLowerCase();
    const kind = String(item?.kind || "").trim().toLowerCase();
    // Only remove exact-content duplicates. Kind is included to avoid accidental
    // cross-category collisions if legacy metadata was malformed.
    const key = digest ? `${kind}:${digest}` : "";
    if (!key) continue;
    if (!seen.has(key)) {
      seen.set(key, item.id);
      continue;
    }
    removeIds.add(item.id);
    if (item?.stored_filename) removedFiles.push(join(uploadDir, item.stored_filename));
  }

  if (!removeIds.size) return { removed: 0, kept: list.length };
  const kept = list.filter((item) => !removeIds.has(item.id));
  saveJson(uploadsPath, kept);
  for (const file of removedFiles) {
    try { if (existsSync(file)) rmSync(file, { force: true }); } catch {}
  }
  console.log(`[kgm-dedupe] removed ${removeIds.size} duplicate uploads; ${kept.length} unique uploads remain`);
  return { removed: removeIds.size, kept: kept.length };
}
