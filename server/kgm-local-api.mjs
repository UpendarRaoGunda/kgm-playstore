import { join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { configureKgmLocalApi, getKgmLocalUser as getConfiguredUser, handleKgmLocalApi as handleConfiguredApi } from "./kgm-local-api-impl.mjs";
import { migrateLegacyUploads } from "./kgm-legacy-upload-migration.mjs";

let ready = false;
let migrationPromise = Promise.resolve();

function ensureReady() {
  if (ready) return;
  const storage = process.env.KGM_CINEMA_STORAGE_DIR || "/var/data/kgm-cinema";
  const catalogPath = join(storage, "catalog.json");
  const renderCatalog = () => {
    try { return JSON.parse(readFileSync(catalogPath, "utf8")); } catch { return []; }
  };
  const saveRenderCatalog = (items) => writeFileSync(catalogPath, JSON.stringify(items, null, 2));
  configureKgmLocalApi({ storage, renderCatalog, saveRenderCatalog, pinnedMovies: [] });
  migrationPromise = migrateLegacyUploads({
    storage,
    source: process.env.KGM_LEGACY_UPLOAD_SOURCE || "",
  }).catch((error) => {
    console.error("[kgm-migration] one-time import failed:", error?.message || error);
  });
  ready = true;
}

// Initialize KGM-owned storage and any one-time migration during service boot,
// rather than waiting for the first Gallery/API request.
ensureReady();

export function getKgmLocalUser(req) {
  ensureReady();
  return getConfiguredUser(req);
}

export async function handleKgmLocalApi(req, res) {
  ensureReady();
  await migrationPromise;
  return handleConfiguredApi(req, res);
}
