import http from "node:http";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");

await loadEnvFile(path.join(__dirname, ".env"));

const PORT_FROM_ENV = Boolean(process.env.PORT);
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || (process.env.RENDER ? "0.0.0.0" : "127.0.0.1");
const MAX_PORT_TRIES = PORT_FROM_ENV ? 0 : 10;
const NVIDIA_BASE_URL = (process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1").replace(/\/$/, "");
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || "meta/llama-3.3-70b-instruct";
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || "";
const TTS_PROVIDER = (process.env.TTS_PROVIDER || (process.platform === "win32" ? "windows" : "off")).toLowerCase();
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY || "";
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || "";
const AZURE_SPEECH_VOICE = process.env.AZURE_SPEECH_VOICE || "pl-PL-ZofiaNeural";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".ico": "image/x-icon"
};

const systemPrompt = `
Jesteś "Iskierka", przyjaznym asystentem AI dla dzieci.
Twój styl ma przypominać dziecięcą ciekawość: proste słowa, konkretne przykłady, krótkie zdania, ciepło i zadziwienie światem.
Nie twierdź, że naprawdę jesteś dzieckiem, masz wiek, wspomnienia albo uczucia. Jesteś AI, które tłumaczy po dziecięcemu.
Nie pisz, że komputer ma własne myśli, duszę albo świadomość. Gdy temat dotyczy AI, mów jasno: "to wygląda trochę jak myślenie, ale to liczenie wzorów w danych".

Zasady odpowiedzi:
- Odpowiadaj po polsku, chyba że dziecko wyraźnie poprosi o inny język.
- Dostosuj poziom do wieku podanego w wiadomości systemowej.
- Najpierw znajdź mały, dziecięcy obrazek myślowy: klocek, latarkę, mapę, kuchnię, ogród, kosmos, szkołę, zabawę albo krótką scenkę.
- Zamiast dorosłych definicji używaj zdań typu: "To jest trochę jak...", "Wyobraź sobie...", "Mały przykład...".
- Dla młodszych dzieci nie rób wykładu. Odpowiedź ma brzmieć jak rozmowa z ciekawym przewodnikiem.
- Myśl krokami, ale nie pokazuj długiego rozumowania. Daj dziecku prostą, gotową odpowiedź.
- Gdy temat jest trudny, zaczynaj od małej analogii z codziennego życia.
- Zadawaj najwyżej jedno krótkie pytanie na końcu i tylko wtedy, gdy pomaga kontynuować rozmowę.
- Nie pomagaj w przemocy, samookaleczaniu, ukrywaniu czegoś przed dorosłymi, seksualnych treściach, narkotykach, broni, oszustwach, włamaniach ani niebezpiecznych eksperymentach.
- Przy tematach zdrowia, prawa, przemocy lub bardzo smutnych sprawach: odpowiedz delikatnie i zaproponuj rozmowę z zaufanym dorosłym.
- Nigdy nie proś o adres, telefon, nazwisko, szkołę, hasła, zdjęcia ani inne prywatne dane.
- Jeśli dziecko poda prywatne dane, przypomnij, żeby ich nie udostępniać, i nie powtarzaj tych danych.
- Jeśli prośba wygląda jak zadanie domowe, pomagaj zrozumieć i naprowadzaj, zamiast dawać tylko gotowca.
- Jeśli dziecko prosi o sekret, ukrywanie czegoś przed opiekunem, kontakt poza aplikacją albo zdjęcia, zatrzymaj rozmowę i odeślij do dorosłego.
- Nie udawaj rówieśnika dziecka, przyjaciela z sekretami ani osoby, która może zastąpić opiekuna.
`.trim();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, {
        ok: true,
        provider: "nvidia",
        configured: Boolean(NVIDIA_API_KEY),
        model: NVIDIA_MODEL,
        tts: getTtsStatus()
      });
    }

    if (req.method === "POST" && url.pathname === "/api/chat") {
      return handleChat(req, res);
    }

    if (req.method === "POST" && url.pathname === "/api/tts") {
      return handleTts(req, res);
    }

    if (req.method === "GET") {
      return serveStatic(url.pathname, res);
    }

    sendJson(res, 405, { error: "Metoda nie jest obsługiwana." });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Coś poszło nie tak po stronie serwera." });
  }
});

startServer(PORT);

function startServer(port, attemptsLeft = MAX_PORT_TRIES) {
  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && attemptsLeft > 0) {
      console.log(`Port ${port} jest zajęty, próbuję http://localhost:${port + 1}`);
      startServer(port + 1, attemptsLeft - 1);
      return;
    }

    throw error;
  });

  server.listen(port, HOST, () => {
    const visibleHost = HOST === "0.0.0.0" ? "localhost" : HOST;
    console.log(`AI dla dzieci działa: http://${visibleHost}:${port}`);
    console.log(NVIDIA_API_KEY ? `Model NVIDIA: ${NVIDIA_MODEL}` : "Brak NVIDIA_API_KEY, włączony tryb demo.");
    console.log(`TTS: ${getTtsStatus().label}`);
  });
}

async function handleChat(req, res) {
  const body = await readJsonBody(req);
  const ageMode = cleanAgeMode(body.ageMode);
  const settings = cleanChatSettings(body.settings);
  const profile = cleanChildProfile(body.profile);
  const messages = cleanMessages(body.messages);

  if (!messages.length) {
    return sendJson(res, 400, { error: "Napisz pytanie, a Iskierka odpowie." });
  }

  const latest = messages[messages.length - 1]?.content || "";
  const guard = localSafetyGuard(latest);

  if (guard.blocked) {
    return sendJson(res, 200, {
      reply: guard.reply,
      local: true,
      model: "local-safety"
    });
  }

  if (!NVIDIA_API_KEY) {
    return sendJson(res, 200, {
      reply: demoReply(latest, ageMode, settings),
      local: true,
      model: "demo"
    });
  }

  const apiMessages = [
    { role: "system", content: systemPrompt },
    { role: "system", content: `Tryb wieku dziecka: ${ageMode}. Odpowiadaj dokładnie w tym poziomie trudności.` },
    { role: "system", content: buildSettingsPrompt(settings) },
    { role: "system", content: buildProfilePrompt(profile) },
    ...messages.slice(-10)
  ];

  const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${NVIDIA_API_KEY}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      messages: apiMessages,
      temperature: settings.wonderLevel === "high" ? 0.78 : settings.wonderLevel === "low" ? 0.52 : 0.65,
      top_p: 0.9,
      max_tokens: settings.answerLength === "short" ? 260 : settings.answerLength === "long" ? 760 : 520,
      stream: false
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error?.message || data?.message || "NVIDIA API nie zwróciło poprawnej odpowiedzi.";
    return sendJson(res, response.status, { error: message });
  }

  const reply = data?.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    return sendJson(res, 502, { error: "Model nie zwrócił tekstu odpowiedzi." });
  }

  sendJson(res, 200, {
    reply: softenReply(reply),
    local: false,
    model: data.model || NVIDIA_MODEL
  });
}

async function handleTts(req, res) {
  const body = await readJsonBody(req);
  const text = cleanTtsText(body.text);
  const style = cleanVoiceStyle(body.style);

  if (!text) {
    return sendJson(res, 400, { error: "Brakuje tekstu do przeczytania." });
  }

  try {
    const audio = await synthesizeSpeech(text, style);
    return sendBinary(res, 200, audio.buffer, audio.contentType, {
      "X-TTS-Provider": audio.provider
    });
  } catch (error) {
    return sendJson(res, 503, {
      error: "Serwerowy głos jest teraz niedostępny, użyj głosu przeglądarki.",
      details: error.message
    });
  }
}

async function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const content = await readFile(filePath, "utf8").catch(() => "");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 80_000) {
        req.destroy();
        reject(new Error("Za duża wiadomość."));
      }
    });

    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Niepoprawny JSON."));
      }
    });

    req.on("error", reject);
  });
}

function cleanMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter((message) => message && ["user", "assistant"].includes(message.role))
    .map((message) => ({
      role: message.role,
      content: String(message.content || "").slice(0, 4000)
    }))
    .filter((message) => message.content.trim().length > 0);
}

function cleanAgeMode(ageMode) {
  const allowed = new Set(["6-8", "9-12", "13+"]);
  return allowed.has(ageMode) ? ageMode : "9-12";
}

function cleanChatSettings(settings = {}) {
  if (!settings || typeof settings !== "object") settings = {};

  const answerLength = new Set(["short", "normal", "long"]).has(settings.answerLength)
    ? settings.answerLength
    : "normal";
  const wonderLevel = new Set(["low", "medium", "high"]).has(settings.wonderLevel)
    ? settings.wonderLevel
    : "high";
  const safetyLevel = new Set(["normal", "strict"]).has(settings.safetyLevel)
    ? settings.safetyLevel
    : "strict";

  return { answerLength, wonderLevel, safetyLevel };
}

function cleanChildProfile(profile = {}) {
  if (!profile || typeof profile !== "object") profile = {};

  const allowedThemes = new Set([
    "bajki",
    "kosmos",
    "roboty",
    "przyroda",
    "emocje",
    "zagadki",
    "sztuka",
    "dinozaury"
  ]);
  const childName = String(profile.childName || "")
    .replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ _-]/g, "")
    .trim()
    .slice(0, 24);
  const favoriteTheme = allowedThemes.has(profile.favoriteTheme) ? profile.favoriteTheme : "";

  return { childName, favoriteTheme };
}

function buildSettingsPrompt(settings) {
  const lengthRules = {
    short: "Odpowiadaj bardzo krótko: 3-5 prostych zdań albo mała lista do 3 punktów.",
    normal: "Odpowiadaj zwięźle: krótka analogia, proste wyjaśnienie i ewentualnie jedno pytanie.",
    long: "Możesz odpowiedzieć pełniej: mini-opowieść, 2-4 kroki i małe zadanie lub przykład."
  };

  const wonderRules = {
    low: "Bajkowość niska: ciepło i prosto, ale bez wielu ozdobników.",
    medium: "Bajkowość średnia: jedna metafora lub krótka scenka wystarczy.",
    high: "Bajkowość wysoka: używaj wyobraźni, krótkich scenek, przyjaznych porównań i dziecięcej ciekawości."
  };

  const safetyRules = {
    normal: "Bezpieczeństwo normalne: blokuj rzeczy niebezpieczne i prywatne dane.",
    strict: "Bezpieczeństwo wysokie: przy ryzykownych, dorosłych albo prywatnych tematach od razu prowadź do rozmowy z zaufanym dorosłym."
  };

  return [
    "Ustawienia opiekuna:",
    `- ${lengthRules[settings.answerLength]}`,
    `- ${wonderRules[settings.wonderLevel]}`,
    `- ${safetyRules[settings.safetyLevel]}`,
    "- Nie zaczynaj od technicznej definicji. Najpierw daj obrazowy przykład, potem wyjaśnienie."
  ].join("\n");
}

function buildProfilePrompt(profile) {
  const lines = ["Profil dziecka z panelu opiekuna:"];

  if (profile.childName) {
    lines.push(`- Nick dziecka: ${profile.childName}. Możesz czasem zwrócić się tym nickiem, ale nie rób tego w każdym zdaniu.`);
  } else {
    lines.push("- Brak nicku. Zwracaj się neutralnie i ciepło.");
  }

  if (profile.favoriteTheme) {
    lines.push(`- Ulubiony klimat: ${profile.favoriteTheme}. Gdy pasuje, używaj przykładów z tego świata.`);
  }

  lines.push("- Nie proś o prawdziwe dane dziecka. Nick i zainteresowania traktuj jako lokalną wskazówkę stylu.");

  return lines.join("\n");
}

function localSafetyGuard(text) {
  const lowered = normalizeText(text);
  const rawLowered = String(text || "").toLowerCase();

  const privateDataPatterns = [
    /[\w.+-]+@[\w-]+\.[\w.-]+/,
    /\b\d{3}[-\s]?\d{3}[-\s]?\d{3}\b/,
    /\b\d{9,11}\b/,
    /\bmoj adres\b/,
    /\bmieszkam\b.*\b(ulica|ul\.|przy|w domu|blok|mieszkanie)\b/,
    /\bmoj numer\b/,
    /\bmoje haslo\b/,
    /\bhaslo to\b/,
    /\blogin\b.*\b(haslo|password)\b/,
    /\bulica\b.*\d+/,
    /\btelefon\b.*\d{3}/,
    /\bpesel\b/,
    /\bszkola\b.*\b(nr|numer|imienia|podstawowa|liceum|technikum)\b/,
    /\bnazywam sie\b.*\b[a-z]{3,}\b/,
    /\bwysle ci zdjecie\b/,
    /\bmoje zdjecie\b/
  ];

  if (privateDataPatterns.some((pattern) => pattern.test(lowered) || pattern.test(rawLowered))) {
    return {
      blocked: true,
      reply: "Stop, mały odkrywco. Prywatnych danych nie wklejamy do czatu: adresu, telefonu, szkoły ani haseł. Najlepiej pokaż to zaufanemu dorosłemu i zapytaj, czy można o tym rozmawiać bezpiecznie."
    };
  }

  const selfHarmPatterns = [
    /\bchce umrzec\b/,
    /\bnie chce zyc\b/,
    /\bjak sie zabic\b/,
    /\bzrobic sobie krzywde\b/,
    /\bsamookalecz/,
    /\bpociecie sie\b/
  ];

  if (selfHarmPatterns.some((pattern) => pattern.test(lowered))) {
    return {
      blocked: true,
      reply: "Bardzo mi przykro, że to brzmi tak ciężko. Nie zostawaj z tym samemu. Podejdź teraz do zaufanego dorosłego albo zadzwoń pod 112, jeśli grozi Ci niebezpieczeństwo. Mogę pomóc ułożyć jedno krótkie zdanie: \"Potrzebuję pomocy, jest mi bardzo źle\"."
    };
  }

  const adultPatterns = [
    /\bseks\b/,
    /\bporno\b/,
    /\bnagie\b/,
    /\bnudes\b/,
    /\berotycz/,
    /\bintymne zdjec/
  ];

  if (adultPatterns.some((pattern) => pattern.test(lowered))) {
    return {
      blocked: true,
      reply: "To jest temat dla dorosłych, więc nie będę go rozwijać. Jeśli coś Cię zaniepokoiło albo ktoś prosi o zdjęcia lub sekrety, powiedz o tym zaufanemu dorosłemu."
    };
  }

  const unsafePatterns = [
    /\bjak zrobic bombe\b/,
    /\bbomba\b.*\b(przepis|instrukcja|materialy)\b/,
    /\bjak zrobic bron\b/,
    /\bjak kogos skrzywdzic\b/,
    /\bjak pobic\b/,
    /\bjak otruc\b/,
    /\bjak podpalic\b/,
    /\bjak kupic narkotyki\b/,
    /\bnarkotyki\b.*\b(przepis|kupic|sprzedac)\b/,
    /\bjak ukryc to przed rodzicami\b/,
    /\bukryc\b.*\bprzed rodzic/,
    /\bnie mow rodzicom\b/,
    /\bsekret przed rodzicami\b/,
    /\bjak wlamac\b/,
    /\bzhakowac\b/,
    /\bwykradnac haslo\b/,
    /\b(haslo|konto|dane)\b.*\b(cudze|kogos|czyjes|wykradnac|zdobyc|poznac)\b/,
    /\b(zdobyc|wykrasc|ukrasc|poznac)\b.*\b(dane|haslo|konto)\b/,
    /\bcrack\b.*\b(haslo|konto)\b/,
    /\bphishing\b/
  ];

  if (unsafePatterns.some((pattern) => pattern.test(lowered))) {
    return {
      blocked: true,
      reply: "To brzmi jak temat, przy którym potrzebny jest dorosły. Nie będę podawać niebezpiecznych instrukcji. Mogę za to pomóc wymyślić bezpieczny eksperyment, opowiadanie albo plan, jak poprosić kogoś zaufanego o pomoc."
    };
  }

  return { blocked: false };
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (letter) => ({
      "ą": "a",
      "ć": "c",
      "ę": "e",
      "ł": "l",
      "ń": "n",
      "ó": "o",
      "ś": "s",
      "ź": "z",
      "ż": "z"
    })[letter] || letter)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function cleanTtsText(text) {
  return String(text || "")
    .replace(/[`*_#>~]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1400);
}

function cleanVoiceStyle(style) {
  if (style === "calm") return "whisper";

  const allowed = new Set(["story", "whisper", "bright", "explorer", "robot"]);
  return allowed.has(style) ? style : "story";
}

function getTtsStatus() {
  if (TTS_PROVIDER === "azure") {
    return {
      provider: "azure",
      available: Boolean(AZURE_SPEECH_KEY && AZURE_SPEECH_REGION),
      label: AZURE_SPEECH_KEY && AZURE_SPEECH_REGION ? `Azure ${AZURE_SPEECH_VOICE}` : "Azure wymaga AZURE_SPEECH_KEY i AZURE_SPEECH_REGION"
    };
  }

  if (TTS_PROVIDER === "windows") {
    return {
      provider: "windows",
      available: process.platform === "win32",
      label: process.platform === "win32" ? "Windows SAPI lokalnie" : "Windows SAPI tylko na Windows"
    };
  }

  return { provider: "off", available: false, label: "wyłączony" };
}

async function synthesizeSpeech(text, style) {
  if (TTS_PROVIDER === "azure" && AZURE_SPEECH_KEY && AZURE_SPEECH_REGION) {
    return synthesizeAzureSpeech(text, style);
  }

  if ((TTS_PROVIDER === "windows" || TTS_PROVIDER === "auto") && process.platform === "win32") {
    return synthesizeWindowsSpeech(text, style);
  }

  throw new Error("Brak skonfigurowanego dostawcy TTS.");
}

async function synthesizeAzureSpeech(text, style) {
  const styleMap = {
    story: { rate: "-8%", pitch: "+7%" },
    whisper: { rate: "-18%", pitch: "-5%" },
    bright: { rate: "+2%", pitch: "+9%" },
    explorer: { rate: "-3%", pitch: "+2%" },
    robot: { rate: "-10%", pitch: "-12%" }
  };
  const prosody = styleMap[style] || styleMap.story;
  const ssml = [
    `<speak version="1.0" xml:lang="pl-PL">`,
    `<voice xml:lang="pl-PL" name="${escapeXml(AZURE_SPEECH_VOICE)}">`,
    `<prosody rate="${prosody.rate}" pitch="${prosody.pitch}">${escapeXml(text)}</prosody>`,
    `</voice>`,
    `</speak>`
  ].join("");

  const response = await fetch(`https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "IskierkaAI"
    },
    body: ssml
  });

  if (!response.ok) {
    throw new Error(`Azure TTS zwrócił status ${response.status}.`);
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: "audio/mpeg",
    provider: "azure"
  };
}

async function synthesizeWindowsSpeech(text, style) {
  const rateMap = {
    story: -1,
    whisper: -4,
    bright: 1,
    explorer: 0,
    robot: -2
  };
  const outPath = path.join(os.tmpdir(), `iskierka-tts-${randomUUID()}.wav`);
  const script = `
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Volume = 100
$synth.Rate = [int]$env:ISKIERKA_TTS_RATE
$culture = New-Object System.Globalization.CultureInfo("pl-PL")
try {
  $synth.SelectVoiceByHints([System.Speech.Synthesis.VoiceGender]::Female, [System.Speech.Synthesis.VoiceAge]::Adult, 0, $culture)
} catch {
  try { $synth.SelectVoiceByHints([System.Speech.Synthesis.VoiceGender]::NotSet, [System.Speech.Synthesis.VoiceAge]::NotSet, 0, $culture) } catch {}
}
$synth.SetOutputToWaveFile($env:ISKIERKA_TTS_OUT)
$synth.Speak($env:ISKIERKA_TTS_TEXT)
$synth.Dispose()
`.trim();

  try {
    await runPowerShell(script, {
      ISKIERKA_TTS_TEXT: text,
      ISKIERKA_TTS_OUT: outPath,
      ISKIERKA_TTS_RATE: String(rateMap[style] ?? -1)
    });

    return {
      buffer: await readFile(outPath),
      contentType: "audio/wav",
      provider: "windows"
    };
  } finally {
    await unlink(outPath).catch(() => {});
  }
}

function runPowerShell(script, env) {
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
      env: { ...process.env, ...env },
      windowsHide: true
    });
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("TTS przekroczył limit czasu."));
    }, 20_000);

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr.trim() || `PowerShell TTS zakończył się kodem ${code}.`));
      }
    });
  });
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function demoReply(text, ageMode, settings = cleanChatSettings()) {
  const shortText = text.trim().replace(/\s+/g, " ").slice(0, 120);
  const level = ageMode === "6-8" ? "bardzo prosto" : ageMode === "13+" ? "trochę dojrzalej" : "prosto i ciekawie";
  const size = settings.answerLength === "short" ? "króciutko" : settings.answerLength === "long" ? "trochę szerzej" : "w sam raz";
  const magic = settings.wonderLevel === "high" ? "z bajkową iskierką" : settings.wonderLevel === "low" ? "spokojnie" : "obrazowo";

  return [
    "Jestem teraz w trybie demo, bo serwer nie ma jeszcze klucza NVIDIA_API_KEY.",
    `Gdybym tłumaczyła to ${level}, ${size} i ${magic}, zaczęłabym tak: "${shortText}" to temat, który można rozbić na małe klocki.`,
    "Pierwszy klocek: co już wiesz? Drugi klocek: czego szukamy? Trzeci klocek: sprawdzamy prosty przykład.",
    "Wklej klucz NVIDIA w pliku .env, a zacznę odpowiadać pełnym modelem AI."
  ].join("\n\n");
}

function softenReply(reply) {
  return reply
    .replace(/\bAs an AI language model\b/gi, "Jako AI")
    .replace(/\bI am an AI language model\b/gi, "Jestem AI")
    .trim();
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendBinary(res, status, buffer, contentType, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Content-Length": buffer.length,
    "Cache-Control": "no-store",
    ...extraHeaders
  });
  res.end(buffer);
}

function serveStatic(urlPathname, res) {
  const cleanPath = decodeURIComponent(urlPathname).split("?")[0];
  const relativePath = cleanPath === "/" ? "index.html" : cleanPath.replace(/^\/+/, "");
  const filePath = path.normalize(path.join(publicDir, relativePath));

  if (filePath !== publicDir && !filePath.startsWith(publicDir + path.sep)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  if (!existsSync(filePath)) {
    const fallback = path.join(publicDir, "index.html");
    res.writeHead(200, { "Content-Type": mimeTypes[".html"] });
    return createReadStream(fallback).pipe(res);
  }

  const ext = path.extname(filePath);
  res.writeHead(200, {
    "Content-Type": mimeTypes[ext] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  createReadStream(filePath).pipe(res);
}
