import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders the APK hub with preview metadata and core safety copy", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, developmentPreviewMeta);
  assert.match(html, /Koratlagudem APK Hub/i);
  assert.match(html, /Small village/i);
  assert.match(html, /Mentor-reviewed releases/i);
  assert.match(html, /Published apps will include a verified APK/i);
  assert.match(html, /Download KGM Android APK/i);
  assert.match(html, /Install on PC/i);
  assert.match(html, /rel=["']manifest["'][^>]*site-manifest\.json|site-manifest\.json[^>]*rel=["']manifest["']/i);
  assert.match(html, /kgm-playstore\.onrender\.com\/downloads\/kgm-playstore-latest\.apk/i);
});

test("publishes a complete and privacy-conscious PWA shell", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../public/site-manifest.json", import.meta.url), "utf8"),
  );
  const serviceWorker = await readFile(
    new URL("../public/service-worker.js", import.meta.url),
    "utf8",
  );
  const offlinePage = await readFile(
    new URL("../public/offline.html", import.meta.url),
    "utf8",
  );

  assert.equal(manifest.id, "/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.scope, "/");
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192" && icon.type === "image/png"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"));
  assert.match(serviceWorker, /offline\.html/);
  assert.match(serviceWorker, /pathname\.startsWith\("\/api\/"\)/);
  assert.match(serviceWorker, /pathname\.startsWith\("\/downloads\/"\)/);
  assert.match(serviceWorker, /SKIP_WAITING/);
  assert.match(offlinePage, /You are offline/i);
});

test("publishes a checksum-matched native Android APK", async () => {
  const release = JSON.parse(
    await readFile(new URL("../public/downloads/release.json", import.meta.url), "utf8"),
  );
  const apk = await readFile(
    new URL("../public/downloads/kgm-playstore-latest.apk", import.meta.url),
  );

  assert.equal(release.packageName, "com.koratlagudem.kgmplaystore");
  assert.equal(release.versionName, "1.0.0");
  assert.equal(release.bytes, apk.length);
  assert.equal(createHash("sha256").update(apk).digest("hex"), release.sha256);
});
