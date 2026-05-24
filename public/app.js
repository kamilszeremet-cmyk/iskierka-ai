const messagesEl = document.querySelector("#messages");
const form = document.querySelector("#chatForm");
const input = document.querySelector("#userInput");
const sendButton = document.querySelector("#sendButton");
const statusEl = document.querySelector("#providerStatus");
const modelEl = document.querySelector("#modelName");
const clearButton = document.querySelector("#clearChat");
const installAppButton = document.querySelector("#installApp");
const shareTestButton = document.querySelector("#shareTest");
const mascotEl = document.querySelector(".mascot");
const ageButtons = [...document.querySelectorAll(".age-button")];
const onboarding = document.querySelector("#onboarding");
const onboardingName = document.querySelector("#onboardingName");
const onboardingTheme = document.querySelector("#onboardingTheme");
const finishOnboardingButton = document.querySelector("#finishOnboarding");
const startBoard = document.querySelector("#startBoard");
const startEyebrow = document.querySelector("#startEyebrow");
const startTitle = document.querySelector("#startTitle");
const startCards = [...document.querySelectorAll(".start-card")];
const promptRow = document.querySelector("#promptRow");
const shufflePromptsButton = document.querySelector("#shufflePrompts");
const promptSetButtons = [...document.querySelectorAll("[data-prompt-set]")];
const voiceButton = document.querySelector("#voiceButton");
const readLastButton = document.querySelector("#readLastButton");
const autoReadToggle = document.querySelector("#autoReadToggle");
const voiceStatus = document.querySelector("#voiceStatus");
const voiceStyleButtons = [...document.querySelectorAll("[data-voice-style]")];
const answerLengthSelect = document.querySelector("#answerLength");
const wonderLevelInput = document.querySelector("#wonderLevel");
const safetyLevelSelect = document.querySelector("#safetyLevel");
const voiceSelect = document.querySelector("#voiceSelect");
const voicePreviewButton = document.querySelector("#voicePreview");
const serverTtsToggle = document.querySelector("#serverTtsToggle");
const childNameInput = document.querySelector("#childName");
const favoriteThemeSelect = document.querySelector("#favoriteTheme");
const historyList = document.querySelector("#historyList");
const favoriteList = document.querySelector("#favoriteList");
const clearHistoryButton = document.querySelector("#clearHistory");
const clearFavoritesButton = document.querySelector("#clearFavorites");
const parentPanel = document.querySelector(".parent-panel");
const parentLock = document.querySelector("#parentLock");
const parentPinInput = document.querySelector("#parentPin");
const unlockParentButton = document.querySelector("#unlockParent");
const resetPinButton = document.querySelector("#resetPin");
const lockParentButton = document.querySelector("#lockParent");
const pinMode = document.querySelector("#pinMode");
const pinTitle = document.querySelector("#pinTitle");
const pinStatus = document.querySelector("#pinStatus");

const settingsStorageKey = "iskierka-parent-settings";
const historyStorageKey = "iskierka-history";
const favoritesStorageKey = "iskierka-favorites";
const onboardingStorageKey = "iskierka-onboarding-done";
const parentPinStorageKey = "iskierka-parent-pin";
const parentPinSalt = "iskierka-local-parent-pin-v1";
const wonderValues = ["low", "medium", "high"];
const wonderLabels = {
  low: "spokojnie",
  medium: "bajkowo",
  high: "bardzo bajkowo"
};

const tagIcons = {
  AI: "icon-spark",
  Balon: "icon-balloon",
  Bajka: "icon-castle",
  Ciało: "icon-heart",
  Cisza: "icon-cloud",
  Czytanie: "icon-book",
  Dino: "icon-dragon",
  Emocje: "icon-dragon",
  Eksperyment: "icon-flask",
  Historia: "icon-shield",
  Klocki: "icon-blocks",
  Kod: "icon-robot",
  Kolory: "icon-flower",
  Kosmos: "icon-moon",
  Kuchnia: "icon-blocks",
  Latarka: "icon-wand",
  Matma: "icon-blocks",
  Muzyka: "icon-spark",
  Nauka: "icon-moon",
  Oddech: "icon-cloud",
  Plan: "icon-map",
  Pomysł: "icon-wand",
  Przygoda: "icon-map",
  Przyjaźń: "icon-heart",
  Przyroda: "icon-tree",
  Pytania: "icon-question",
  Robot: "icon-robot",
  Ruch: "icon-spark",
  Sen: "icon-cloud",
  Słowa: "icon-scroll",
  Szkoła: "icon-book",
  Sztuka: "icon-flower",
  Twórczość: "icon-robot",
  Uważność: "icon-cloud",
  Zabawa: "icon-blocks",
  Zagadką: "icon-question",
  Zagadka: "icon-question",
  Świat: "icon-globe"
};

const voiceProfiles = {
  story: { label: "Narrator bajkowy", pitch: 1.16, rate: 0.88 },
  whisper: { label: "Szept na dobranoc", pitch: 0.92, rate: 0.78 },
  bright: { label: "Wesoła Iskierka", pitch: 1.1, rate: 0.98 },
  explorer: { label: "Mały odkrywca", pitch: 1.02, rate: 0.92 },
  robot: { label: "Miły robot", pitch: 0.84, rate: 0.86 }
};

const voicePreviewTexts = {
  story: "Cześć, jestem Iskierka. Opowiem to prosto, jak małą bajkę z latarką.",
  whisper: "Ciii. To głos na spokojną opowieść przed snem, bardzo miękki i wolniejszy.",
  bright: "Hej, hej. Wesoła Iskierka jest gotowa na pytania, zagadki i małe odkrycia.",
  explorer: "Zakładamy plecak ciekawości i ruszamy sprawdzić, jak działa świat.",
  robot: "Pip, pip. Miły robot tłumaczy krok po kroku i pilnuje, żeby było jasno."
};

const promptSetLabels = {
  mix: "Miks",
  little: "Maluch",
  sleep: "Sen",
  feelings: "Emocje",
  discover: "Odkryj",
  create: "Twórz"
};

const promptPool = [
  { tag: "Latarka", label: "Latarka", sets: ["little", "create"], text: "Latarka szuka zgubionej iskierki.", prompt: "Opowiedz krótką bajkę dla małego dziecka o latarce, która szuka zgubionej iskierki. Ma być ciepło, prosto i z dobrym zakończeniem.", young: true },
  { tag: "Balon", label: "Balonik", sets: ["little", "feelings"], text: "Balonik uczy się oddychać.", prompt: "Pomóż dziecku uspokoić emocje przez porównanie do balonika. Daj 3 bardzo proste oddechy do zrobienia teraz.", young: true },
  { tag: "Klocki", label: "Klocki", sets: ["little", "create"], text: "Zbuduj krainę z klocków.", prompt: "Wymyśl zabawę z klockami: zbudowanie małej krainy, trzy zadania i jedno pytanie do dziecka.", young: true },
  { tag: "Ruch", label: "Taniec", sets: ["little", "feelings"], text: "Taniec na rozruszanie złości.", prompt: "Wymyśl bezpieczną, krótką zabawę ruchową, która pomaga rozładować złość bez krzywdzenia nikogo.", young: true },
  { tag: "Kuchnia", label: "Kuchnia", sets: ["little", "discover"], text: "Czemu ciasto rośnie?", prompt: "Wytłumacz bardzo prosto, czemu ciasto albo bułeczki mogą rosnąć. Bez przepisu, z porównaniem do małych bąbelków.", young: true },
  { tag: "Cisza", label: "Cisza", sets: ["sleep", "feelings"], text: "Cisza robi miękki kocyk.", prompt: "Opowiedz mini-opowieść przed snem o ciszy, która robi miękki kocyk dla zmęczonych myśli.", young: true },
  { tag: "Oddech", label: "Oddech", sets: ["sleep", "feelings"], text: "Oddech jak fala.", prompt: "Poprowadź dziecko przez spokojne ćwiczenie oddechowe: fala przypływa i odpływa. Maksymalnie 5 krótkich kroków.", young: true },
  { tag: "Uważność", label: "5 rzeczy", sets: ["feelings", "little"], text: "Znajdź 5 spokojnych rzeczy.", prompt: "Zaproponuj dziecku prostą zabawę uważności: znajdź 5 rzeczy, które widzisz, 4 które czujesz, 3 które słyszysz. Bez trudnych słów.", young: true },
  { tag: "Kolory", label: "Kolory", sets: ["little", "create"], text: "Jaki kolor ma radość?", prompt: "Pomóż dziecku nazwać radość, smutek i spokój kolorami. Zaproponuj mały rysunek do zrobienia.", young: true },
  { tag: "Kosmos", label: "Gwiazdki", sets: ["sleep", "discover"], text: "Gwiazdki mrugają do snu.", prompt: "Opowiedz spokojną mini-bajkę o gwiazdkach, które mrugają bardzo powoli, żeby pomóc zasnąć.", young: true },
  { tag: "Eksperyment", label: "Woda", sets: ["discover"], text: "Czemu lód znika w szklance?", prompt: "Wytłumacz dziecku bardzo prosto, czemu lód topnieje w wodzie. Dodaj bezpieczną obserwację do zrobienia z dorosłym.", young: true },
  { tag: "Sztuka", label: "Plama", sets: ["create", "little"], text: "Zrób dziwnie miłą plamę.", prompt: "Wymyśl zabawę rysunkową: z przypadkowej plamy powstaje miła postać albo przedmiot. Daj 5 pomysłów, co można dorysować.", young: true },
  { tag: "Bajka", text: "Opowiedz bajkę o latarni, która bała się ciemności.", prompt: "Opowiedz krótką, ciepłą bajkę o latarni, która bała się ciemności i nauczyła się świecić dla innych." },
  { tag: "Zabawa", label: "Zabawa", text: "Wymyśl zabawę w domu bez ekranu.", prompt: "Wymyśl prostą zabawę w domu bez ekranu dla dziecka. Ma być bezpieczna, krótka i trochę bajkowa.", young: true },
  { tag: "Kolory", label: "Tęcza", text: "Dlaczego tęcza ma kolory?", prompt: "Wytłumacz bardzo prosto, dlaczego tęcza ma kolory. Użyj porównania do kredek albo farbek.", young: true },
  { tag: "Dino", label: "Dino", text: "Dinozaur chce iść spać.", prompt: "Opowiedz krótką bajkę na dobranoc o małym dinozaurze, który uczy się spokojnie zasypiać.", young: true },
  { tag: "Muzyka", label: "Piosenka", text: "Czemu piosenka wpada do głowy?", prompt: "Wytłumacz dziecku, czemu piosenka czasem zostaje w głowie. Zrób to wesoło i prosto.", young: true },
  { tag: "Robot", label: "Robot", text: "Robot uczy się mówić proszę.", prompt: "Opowiedz krótką scenkę o robocie, który uczy się mówić proszę, dziękuję i przepraszam.", young: true },
  { tag: "Przyroda", label: "Biedronka", text: "Co robi biedronka na listku?", prompt: "Wytłumacz dziecku, co może robić biedronka na listku. Dodaj małą ciekawostkę o owadach.", young: true },
  { tag: "Emocje", label: "Chmurka", text: "Jak uspokoić chmurkę w brzuchu?", prompt: "Pomóż dziecku nazwać niepokój jak chmurkę w brzuchu i podaj trzy bardzo proste sposoby uspokojenia.", young: true },
  { tag: "Kosmos", label: "Rakieta", text: "Rakieta leci na dobranoc.", prompt: "Opowiedz mini-bajkę o rakiecie, która leci przez kosmos i zbiera spokojne gwiazdki do snu.", young: true },
  { tag: "Nauka", text: "Dlaczego księżyc zmienia kształt?", prompt: "Wytłumacz mi prosto, dlaczego księżyc raz wygląda jak rogalik, a raz jak pełne koło." },
  { tag: "Pomysł", text: "Wymyśl tajną misję życzliwości.", prompt: "Wymyśl dla mnie bezpieczną tajną misję życzliwości na dzisiaj, taką jak w bajce, ale do zrobienia naprawdę." },
  { tag: "Ciało", text: "Po co serce robi bum-bum?", prompt: "Wytłumacz mi po dziecięcemu, po co serce bije i dlaczego robi bum-bum." },
  { tag: "Kosmos", text: "Jak wyglądałby sklep na Marsie?", prompt: "Wymyśl zabawny opis sklepu na Marsie i przemyć w nim trzy proste fakty o kosmosie." },
  { tag: "Emocje", text: "Co zrobić, gdy złość syczy jak smok?", prompt: "Pomóż mi zrozumieć złość. Opisz ją jak małego smoka i podaj trzy bezpieczne sposoby, żeby go uspokoić." },
  { tag: "Słowa", text: "Zrób ze mnie mistrza rymów.", prompt: "Naucz mnie robić proste rymy. Daj zabawne przykłady i małe zadanie." },
  { tag: "Przygoda", text: "Stwórz mapę krainy snu.", prompt: "Wymyśl mapę bajkowej krainy snu z pięcioma miejscami i opisz, co można tam odkryć." },
  { tag: "Matma", text: "Tabliczka mnożenia jak zaklęcia.", prompt: "Pomóż mi ćwiczyć tabliczkę mnożenia jak zaklęcia w akademii magii, z krótkimi przykładami." },
  { tag: "Przyroda", text: "O czym szepczą drzewa?", prompt: "Wytłumacz, jak drzewa piją wodę i oddychają, ale opowiedz to jak bajkę o lesie." },
  { tag: "Historia", text: "Rycerz pyta: co to jest odwaga?", prompt: "Wytłumacz dziecku, czym jest odwaga, używając krótkiej historii o rycerzu, który nie musi walczyć." },
  { tag: "Twórczość", text: "Wymyśl imię dla robota-przyjaciela.", prompt: "Pomóż mi wymyślić imię i charakter dla robota-przyjaciela z bajki. Daj 8 pomysłów." },
  { tag: "Zagadka", text: "Daj mi zagadkę z podpowiedziami.", prompt: "Daj mi jedną zagadkę dla dziecka, trzy podpowiedzi i odpowiedź ukrytą na końcu." },
  { tag: "Eksperyment", text: "Domowy eksperyment bez bałaganu.", prompt: "Wymyśl bezpieczny domowy eksperyment bez dużego bałaganu. Napisz, że trzeba zapytać dorosłego." },
  { tag: "Szkoła", text: "Jak zapamiętać trudny wiersz?", prompt: "Pomóż mi zapamiętać krótki wiersz. Podaj prostą metodę w stylu bajkowej wyprawy." },
  { tag: "Świat", text: "Dlaczego ludzie mówią różnymi językami?", prompt: "Wytłumacz prosto, dlaczego ludzie na świecie mówią różnymi językami." },
  { tag: "Sen", text: "Czemu śnią nam się dziwne rzeczy?", prompt: "Wytłumacz dziecku, czemu sny bywają dziwne, bez straszenia i z prostym porównaniem." },
  { tag: "Kod", text: "Komputer jak kucharz instrukcji.", prompt: "Wytłumacz, czym jest programowanie, jakby komputer był kucharzem wykonującym przepis." },
  { tag: "Sztuka", text: "Narysuj słowami magiczny ogród.", prompt: "Opisz magiczny ogród tak dokładnie, żebym mógł go narysować." },
  { tag: "Pytania", text: "Zadaj mi 5 ciekawych pytań.", prompt: "Zadaj mi 5 ciekawych pytań o świecie, każde krótkie i inne." },
  { tag: "Plan", text: "Plan dnia małego odkrywcy.", prompt: "Ułóż prosty plan popołudnia dla małego odkrywcy: nauka, odpoczynek, zabawa i pomoc w domu." },
  { tag: "Czytanie", text: "Co mogę przeczytać przed snem?", prompt: "Zaproponuj trzy pomysły na spokojną opowieść przed snem i zacznij jedną z nich." },
  { tag: "AI", text: "Czy AI naprawdę myśli?", prompt: "Wytłumacz dziecku, czy AI naprawdę myśli. Powiedz jasno, że to wygląda jak myślenie, ale jest liczeniem wzorów." },
  { tag: "Przyjaźń", text: "Jak przeprosić kolegę?", prompt: "Pomóż mi wymyślić proste, dobre przeprosiny dla kolegi albo koleżanki." }
];

let ageMode = "6-8";
let conversation = [];
let recognition = null;
let isListening = false;
let promptOffset = Math.floor(Math.random() * promptPool.length);
let promptDeck = [];
let preferredVoice = null;
let voiceStyle = "story";
let promptSet = "mix";
let parentSettings = loadParentSettings();
let chatHistory = loadStoredList(historyStorageKey);
let favoriteReplies = loadStoredList(favoritesStorageKey);
let currentAudio = null;
let currentAudioUrl = "";
let serverTtsAvailable = true;
let installPromptEvent = null;
let parentUnlocked = false;
let lastAssistantReply = "Cześć. Jestem Iskierka. Mogę tłumaczyć świat prosto, wymyślać opowieści i pomagać w nauce bez straszenia.";

document.body.dataset.age = ageMode;
setMascotMood("idle");
applyParentSettingsToControls();
syncOnboardingControls();
setupParentLock();
setupPwaInstall();
setupFriendTestShare();
hydrateHealth();
setupVoice();
renderPrompts();
renderMemory();
refreshStartTitle();
updateChatStarted();
updateOnboardingState();

ageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    ageMode = button.dataset.age || "9-12";
    document.body.dataset.age = ageMode;
    ageButtons.forEach((item) => item.classList.toggle("active", item === button));
    promptDeck = [];
    renderPrompts();
    input.focus();
  });
});

voiceStyleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    voiceStyle = button.dataset.voiceStyle || "story";
    voiceStyleButtons.forEach((item) => item.classList.toggle("active", item === button));
    saveParentSettings();
    updateVoiceStatus();
  });
});

promptSetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    promptSet = button.dataset.promptSet || "mix";
    promptSetButtons.forEach((item) => item.classList.toggle("active", item === button));
    promptDeck = [];
    promptOffset = (promptOffset + 3) % promptPool.length;
    renderPrompts();
  });
});

[answerLengthSelect, wonderLevelInput, safetyLevelSelect].forEach((control) => {
  control?.addEventListener("change", () => {
    readParentSettingsFromControls();
    saveParentSettings();
  });
});

[childNameInput, favoriteThemeSelect, serverTtsToggle].forEach((control) => {
  control?.addEventListener("change", () => {
    readParentSettingsFromControls();
    saveParentSettings();
    refreshStartTitle();
    updateVoiceStatus();
  });
});

childNameInput?.addEventListener("input", () => {
  readParentSettingsFromControls();
  saveParentSettings();
  refreshStartTitle();
});

finishOnboardingButton?.addEventListener("click", () => {
  parentSettings = {
    ...parentSettings,
    childName: onboardingName?.value.trim().slice(0, 24) || parentSettings.childName,
    favoriteTheme: onboardingTheme?.value || parentSettings.favoriteTheme
  };
  localStorage.setItem(onboardingStorageKey, "1");
  applyParentSettingsToControls();
  saveParentSettings();
  refreshStartTitle();
  updateOnboardingState();
});

voiceSelect?.addEventListener("change", () => {
  parentSettings.voiceURI = voiceSelect.value || "auto";
  loadPreferredVoice();
  saveParentSettings();
  updateVoiceStatus();
});

voicePreviewButton?.addEventListener("click", () => {
  speakText(voicePreviewTexts[voiceStyle] || voicePreviewTexts.story);
});

startCards.forEach((card) => {
  card.addEventListener("click", () => {
    input.value = card.dataset.startPrompt || "";
    form.requestSubmit();
  });
});

clearHistoryButton?.addEventListener("click", () => {
  chatHistory = [];
  saveStoredList(historyStorageKey, chatHistory);
  renderMemory();
});

clearFavoritesButton?.addEventListener("click", () => {
  favoriteReplies = [];
  saveStoredList(favoritesStorageKey, favoriteReplies);
  renderMemory();
});

unlockParentButton?.addEventListener("click", () => {
  handleParentPinSubmit();
});

parentPinInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    handleParentPinSubmit();
  }
});

resetPinButton?.addEventListener("click", () => {
  localStorage.removeItem(parentPinStorageKey);
  parentUnlocked = false;
  updateParentLockState("PIN usunięty. Ustaw nowy PIN rodzica.");
});

lockParentButton?.addEventListener("click", () => {
  parentUnlocked = false;
  updateParentLockState("Panel został zablokowany.");
});

shufflePromptsButton.addEventListener("click", () => {
  promptOffset = (promptOffset + 6 + Math.floor(Math.random() * 5)) % promptPool.length;
  promptDeck = [];
  renderPrompts();
});

clearButton.addEventListener("click", () => {
  conversation = [];
  messagesEl.innerHTML = "";
  lastAssistantReply = "Jestem gotowa od nowa. O co pytamy tym razem?";
  appendMessage("assistant", lastAssistantReply);
  renderPrompts();
  updateChatStarted();
  input.focus();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = input.value.trim();

  if (!text || sendButton.disabled) return;

  input.value = "";
  appendMessage("user", text);
  conversation.push({ role: "user", content: text });
  updateChatStarted();

  const pending = appendMessage("assistant", "Układam proste słowa...", { pending: true });
  setBusy(true);
  setMascotMood("thinking");

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ageMode,
        settings: getChatSettings(),
        profile: getChildProfile(),
        messages: conversation
      })
    });

    const data = await readApiJson(response);

    if (!response.ok) {
      throw new Error(data?.error || "Nie udało się porozmawiać z modelem.");
    }

    if (!data?.reply) {
      throw new Error("Serwer nie odesłał odpowiedzi. Odśwież stronę i spróbuj jeszcze raz.");
    }

    pending.querySelector(".bubble").textContent = data.reply;
    pending.classList.remove("pending");
    attachSpeakButton(pending.querySelector(".message-content"), data.reply);
    attachFavoriteButton(pending.querySelector(".message-content"), data.reply, text);
    lastAssistantReply = data.reply;
    conversation.push({ role: "assistant", content: data.reply });
    saveHistoryItem(text, data.reply);
    trimConversation();
    rotatePromptsSoftly();

    if (autoReadToggle.checked) {
      speakText(data.reply);
    } else {
      setMascotMood("happy");
      window.setTimeout(() => setMascotMood("idle"), 1600);
    }
  } catch (error) {
    const errorText = `Nie udało mi się odpowiedzieć: ${friendlyApiError(error)}`;
    pending.querySelector(".bubble").textContent = errorText;
    pending.classList.remove("pending");
    attachSpeakButton(pending.querySelector(".message-content"), errorText);
    lastAssistantReply = errorText;
    setMascotMood("sad");
  } finally {
    setBusy(false);
    input.focus();
  }
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

async function hydrateHealth() {
  try {
    const response = await fetch("/api/health");
    const data = await readApiJson(response);

    modelEl.textContent = data.model || "-";
    serverTtsAvailable = Boolean(data.tts?.available);
    statusEl.textContent = data.configured
      ? "API NVIDIA jest podłączone"
      : "Tryb demo: dodaj NVIDIA_API_KEY w .env";
    updateVoiceStatus();
  } catch {
    statusEl.textContent = "Nie mogę sprawdzić serwera";
    modelEl.textContent = "-";
    serverTtsAvailable = false;
  }
}

async function readApiJson(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text().catch(() => "");
  const looksLikeTunnel = /localtunnel|loca\.lt|tunnel|gateway|timeout|html/i.test(text);

  if (response.status === 408 || response.status === 502 || response.status === 503 || response.status === 504 || looksLikeTunnel) {
    throw new Error("Tymczasowy link testowy nie odpowiada. Poproś o nowy link albo spróbuj za chwilę.");
  }

  throw new Error(`Serwer odesłał nieoczekiwaną odpowiedź (${response.status}).`);
}

function friendlyApiError(error) {
  const message = error?.message || "";

  if (/Unexpected token|JSON|not valid JSON|Unexpected end/i.test(message)) {
    return "serwer albo tunel testowy odesłał coś innego niż odpowiedź AI. Odśwież stronę i spróbuj jeszcze raz.";
  }

  if (/Failed to fetch|NetworkError|Load failed|timeout|timed out/i.test(message)) {
    return "połączenie z linkiem testowym się urwało. Poproś o nowy link albo spróbuj za chwilę.";
  }

  return message || "wystąpił problem z połączeniem.";
}

function renderPrompts() {
  const targetCount = 6;
  const candidates = getPromptCandidates();

  if (promptDeck.length < targetCount) {
    promptDeck = shufflePrompts(candidates);
  }

  const picked = promptDeck.splice(0, targetCount);
  promptRow.innerHTML = "";

  picked.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.prompt = item.prompt;
    button.style.setProperty("--prompt-index", index);

    const picture = document.createElement("span");
    picture.className = `prompt-picture ${getPromptIcon(item)}`;
    picture.setAttribute("aria-hidden", "true");

    const copy = document.createElement("span");
    copy.className = "prompt-copy";

    const tag = document.createElement("span");
    tag.className = "prompt-tag";
    tag.textContent = item.tag;

    const text = document.createElement("strong");
    text.textContent = getPromptLabel(item);

    copy.append(tag, text);
    button.append(picture, copy);
    button.addEventListener("click", () => {
      input.value = item.prompt;
      input.focus();
    });

    promptRow.append(button);
  });
}

function getPromptCandidates() {
  const youngTags = new Set([
    "Bajka",
    "Balon",
    "Zabawa",
    "Kolory",
    "Klocki",
    "Latarka",
    "Dino",
    "Muzyka",
    "Robot",
    "Kosmos",
    "Emocje",
    "Oddech",
    "Przyroda",
    "Ruch",
    "Sen",
    "Słowa",
    "Uważność",
    "Czytanie",
    "Przyjaźń"
  ]);

  const ageFiltered = ageMode === "6-8"
    ? promptPool.filter((item) => item.young || youngTags.has(item.tag))
    : promptPool;
  const setFiltered = promptSet === "mix"
    ? ageFiltered
    : ageFiltered.filter((item) => item.sets?.includes(promptSet) || matchesPromptSet(item, promptSet));

  return setFiltered.length >= 6 ? setFiltered : ageFiltered;
}

function matchesPromptSet(item, setName) {
  const tag = item.tag;

  if (setName === "sleep") return ["Sen", "Cisza", "Oddech", "Kosmos", "Czytanie"].includes(tag);
  if (setName === "feelings") return ["Emocje", "Oddech", "Uważność", "Ruch", "Przyjaźń"].includes(tag);
  if (setName === "discover") return ["Kosmos", "Nauka", "Przyroda", "Eksperyment", "Świat", "Ciało"].includes(tag);
  if (setName === "create") return ["Bajka", "Sztuka", "Twórczość", "Pomysł", "Słowa", "Klocki"].includes(tag);
  if (setName === "little") return item.young;

  return false;
}

function shufflePrompts(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = (promptOffset + Math.floor(Math.random() * (index + 1))) % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function getPromptLabel(item) {
  if (ageMode !== "6-8") return item.text;
  if (item.label) return item.label;

  const shortLabels = {
    AI: "Czy AI myśli?",
    Balon: "Balonik",
    Bajka: "Bajka",
    Ciało: "Serce",
    Cisza: "Cisza",
    Czytanie: "Czytanka",
    Dino: "Dino",
    Emocje: "Złość",
    Eksperyment: "Eksperyment",
    Historia: "Odwaga",
    Klocki: "Klocki",
    Kod: "Komputer",
    Kolory: "Tęcza",
    Kosmos: "Kosmos",
    Kuchnia: "Kuchnia",
    Latarka: "Latarka",
    Matma: "Liczenie",
    Muzyka: "Piosenka",
    Nauka: "Księżyc",
    Oddech: "Oddech",
    Plan: "Plan dnia",
    Pomysł: "Dobry uczynek",
    Przygoda: "Mapa",
    Przyjaźń: "Przeproś",
    Przyroda: "Drzewa",
    Pytania: "Pytania",
    Robot: "Robot",
    Ruch: "Taniec",
    Sen: "Sny",
    Słowa: "Rymy",
    Szkoła: "Wiersz",
    Sztuka: "Ogród",
    Twórczość: "Robot",
    Uważność: "5 rzeczy",
    Zabawa: "Zabawa",
    Zagadka: "Zagadka",
    Świat: "Języki"
  };

  return shortLabels[item.tag] || item.text;
}

function getPromptIcon(item) {
  return tagIcons[item.tag] || "icon-spark";
}

function rotatePromptsSoftly() {
  promptOffset = (promptOffset + 1) % promptPool.length;
  promptDeck = [];
  renderPrompts();
}

function setMascotMood(mood = "idle") {
  if (!mascotEl) return;
  mascotEl.dataset.mood = mood;
  document.body.dataset.mascotMood = mood;
}

function loadParentSettings() {
  const defaults = {
    answerLength: "normal",
    wonderLevel: "high",
    safetyLevel: "strict",
    voiceURI: "auto",
    voiceStyle: "story",
    useServerTts: true,
    childName: "",
    favoriteTheme: ""
  };

  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(settingsStorageKey) || "{}") };
  } catch {
    return defaults;
  }
}

function applyParentSettingsToControls() {
  voiceStyle = parentSettings.voiceStyle || "story";
  if (!voiceProfiles[voiceStyle]) voiceStyle = voiceStyle === "calm" ? "whisper" : "story";
  voiceStyleButtons.forEach((item) => item.classList.toggle("active", item.dataset.voiceStyle === voiceStyle));
  if (answerLengthSelect) answerLengthSelect.value = parentSettings.answerLength;
  if (childNameInput) childNameInput.value = parentSettings.childName || "";
  if (favoriteThemeSelect) favoriteThemeSelect.value = parentSettings.favoriteTheme || "";
  if (serverTtsToggle) serverTtsToggle.checked = parentSettings.useServerTts !== false;
  if (wonderLevelInput) {
    wonderLevelInput.value = String(Math.max(0, wonderValues.indexOf(parentSettings.wonderLevel)));
    wonderLevelInput.setAttribute("aria-label", `Bajkowość: ${wonderLabels[parentSettings.wonderLevel]}`);
  }
  if (safetyLevelSelect) safetyLevelSelect.value = parentSettings.safetyLevel;
  if (voiceSelect) voiceSelect.value = parentSettings.voiceURI || "auto";
}

function readParentSettingsFromControls() {
  const wonderIndex = Number(wonderLevelInput?.value || 2);
  parentSettings = {
    ...parentSettings,
    answerLength: answerLengthSelect?.value || "normal",
    wonderLevel: wonderValues[wonderIndex] || "high",
    safetyLevel: safetyLevelSelect?.value || "strict",
    voiceStyle,
    useServerTts: serverTtsToggle ? serverTtsToggle.checked : true,
    childName: childNameInput?.value.trim().slice(0, 24) || "",
    favoriteTheme: favoriteThemeSelect?.value || ""
  };

  if (wonderLevelInput) {
    wonderLevelInput.setAttribute("aria-label", `Bajkowość: ${wonderLabels[parentSettings.wonderLevel]}`);
  }
}

function getChatSettings() {
  readParentSettingsFromControls();
  return {
    answerLength: parentSettings.answerLength,
    wonderLevel: parentSettings.wonderLevel,
    safetyLevel: parentSettings.safetyLevel
  };
}

function getChildProfile() {
  readParentSettingsFromControls();
  return {
    childName: parentSettings.childName,
    favoriteTheme: parentSettings.favoriteTheme
  };
}

function saveParentSettings() {
  readParentSettingsFromControls();
  localStorage.setItem(settingsStorageKey, JSON.stringify(parentSettings));
}

function syncOnboardingControls() {
  if (onboardingName) onboardingName.value = parentSettings.childName || "";
  if (onboardingTheme) onboardingTheme.value = parentSettings.favoriteTheme || "";
}

function updateOnboardingState() {
  const done = localStorage.getItem(onboardingStorageKey) === "1";
  document.body.classList.toggle("needs-onboarding", !done);

  if (!done) {
    syncOnboardingControls();
  }
}

function setupPwaInstall() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPromptEvent = event;
    if (installAppButton) installAppButton.hidden = false;
  });

  installAppButton?.addEventListener("click", async () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    await installPromptEvent.userChoice.catch(() => {});
    installPromptEvent = null;
    installAppButton.hidden = true;
  });
}

function setupFriendTestShare() {
  const params = new URLSearchParams(window.location.search);
  const friendMode = params.get("try") === "friend" || params.get("test") === "friends";
  document.body.classList.toggle("friend-test", friendMode);

  if (friendMode && startEyebrow) {
    startEyebrow.textContent = "Tryb testowy dla znajomych";
  }

  shareTestButton?.addEventListener("click", async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("try", "friend");
    url.searchParams.set("v", "24");
    url.hash = "";

    const shareData = {
      title: "Iskierka AI dla dzieci",
      text: "Przetestuj bajkowy czat AI dla dzieci.",
      url: url.toString()
    };

    try {
      const isLocal = ["localhost", "127.0.0.1", ""].includes(url.hostname);

      if (navigator.share && !isLocal) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
      }

      voiceStatus.textContent = isLocal
        ? "Link testowy skopiowany. Znajomi użyją go po deployu online."
        : "Link testowy skopiowany.";
    } catch {
      input.value = shareData.url;
      voiceStatus.textContent = "Nie mogę skopiować linku, wkleiłam go w pole wiadomości.";
    }
  });
}

function setupParentLock() {
  parentUnlocked = false;
  updateParentLockState(localStorage.getItem(parentPinStorageKey) ? "" : "Ustaw PIN, żeby chronić panel opiekuna.");
}

function updateParentLockState(message = "") {
  const hasPin = Boolean(localStorage.getItem(parentPinStorageKey));
  document.body.classList.toggle("parent-unlocked", parentUnlocked);
  parentPanel?.classList.toggle("is-locked", !parentUnlocked);

  if (pinMode) pinMode.textContent = hasPin ? "PIN rodzica" : "Ustaw PIN rodzica";
  if (pinTitle) pinTitle.textContent = hasPin ? "Odblokuj panel" : "Wymyśl PIN";
  if (unlockParentButton) unlockParentButton.textContent = hasPin ? "Odblokuj" : "Ustaw PIN";
  if (lockParentButton) lockParentButton.textContent = hasPin ? "Zablokuj" : "Ustaw PIN";
  if (resetPinButton) resetPinButton.hidden = !hasPin;
  if (pinStatus) {
    pinStatus.textContent = message || (hasPin
      ? "Wpisz PIN, żeby zmienić ustawienia i zobaczyć historię."
      : "PIN zostaje tylko w tej przeglądarce.");
  }
  if (parentPinInput) {
    parentPinInput.value = "";
    parentPinInput.placeholder = hasPin ? "PIN" : "Nowy PIN";
  }
}

async function handleParentPinSubmit() {
  const pin = parentPinInput?.value.trim() || "";
  const hasPin = Boolean(localStorage.getItem(parentPinStorageKey));

  if (!/^\d{4,8}$/.test(pin)) {
    updateParentLockState("PIN powinien mieć od 4 do 8 cyfr.");
    return;
  }

  const hash = await hashPin(pin);

  if (!hasPin) {
    localStorage.setItem(parentPinStorageKey, hash);
    parentUnlocked = true;
    updateParentLockState("PIN ustawiony. Panel jest odblokowany.");
    return;
  }

  if (hash === localStorage.getItem(parentPinStorageKey)) {
    parentUnlocked = true;
    updateParentLockState("Panel odblokowany.");
  } else {
    parentUnlocked = false;
    updateParentLockState("Nieprawidłowy PIN.");
  }
}

async function hashPin(pin) {
  const value = `${parentPinSalt}:${pin}`;

  if (globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(value);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  return btoa(value);
}

function refreshStartTitle() {
  if (!startTitle) return;

  const name = parentSettings.childName?.trim();
  startTitle.textContent = name ? `${name}, co dziś odkrywamy?` : "Co dziś odkrywamy?";
}

function updateChatStarted() {
  document.body.classList.toggle("chat-started", conversation.length > 0);
}

function loadStoredList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveStoredList(key, value) {
  localStorage.setItem(key, JSON.stringify(value.slice(0, 24)));
}

function saveHistoryItem(question, answer) {
  chatHistory = [
    {
      id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
      at: new Date().toISOString(),
      question,
      answer,
      ageMode
    },
    ...chatHistory
  ].slice(0, 18);
  saveStoredList(historyStorageKey, chatHistory);
  renderMemory();
}

function saveFavoriteReply(answer, question = "") {
  const trimmed = answer.trim();
  if (!trimmed) return;

  favoriteReplies = [
    {
      id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
      at: new Date().toISOString(),
      question,
      answer: trimmed
    },
    ...favoriteReplies.filter((item) => item.answer !== trimmed)
  ].slice(0, 18);
  saveStoredList(favoritesStorageKey, favoriteReplies);
  renderMemory();
}

function renderMemory() {
  renderMemoryList(historyList, chatHistory, "Brak historii.", (item) => item.question, (item) => {
    input.value = item.question;
    input.focus();
  });
  renderMemoryList(favoriteList, favoriteReplies, "Brak ulubionych.", (item) => item.answer, (item) => {
    lastAssistantReply = item.answer;
    appendMessage("assistant", item.answer);
    updateChatStarted();
    speakText(item.answer);
  });
}

function renderMemoryList(container, items, emptyText, getText, onClick) {
  if (!container) return;

  container.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "memory-empty";
    empty.textContent = emptyText;
    container.append(empty);
    return;
  }

  items.slice(0, 4).forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "memory-item";
    button.textContent = getText(item).slice(0, 96);
    button.addEventListener("click", () => onClick(item));
    container.append(button);
  });
}

function setupVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const canSpeak = "speechSynthesis" in window;

  if (!canSpeak && !parentSettings.useServerTts) {
    autoReadToggle.checked = false;
    autoReadToggle.disabled = true;
    readLastButton.disabled = true;
    if (voicePreviewButton) voicePreviewButton.disabled = true;
    voiceStyleButtons.forEach((button) => {
      button.disabled = true;
    });
  }

  if (!canSpeak && voiceSelect) {
    voiceSelect.disabled = true;
  }

  if (!SpeechRecognition) {
    voiceButton.disabled = true;
    voiceButton.title = "Ta przeglądarka nie obsługuje dyktowania.";
    voiceStatus.textContent = canSpeak
      ? "Mikrofon niedostępny, czytanie działa"
      : "Głos niedostępny w tej przeglądarce";
  } else {
    recognition = new SpeechRecognition();
    recognition.lang = "pl-PL";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.addEventListener("start", () => {
      isListening = true;
      setMascotMood("listening");
      voiceButton.classList.add("listening");
      voiceButton.setAttribute("aria-pressed", "true");
      voiceStatus.textContent = "Słucham...";
    });

    recognition.addEventListener("end", () => {
      isListening = false;
      voiceButton.classList.remove("listening");
      voiceButton.setAttribute("aria-pressed", "false");
      if (!sendButton.disabled) {
        setMascotMood("idle");
        updateVoiceStatus();
      }
    });

    recognition.addEventListener("error", () => {
      isListening = false;
      setMascotMood("sad");
      voiceButton.classList.remove("listening");
      voiceButton.setAttribute("aria-pressed", "false");
      voiceStatus.textContent = "Nie słyszałam. Spróbuj jeszcze raz.";
    });

    recognition.addEventListener("result", (event) => {
      let interimText = "";
      let finalText = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0].transcript;
        if (event.results[index].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      input.value = (finalText || interimText).trim();

      if (finalText.trim()) {
        voiceStatus.textContent = "Mam pytanie. Wysyłam.";
        recognition.stop();
        form.requestSubmit();
      }
    });
  }

  if (canSpeak) {
    populateVoiceSelect();
    loadPreferredVoice();
    window.speechSynthesis.addEventListener?.("voiceschanged", () => {
      populateVoiceSelect();
      loadPreferredVoice();
      updateVoiceStatus();
    });
    updateVoiceStatus();
  }

  voiceButton.addEventListener("click", () => {
    if (!recognition || sendButton.disabled) return;

    if (isListening) {
      recognition.stop();
      return;
    }

    input.value = "";
    window.speechSynthesis?.cancel();
    recognition.start();
  });

  readLastButton.addEventListener("click", () => {
    speakText(lastAssistantReply);
  });
}

function appendMessage(role, text, options = {}) {
  const article = document.createElement("article");
  article.className = `message ${role}${options.pending ? " pending" : ""}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "Ty" : "I";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  const content = document.createElement("div");
  content.className = "message-content";
  content.append(bubble);

  if (role === "assistant" && !options.pending) {
    attachSpeakButton(content, text);
    attachFavoriteButton(content, text);
  }

  article.append(avatar, content);
  messagesEl.append(article);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  return article;
}

function attachSpeakButton(container, text) {
  if (!container || (!("speechSynthesis" in window) && !parentSettings.useServerTts)) return;

  const oldButton = container.querySelector(".speak-message");
  if (oldButton) oldButton.remove();

  const actions = getMessageActions(container);
  const button = document.createElement("button");
  button.className = "speak-message";
  button.type = "button";
  button.title = "Odtwórz odpowiedź";
  button.setAttribute("aria-label", "Odtwórz odpowiedź");

  const icon = document.createElement("span");
  icon.className = "speaker-icon";
  icon.setAttribute("aria-hidden", "true");
  button.append(icon);
  button.addEventListener("click", () => speakText(text));

  actions.append(button);
}

function attachFavoriteButton(container, text, question = "") {
  if (!container) return;

  const oldButton = container.querySelector(".favorite-message");
  if (oldButton) oldButton.remove();

  const actions = getMessageActions(container);
  const button = document.createElement("button");
  button.className = "favorite-message";
  button.type = "button";
  button.title = "Dodaj do ulubionych";
  button.setAttribute("aria-label", "Dodaj do ulubionych");
  button.textContent = "★";
  button.addEventListener("click", () => saveFavoriteReply(text, question));

  actions.append(button);
}

function getMessageActions(container) {
  let actions = container.querySelector(".message-actions");

  if (!actions) {
    actions = document.createElement("div");
    actions.className = "message-actions";
    container.append(actions);
  }

  return actions;
}

function speakText(text) {
  if (!text) return;

  stopCurrentAudio({ keepMood: true });
  setMascotMood("speaking");
  const prepared = prepareSpeechText(text);

  if (parentSettings.useServerTts && serverTtsAvailable) {
    speakWithServerTts(prepared).catch(() => {
      voiceStatus.textContent = "Serwerowy głos niedostępny, używam przeglądarki.";
      speakWithBrowserVoice(prepared);
    });
    return;
  }

  speakWithBrowserVoice(prepared);
}

async function speakWithServerTts(text) {
  voiceStatus.textContent = "Tworzę ładniejszy głos...";
  const response = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, style: voiceStyle })
  });

  if (!response.ok) {
    serverTtsAvailable = false;
    throw new Error("TTS unavailable");
  }

  const blob = await response.blob();
  const audioUrl = URL.createObjectURL(blob);
  const audio = new Audio(audioUrl);
  currentAudio = audio;
  currentAudioUrl = audioUrl;

  audio.addEventListener("ended", () => {
    stopCurrentAudio();
    updateVoiceStatus();
  }, { once: true });

  await audio.play();
  voiceStatus.textContent = "Czytam ładniejszym głosem...";
}

function speakWithBrowserVoice(text) {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const chunks = splitSpeechIntoChunks(text);

  speakSpeechChunks(chunks);
}

function speakSpeechChunks(chunks) {
  const chunk = chunks.shift();
  if (!chunk) {
    setMascotMood("idle");
    updateVoiceStatus();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(chunk);
  const profile = voiceProfiles[voiceStyle] || voiceProfiles.story;

  utterance.lang = "pl-PL";
  utterance.rate = profile.rate;
  utterance.pitch = profile.pitch;
  utterance.volume = 1;
  utterance.onend = () => speakSpeechChunks(chunks);

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  window.speechSynthesis.speak(utterance);
}

function stopCurrentAudio(options = {}) {
  window.speechSynthesis?.cancel();

  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = "";
  }

  if (!options.keepMood) {
    setMascotMood("idle");
  }
}

function prepareSpeechText(text) {
  return String(text)
    .replace(/[`*_#>~]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSpeechIntoChunks(text) {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const chunks = [];
  let current = "";

  sentences.forEach((sentence) => {
    const next = `${current} ${sentence}`.trim();
    if (next.length > 220 && current) {
      chunks.push(current);
      current = sentence.trim();
    } else {
      current = next;
    }
  });

  if (current) chunks.push(current);
  return chunks;
}

function populateVoiceSelect() {
  if (!voiceSelect || !("speechSynthesis" in window)) return;

  const voices = getSortedVoices();
  const selected = parentSettings.voiceURI || "auto";

  voiceSelect.innerHTML = "";
  voiceSelect.append(new Option("Najlepszy polski", "auto"));

  voices.forEach((voice) => {
    const label = voice.lang?.toLowerCase().startsWith("pl")
      ? voice.name
      : `${voice.name} (${voice.lang})`;
    voiceSelect.append(new Option(label, voice.voiceURI));
  });

  voiceSelect.value = [...voiceSelect.options].some((option) => option.value === selected)
    ? selected
    : "auto";
}

function loadPreferredVoice() {
  const voices = getSortedVoices();
  const selected = parentSettings.voiceURI || voiceSelect?.value || "auto";

  preferredVoice =
    selected !== "auto"
      ? voices.find((voice) => voice.voiceURI === selected)
      : voices[0] || null;
}

function updateVoiceStatus() {
  const profile = voiceProfiles[voiceStyle] || voiceProfiles.story;

  if (parentSettings.useServerTts && serverTtsAvailable) {
    voiceStatus.textContent = `${profile.label}: lepszy TTS serwera`;
    return;
  }

  if (!("speechSynthesis" in window)) {
    voiceStatus.textContent = "Głos niedostępny w tej przeglądarce";
    return;
  }

  voiceStatus.textContent = preferredVoice ? `${profile.label}: ${preferredVoice.name}` : profile.label;
}

function getSortedVoices() {
  const voices = window.speechSynthesis?.getVoices?.() || [];

  return voices
    .map((voice) => ({ voice, score: scoreVoice(voice) }))
    .sort((a, b) => b.score - a.score || a.voice.name.localeCompare(b.voice.name))
    .map((entry) => entry.voice);
}

function scoreVoice(voice) {
  const name = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  const lang = voice.lang?.toLowerCase() || "";
  let score = 0;

  if (lang.startsWith("pl")) score += 100;
  if (/zofia|zosia|paulina|microsoft|google/.test(name)) score += 24;
  if (/natural|online|neural/.test(name)) score += 18;
  if (/female|kobieta/.test(name)) score += 8;
  if (!voice.localService) score += 4;

  return score;
}

function setBusy(isBusy) {
  sendButton.disabled = isBusy;
  sendButton.textContent = isBusy ? "Czekam" : "Wyślij";

  if (recognition) {
    voiceButton.disabled = isBusy;
  }

  if (isBusy) {
    voiceStatus.textContent = "Czekam na odpowiedź...";
  } else {
    updateVoiceStatus();
  }
}

function trimConversation() {
  if (conversation.length > 14) {
    conversation = conversation.slice(-14);
  }
}
