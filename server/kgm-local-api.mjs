import { join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { configureKgmLocalApi, getKgmLocalUser as getConfiguredUser, handleKgmLocalApi as handleConfiguredApi } from "./kgm-local-api-impl.mjs";
import { dedupeKgmUploads } from "./kgm-upload-dedupe.mjs";

let ready = false;
function ensureReady() {
  if (ready) return;
  const storage = process.env.KGM_CINEMA_STORAGE_DIR || "/var/data/kgm-cinema";
  const catalogPath = join(storage, "catalog.json");
  const renderCatalog = () => {
    try { return JSON.parse(readFileSync(catalogPath, "utf8")); } catch { return []; }
  };
  const saveRenderCatalog = (items) => writeFileSync(catalogPath, JSON.stringify(items, null, 2));
  dedupeKgmUploads(storage);
  configureKgmLocalApi({ storage, renderCatalog, saveRenderCatalog, pinnedMovies: [] });
  ready = true;
}

export function getKgmLocalUser(req) {
  ensureReady();
  return getConfiguredUser(req);
}

export async function handleKgmLocalApi(req, res) {
  ensureReady();
  return handleConfiguredApi(req, res);
}
