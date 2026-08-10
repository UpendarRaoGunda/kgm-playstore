import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const androidDir = join(root, "android");
const properties = join(androidDir, "keystore.properties");

function run(command, args, cwd = androidDir) {
  const isBatch = process.platform === "win32" && command.toLowerCase().endsWith(".bat");
  const result = isBatch
    ? spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", command, ...args], { cwd, stdio: "inherit" })
    : spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!existsSync(properties)) {
  throw new Error("android/keystore.properties is required for a signed public release.");
}

const wrapper = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
run(wrapper, ["clean", "assembleRelease"]);

const source = join(androidDir, "app", "build", "outputs", "apk", "release", "app-release.apk");
if (!existsSync(source)) {
  throw new Error(`Expected signed APK was not created: ${source}`);
}

const localProperties = readFileSync(join(androidDir, "local.properties"), "utf8");
const sdkLine = localProperties.split(/\r?\n/).find((line) => line.startsWith("sdk.dir="));
if (!sdkLine) throw new Error("android/local.properties must define sdk.dir so the APK signature can be verified.");
const sdkDir = sdkLine.slice("sdk.dir=".length).replace(/\\:/g, ":").replace(/\\\\/g, "\\");
const buildToolsDir = join(sdkDir, "build-tools");
const buildToolsVersion = readdirSync(buildToolsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0];
const apksigner = join(buildToolsDir, buildToolsVersion, process.platform === "win32" ? "apksigner.bat" : "apksigner");
run(apksigner, ["verify", "--verbose", source]);

const outputDir = join(root, "public", "downloads");
const output = join(outputDir, "kgm-playstore-latest.apk");
mkdirSync(outputDir, { recursive: true });
copyFileSync(source, output);

const bytes = readFileSync(output);
const sha256 = createHash("sha256").update(bytes).digest("hex");
const release = {
  app: "KGM Playstore",
  packageName: "com.koratlagudem.kgmplaystore",
  versionName: "1.0.0",
  versionCode: 1,
  minimumAndroid: "Android 8.0 (API 26)",
  file: "/downloads/kgm-playstore-latest.apk",
  bytes: bytes.length,
  sha256,
};
writeFileSync(join(outputDir, "release.json"), `${JSON.stringify(release, null, 2)}\n`);
process.stdout.write(`Published ${release.file} (${bytes.length} bytes)\nSHA-256 ${sha256}\n`);
