import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const requiredFiles = [
  "server.js",
  "public/index.html",
  "public/app.js",
  "public/style.css",
  "public/manifest.webmanifest",
  "public/sw.js",
  "render.yaml",
  "Dockerfile"
];

const missing = requiredFiles.filter((file) => !existsSync(file));

if (missing.length) {
  fail(`Brakuje plikow: ${missing.join(", ")}`);
}

const manifest = JSON.parse(await readFile("public/manifest.webmanifest", "utf8"));

if (!manifest.name || !manifest.start_url || !manifest.icons?.length) {
  fail("Manifest PWA jest niepelny.");
}

const warnings = [];

if (!process.env.NVIDIA_API_KEY) {
  warnings.push("NVIDIA_API_KEY nie jest ustawiony w srodowisku deployu.");
}

if (process.env.TTS_PROVIDER === "azure" && (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION)) {
  warnings.push("TTS_PROVIDER=azure wymaga AZURE_SPEECH_KEY i AZURE_SPEECH_REGION.");
}

console.log("Deploy check: struktura projektu OK.");

if (warnings.length) {
  warnings.forEach((warning) => console.warn(`Uwaga: ${warning}`));
  process.exitCode = 1;
}

function fail(message) {
  console.error(`Deploy check failed: ${message}`);
  process.exit(1);
}
