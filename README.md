# Iskierka AI dla dzieci

Bajkowy czat AI dla dzieci. Frontend rozmawia tylko z backendem, a klucze API zostaja po stronie serwera.

Aktualnie aplikacja ma:

- obrazkowy start dla mlodszych dzieci,
- animowana maskotke Iskierki i delikatne animacje kafelkow,
- zestawy pytan: miks, maluch, sen, emocje, odkryj i tworz,
- profil dziecka: nick i ulubiony klimat,
- onboarding pierwszego uruchomienia,
- blokade panelu opiekuna lokalnym PIN-em,
- PWA: manifest, service worker i przycisk instalacji,
- panel opiekuna: dlugosc odpowiedzi, bajkowosc, bezpieczenstwo, glos,
- lokalna historie rozmow i ulubione odpowiedzi,
- `/api/chat` dla NVIDIA NIM/OpenAI-compatible,
- `/api/tts` dla serwerowego glosu: lokalnie Windows SAPI albo produkcyjnie Azure Speech.

## Uruchomienie

1. Skopiuj konfiguracje:

```powershell
Copy-Item .env.example .env
```

2. Wpisz klucz z NVIDIA Build w `.env`:

```env
NVIDIA_API_KEY=nvapi-twoj-klucz
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=meta/llama-3.3-70b-instruct
PORT=3000
HOST=127.0.0.1
TTS_PROVIDER=windows
```

3. Uruchom:

```powershell
npm start
```

4. Otworz:

```text
http://localhost:3000
```

Sprawdzenie skladni:

```powershell
npm run check
```

Bez `NVIDIA_API_KEY` aplikacja dziala w trybie demo, z lokalna przykladowa odpowiedzia. Jesli port `3000` jest zajety lokalnie, serwer sprobuje kolejnych portow, np. `3001`.

## Skad wziac klucz

Wejdz na NVIDIA Build, zaloguj sie i utworz API key:

```text
https://build.nvidia.com/settings/api-keys
```

NVIDIA dokumentuje endpoint jako OpenAI-compatible pod `https://integrate.api.nvidia.com/v1`, z `POST /v1/chat/completions`.

Dokumentacja:

```text
https://docs.api.nvidia.com/nim/reference/create_chat_completion_v1_chat_completions_post
https://docs.api.nvidia.com/nim/reference/llm-apis
```

Jesli wybrany model nie dziala, wejdz na strone modelu w NVIDIA Build i skopiuj jego aktualny `model id` do `NVIDIA_MODEL`.

## Tryb glosowy

Przycisk `Nagraj` korzysta z Web Speech API w przegladarce. Najlepiej dziala w Chrome/Edge na `localhost` albo na stronie z HTTPS.

`Lepszy TTS` probuje najpierw `/api/tts`:

- lokalnie na Windows: `TTS_PROVIDER=windows`,
- w deployu: najlepiej `TTS_PROVIDER=azure` z `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` i np. `AZURE_SPEECH_VOICE=pl-PL-ZofiaNeural`,
- gdy TTS serwera nie dziala, frontend wraca do glosu przegladarki.

Style glosu w UI:

- Bajkowy,
- Szept,
- Wesoly,
- Odkrywca,
- Robot.

Na Windows SAPI style roznia sie glownie tempem. Przy Azure Speech frontend wysyla styl do backendu, a backend ustawia rate/pitch w SSML.

## Test dla znajomych

Przycisk `Test` kopiuje link z parametrem:

```text
?try=friend
```

Na localhost link dziala tylko na tym komputerze. Po deployu online mozna wyslac go znajomym, a aplikacja ukryje panel opiekuna i zostawi czystszy widok testowy dla dziecka.

## Deploy

Najprosciej:

1. Wypchnij repozytorium na GitHub.
2. Uruchom lokalnie `npm run deploy:check`.
3. W Render wybierz `New` -> `Blueprint` i wskaz repo z `render.yaml`.
4. Ustaw sekret `NVIDIA_API_KEY`.
5. Dla neuralnego TTS ustaw tez:

```env
TTS_PROVIDER=azure
AZURE_SPEECH_KEY=...
AZURE_SPEECH_REGION=westeurope
AZURE_SPEECH_VOICE=pl-PL-ZofiaNeural
```

Alternatywnie Docker:

```powershell
docker build -t iskierka-ai .
docker run --rm -p 3000:3000 --env-file .env -e HOST=0.0.0.0 iskierka-ai
```

## Bezpieczenstwo

Panel opiekuna jest chroniony lokalnym PIN-em zapisanym w przegladarce. To chroni przed przypadkowym klikaniem przez dziecko, ale nie zastepuje prawdziwego konta rodzica w produkcji.

Aplikacja ma lokalny filtr prywatnych danych, przemocy, samouszkodzenia, seksualnych tresci, narkotykow, broni i wlaman. Przy prawdziwym wdrozeniu dodaj logowanie opiekuna, serwerowa moderacje, limity kont i monitoring bledow.
