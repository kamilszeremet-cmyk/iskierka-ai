import http from "node:http";
import { spawn } from "node:child_process";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
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
const configuredFreeLimit = Number.parseInt(process.env.FREE_DAILY_LIMIT || "15", 10);
const FREE_DAILY_LIMIT = Number.isFinite(configuredFreeLimit) ? Math.max(0, configuredFreeLimit) : 15;
const PLUS_PRICE_LABEL = process.env.PLUS_PRICE_LABEL || "29 zł / mies.";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_PRICE_PLUS_MONTHLY = process.env.STRIPE_PRICE_PLUS_MONTHLY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Iskierka <onboarding@resend.dev>";
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
const configuredBetaTarget = Number.parseInt(process.env.BETA_TARGET_SIZE || "10", 10);
const BETA_TARGET_SIZE = Number.isFinite(configuredBetaTarget) ? Math.max(1, configuredBetaTarget) : 10;

const dailyUsage = new Map();
const parentCodes = new Map();
const parentAccounts = new Map();
const parentSessions = new Map();
const betaSignups = new Map();
const analyticsCounters = new Map();
const checkoutSessions = new Map();

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
        tts: getTtsStatus(),
    commerce: {
      freeDailyLimit: FREE_DAILY_LIMIT,
      checkoutConfigured: hasStripeCheckout(),
      emailConfigured: hasEmailDelivery(),
      price: PLUS_PRICE_LABEL,
      betaTarget: BETA_TARGET_SIZE
    }
  });
}

    if (req.method === "GET" && url.pathname === "/api/commerce/status") {
      return handleCommerceStatus(req, res);
    }

    if (req.method === "GET" && url.pathname === "/api/analytics/summary") {
      return handleAnalyticsSummary(req, res);
    }

    if (req.method === "POST" && url.pathname === "/api/chat") {
      return handleChat(req, res);
    }

    if (req.method === "POST" && url.pathname === "/api/tts") {
      return handleTts(req, res);
    }

    if (req.method === "POST" && url.pathname === "/api/parent/request-code") {
      return handleParentCodeRequest(req, res);
    }

    if (req.method === "POST" && url.pathname === "/api/parent/verify-code") {
      return handleParentCodeVerify(req, res);
    }

    if (req.method === "POST" && url.pathname === "/api/checkout/session") {
      return handleCheckoutSession(req, res);
    }

    if (req.method === "POST" && url.pathname === "/api/beta/signup") {
      return handleBetaSignup(req, res);
    }

    if (req.method === "POST" && url.pathname === "/api/analytics/event") {
      return handleAnalyticsEvent(req, res);
    }

    if (req.method === "POST" && url.pathname === "/api/stripe/webhook") {
      return handleStripeWebhook(req, res);
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

async function handleCommerceStatus(req, res) {
  const access = getAccessContext(req, {});
  sendJson(res, 200, {
    ok: true,
    usage: access.status,
    account: accountPayload(access.account),
    checkoutConfigured: hasStripeCheckout(),
    emailConfigured: hasEmailDelivery(),
    price: PLUS_PRICE_LABEL,
    betaCount: betaSignups.size,
    betaTarget: BETA_TARGET_SIZE
  });
}

async function handleAnalyticsSummary(req, res) {
  sendJson(res, 200, {
    ok: true,
    summary: buildAnalyticsSummary(),
    beta: {
      count: betaSignups.size,
      target: BETA_TARGET_SIZE,
      remaining: Math.max(0, BETA_TARGET_SIZE - betaSignups.size)
    }
  });
}

async function handleParentCodeRequest(req, res) {
  const body = await readJsonBody(req);
  const email = cleanEmail(body.email);

  if (!email) {
    return sendJson(res, 400, { error: "Podaj poprawny email rodzica." });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  parentCodes.set(email, {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000
  });
  ensureParentAccount(email);
  trackServerEvent("parent_code_requested", { emailHash: hashValue(email) });
  const delivery = await sendParentLoginCode(email, code);

  sendJson(res, 200, {
    ok: true,
    email: maskEmail(email),
    delivery: delivery.mode,
    devCode: delivery.showCode ? code : undefined,
    message: delivery.message
  });
}

async function handleParentCodeVerify(req, res) {
  const body = await readJsonBody(req);
  const email = cleanEmail(body.email);
  const code = String(body.code || "").replace(/\D/g, "").slice(0, 6);
  const saved = email ? parentCodes.get(email) : null;

  if (!email || !code) {
    return sendJson(res, 400, { error: "Podaj email i kod rodzica." });
  }

  if (!saved || saved.expiresAt < Date.now() || saved.code !== code) {
    return sendJson(res, 401, { error: "Kod jest nieprawidłowy albo wygasł." });
  }

  parentCodes.delete(email);
  const account = ensureParentAccount(email);
  const token = randomUUID();
  parentSessions.set(token, {
    email,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
  });
  trackServerEvent("parent_login", { emailHash: hashValue(email) });

  sendJson(res, 200, {
    ok: true,
    token,
    account: accountPayload(account),
    usage: getUsageStatus(getClientId(req, body), account)
  });
}

async function handleCheckoutSession(req, res) {
  const body = await readJsonBody(req);
  const access = getAccessContext(req, body);

  if (!access.account) {
    return sendJson(res, 401, {
      error: "Najpierw zaloguj konto rodzica, żeby kupić Plan Plus.",
      code: "PARENT_LOGIN_REQUIRED"
    });
  }

  trackServerEvent("checkout_click", { plan: "plus", configured: hasStripeCheckout() });

  if (!hasStripeCheckout()) {
    const beta = saveBetaSignup(access.account.email, "checkout_fallback");
    return sendJson(res, 200, {
      ok: true,
      mode: "beta",
      betaPosition: beta.position,
      betaTarget: BETA_TARGET_SIZE,
      message: "Stripe nie jest jeszcze skonfigurowany. Zapisaliśmy rodzica do bety sprzedażowej Planu Plus.",
      usage: access.status
    });
  }

  const baseUrl = getPublicBaseUrl(req);
  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("line_items[0][price]", STRIPE_PRICE_PLUS_MONTHLY);
  params.set("line_items[0][quantity]", "1");
  params.set("customer_email", access.account.email);
  params.set("client_reference_id", hashValue(access.account.email));
  params.set("success_url", `${baseUrl}/?checkout=success`);
  params.set("cancel_url", `${baseUrl}/rodzic#plan-plus`);
  params.set("metadata[parent_email]", access.account.email);
  params.set("metadata[parent_email_hash]", hashValue(access.account.email));
  params.set("metadata[product]", "iskierka_plus");

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.url) {
    const error = data?.error?.message || "Nie udało się utworzyć płatności Stripe.";
    return sendJson(res, 502, { error });
  }

  if (data.id) {
    checkoutSessions.set(data.id, {
      email: access.account.email,
      createdAt: new Date().toISOString()
    });
  }

  sendJson(res, 200, {
    ok: true,
    mode: "stripe",
    url: data.url
  });
}

async function handleBetaSignup(req, res) {
  const body = await readJsonBody(req);
  const access = getAccessContext(req, body);
  const email = access.account?.email || cleanEmail(body.email);

  if (!email) {
    return sendJson(res, 400, { error: "Podaj email rodzica albo zaloguj konto rodzica." });
  }

  const beta = saveBetaSignup(email, body.source || "manual");
  trackServerEvent("beta_signup", { source: beta.source });
  sendJson(res, 200, {
    ok: true,
    betaPosition: beta.position,
    betaTarget: BETA_TARGET_SIZE,
    message: "Rodzic zapisany do bety sprzedażowej.",
    account: accountPayload(ensureParentAccount(email))
  });
}

async function handleAnalyticsEvent(req, res) {
  const body = await readJsonBody(req);
  const event = cleanAnalyticsEvent(body.event);

  if (event) {
    trackServerEvent(event, {
      path: cleanAnalyticsPath(body.path),
      plan: cleanPlan(body.plan)
    });
  }

  sendJson(res, 200, { ok: true });
}

async function handleStripeWebhook(req, res) {
  const rawBody = await readRawBody(req);
  const signature = req.headers["stripe-signature"];

  if (!STRIPE_WEBHOOK_SECRET) {
    return sendJson(res, 400, { error: "Brakuje STRIPE_WEBHOOK_SECRET." });
  }

  if (!verifyStripeSignature(rawBody, signature, STRIPE_WEBHOOK_SECRET)) {
    trackServerEvent("stripe_webhook_rejected");
    return sendJson(res, 400, { error: "Nieprawidłowy podpis Stripe." });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return sendJson(res, 400, { error: "Niepoprawny JSON webhooka Stripe." });
  }

  const type = String(event.type || "");
  if (type === "checkout.session.completed") {
    const session = event.data?.object || {};
    const email = resolveCheckoutEmail(session);

    if (email) {
      const account = activatePlusForEmail(email, {
        stripeCustomerId: session.customer || "",
        stripeSubscriptionId: session.subscription || "",
        checkoutSessionId: session.id || ""
      });
      trackServerEvent("plus_activated", { plan: "plus" });
      return sendJson(res, 200, {
        received: true,
        activated: true,
        account: accountPayload(account)
      });
    }

    trackServerEvent("stripe_webhook_missing_email");
    return sendJson(res, 200, { received: true, activated: false, reason: "missing_email" });
  }

  if (type === "customer.subscription.deleted" || type === "customer.subscription.paused") {
    const subscription = event.data?.object || {};
    const email = resolveSubscriptionEmail(subscription);
    if (email) deactivatePlusForEmail(email);
  }

  sendJson(res, 200, { received: true });
}

async function handleChat(req, res) {
  const body = await readJsonBody(req);
  const ageMode = cleanAgeMode(body.ageMode);
  const settings = cleanChatSettings(body.settings);
  const profile = cleanChildProfile(body.profile);
  const messages = cleanMessages(body.messages);
  const access = getAccessContext(req, body);

  if (!messages.length) {
    return sendJson(res, 400, { error: "Napisz pytanie, a Iskierka odpowie." });
  }

  if (!access.allowed) {
    trackServerEvent("free_limit_reached", { plan: access.status.plan });
    return sendJson(res, 402, {
      error: `Limit Free na dziś to ${FREE_DAILY_LIMIT} odpowiedzi. Zaloguj konto rodzica i włącz Plan Plus albo wróć jutro.`,
      code: "FREE_LIMIT_REACHED",
      usage: access.status
    });
  }

  const latest = messages[messages.length - 1]?.content || "";
  const guard = localSafetyGuard(latest);

  if (guard.blocked) {
    return sendJson(res, 200, {
      reply: guard.reply,
      local: true,
      model: "local-safety",
      usage: access.status
    });
  }

  if (!NVIDIA_API_KEY) {
    const usage = markChatUsage(access);
    return sendJson(res, 200, {
      reply: demoReply(latest, ageMode, settings),
      local: true,
      model: "demo",
      usage
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

  const usage = markChatUsage(access);
  sendJson(res, 200, {
    reply: softenReply(reply),
    local: false,
    model: data.model || NVIDIA_MODEL,
    usage
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

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 200_000) {
        req.destroy();
        reject(new Error("Za duży webhook."));
      }
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

function getAccessContext(req, body = {}) {
  const clientId = getClientId(req, body);
  const account = getAccountFromToken(body.parentToken || req.headers["x-iskierka-parent-token"]);
  const status = getUsageStatus(clientId, account);

  return {
    clientId,
    account,
    status,
    allowed: status.plan === "plus" || status.remaining > 0
  };
}

function markChatUsage(access) {
  if (access.status.plan === "plus") {
    trackServerEvent("chat_reply", { plan: "plus" });
    return getUsageStatus(access.clientId, access.account);
  }

  const key = usageKey(access.clientId, access.account);
  const current = dailyUsage.get(key) || { day: currentDayKey(), count: 0 };
  const next = current.day === currentDayKey()
    ? { ...current, count: current.count + 1 }
    : { day: currentDayKey(), count: 1 };
  dailyUsage.set(key, next);
  trackServerEvent("chat_reply", { plan: "free" });
  return getUsageStatus(access.clientId, access.account);
}

function getUsageStatus(clientId, account = null) {
  const plan = account?.plus ? "plus" : "free";
  const key = usageKey(clientId, account);
  const current = dailyUsage.get(key);
  const used = current?.day === currentDayKey() ? current.count : 0;
  const remaining = plan === "plus" ? null : Math.max(0, FREE_DAILY_LIMIT - used);

  return {
    plan,
    price: PLUS_PRICE_LABEL,
    dailyLimit: plan === "plus" ? null : FREE_DAILY_LIMIT,
    used,
    remaining,
    checkoutConfigured: hasStripeCheckout()
  };
}

function usageKey(clientId, account = null) {
  return account?.email ? `parent:${hashValue(account.email)}` : `client:${clientId}`;
}

function getClientId(req, body = {}) {
  const value = String(body.clientId || req.headers["x-iskierka-client-id"] || "").trim();
  if (/^[a-zA-Z0-9_-]{12,80}$/.test(value)) return value;
  return `anon-${hashValue(req.socket?.remoteAddress || "local").slice(0, 24)}`;
}

function currentDayKey() {
  return new Date().toISOString().slice(0, 10);
}

function cleanEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return "";
  return email.slice(0, 160);
}

function ensureParentAccount(email) {
  const existing = parentAccounts.get(email);
  if (existing) return existing;

  const account = {
    email,
    plus: false,
    createdAt: new Date().toISOString()
  };
  parentAccounts.set(email, account);
  return account;
}

function getAccountFromToken(token) {
  const value = String(token || "").trim();
  if (!value) return null;

  const session = parentSessions.get(value);
  if (!session || session.expiresAt < Date.now()) {
    parentSessions.delete(value);
    return null;
  }

  return parentAccounts.get(session.email) || null;
}

function activatePlusForEmail(email, stripe = {}) {
  const account = ensureParentAccount(email);
  account.plus = true;
  account.plusActivatedAt = new Date().toISOString();
  account.stripeCustomerId = stripe.stripeCustomerId || account.stripeCustomerId || "";
  account.stripeSubscriptionId = stripe.stripeSubscriptionId || account.stripeSubscriptionId || "";
  account.checkoutSessionId = stripe.checkoutSessionId || account.checkoutSessionId || "";
  return account;
}

function deactivatePlusForEmail(email) {
  const account = parentAccounts.get(email);
  if (!account) return null;
  account.plus = false;
  account.plusDeactivatedAt = new Date().toISOString();
  trackServerEvent("plus_deactivated", { plan: "plus" });
  return account;
}

function accountPayload(account) {
  if (!account) return null;
  return {
    email: maskEmail(account.email),
    plan: account.plus ? "plus" : "free",
    plus: Boolean(account.plus)
  };
}

function maskEmail(email) {
  const [name, domain] = String(email).split("@");
  if (!name || !domain) return "";
  return `${name.slice(0, 2)}***@${domain}`;
}

function hasStripeCheckout() {
  return Boolean(STRIPE_SECRET_KEY && STRIPE_PRICE_PLUS_MONTHLY);
}

function hasEmailDelivery() {
  return Boolean(RESEND_API_KEY);
}

function getPublicBaseUrl(req) {
  if (PUBLIC_BASE_URL) return PUBLIC_BASE_URL;
  const proto = req.headers["x-forwarded-proto"] || "http";
  return `${proto}://${req.headers.host}`;
}

function saveBetaSignup(email, source = "manual") {
  const account = ensureParentAccount(email);
  const existing = betaSignups.get(email);
  const signup = existing || {
    email,
    source: cleanShortText(source, 40),
    position: betaSignups.size + 1,
    createdAt: new Date().toISOString()
  };
  betaSignups.set(email, signup);
  return { ...signup, account };
}

async function sendParentLoginCode(email, code) {
  if (!RESEND_API_KEY) {
    return {
      mode: "screen",
      showCode: true,
      message: "Kod testowy jest gotowy. Dodaj RESEND_API_KEY, żeby wysyłać go prawdziwym mailem."
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [email],
      subject: "Kod do konta rodzica Iskierka",
      text: `Twój kod do konta rodzica Iskierka: ${code}. Kod wygasa za 10 minut.`,
      html: `<p>Twój kod do konta rodzica Iskierka:</p><p style="font-size:24px;font-weight:700">${code}</p><p>Kod wygasa za 10 minut.</p>`
    })
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || data?.error?.message || "Nie udało się wysłać maila z kodem.");
  }

  return {
    mode: "resend",
    showCode: false,
    message: "Kod został wysłany na email rodzica."
  };
}

function cleanAnalyticsEvent(value) {
  const event = cleanShortText(value, 50);
  return /^[a-z0-9_:-]+$/i.test(event) ? event : "";
}

function cleanAnalyticsPath(value) {
  const pathValue = cleanShortText(value || "/", 80);
  return pathValue.startsWith("/") ? pathValue : "/";
}

function cleanPlan(value) {
  return value === "plus" ? "plus" : "free";
}

function cleanShortText(value, maxLength) {
  return String(value || "")
    .replace(/[^\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ@./:#-]/g, "")
    .slice(0, maxLength);
}

function trackServerEvent(event, meta = {}) {
  const day = currentDayKey();
  const key = `${day}:${event}:${meta.plan || meta.source || ""}:${meta.path || ""}`;
  analyticsCounters.set(key, (analyticsCounters.get(key) || 0) + 1);
}

function buildAnalyticsSummary() {
  const summary = {
    appOpen: 0,
    parentPanelOpen: 0,
    chatSubmit: 0,
    checkoutClick: 0,
    betaSignup: 0,
    parentLogin: 0,
    plusActivated: 0,
    freeLimitReached: 0
  };
  const eventMap = {
    app_open: "appOpen",
    parent_panel_open: "parentPanelOpen",
    chat_submit: "chatSubmit",
    checkout_click: "checkoutClick",
    beta_signup: "betaSignup",
    parent_login: "parentLogin",
    plus_activated: "plusActivated",
    free_limit_reached: "freeLimitReached"
  };

  for (const [key, value] of analyticsCounters.entries()) {
    const parts = key.split(":");
    const event = parts[1];
    const target = eventMap[event];
    if (target) summary[target] += value;
  }

  return summary;
}

function verifyStripeSignature(rawBody, signatureHeader, secret) {
  const parsed = parseStripeSignature(signatureHeader);
  if (!parsed.timestamp || !parsed.signatures.length) return false;
  const timestamp = Number(parsed.timestamp);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;

  const signedPayload = `${parsed.timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");

  return parsed.signatures.some((signature) => timingSafeHexEqual(signature, expected));
}

function parseStripeSignature(header) {
  const parts = String(header || "").split(",");
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2) || "";
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3))
    .filter(Boolean);

  return { timestamp, signatures };
}

function timingSafeHexEqual(a, b) {
  const first = Buffer.from(String(a), "hex");
  const second = Buffer.from(String(b), "hex");
  if (first.length !== second.length) return false;
  return timingSafeEqual(first, second);
}

function resolveCheckoutEmail(session) {
  const mapped = checkoutSessions.get(session.id || "");
  const email = cleanEmail(
    mapped?.email
      || session.customer_details?.email
      || session.customer_email
      || session.metadata?.parent_email
  );
  return email;
}

function resolveSubscriptionEmail(subscription) {
  const mapped = findAccountByStripeId(subscription.customer, subscription.id);
  return cleanEmail(mapped?.email || subscription.customer_email || subscription.metadata?.parent_email);
}

function findAccountByStripeId(customerId, subscriptionId) {
  for (const account of parentAccounts.values()) {
    if (customerId && account.stripeCustomerId === customerId) return account;
    if (subscriptionId && account.stripeSubscriptionId === subscriptionId) return account;
  }
  return null;
}

function hashValue(value) {
  return createHash("sha256").update(String(value)).digest("hex");
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
  const relativePath = cleanPath === "/"
    ? "index.html"
    : ["/rodzic", "/rodzic/"].includes(cleanPath)
      ? "rodzic.html"
      : ["/polityka-prywatnosci", "/polityka-prywatnosci/"].includes(cleanPath)
        ? "polityka-prywatnosci.html"
      : cleanPath.replace(/^\/+/, "");
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
