# ⛴ Ferry Navigator

Norsk fergeplanlegger for bilturer. Skriv inn hvor du skal — appen finner ruten, oppdager alle fergekryssinger automatisk, henter sanntids fergetider og regner ut når du må dra hjemmefra for å rekke fergen.

**Live:** https://ferry-navigator.vercel.app *(deployes automatisk fra `main`)*

## Funksjoner

- **Alle ferger i Norge** — fergekryssinger oppdages automatisk fra rutedata (OpenStreetMap), ingen hardkodet sambandsliste
- **Sanntids rutetider** fra Entur, inkludert driftsavvik og innstilte avganger
- **Baklengs-planlegging** — «Ankomst kl. 18:00» gir seneste mulige avreise; «Avreise kl.» planlegger forover
- **Rutealternativer** — ferge vs. kjøre rundt når begge er realistiske, som trykkbare kort og linjer på kartet
- **Velg avgang** — de neste fergeavgangene vises som chips i tidslinjen; velg en annen og hele planen regnes om
- **Rutetabell neste døgn** — fungerer over midnatt, morgendagens avganger merket «I MORGEN»
- **Neste ferge** — søk opp en fergekai og se neste avganger med nedtelling, uten å planlegge rute
- **Prisestimat** — AutoPASS-basert estimat per kryssing, justert for kjøretøytype (bil / el-bil / MC / over 6 m)
- **Via-punkt**, **min posisjon** (GPS), **favoritter og nylige søk**, **delbare lenker** (hele ruten i URL-en)
- **Installerbar PWA** — legg til på hjemskjerm, med offline-fallback via service worker
- **Norsk og engelsk** UI (NO/EN-bryter, huskes)

## Datakilder

| Tjeneste | Brukes til |
|---|---|
| [Entur](https://developer.entur.org/) | Adressesøk (geocoder), fergetider, avvik og kanselleringer (journey-planner v3) |
| [OSRM](http://project-osrm.org/) (demoserver) | Bilruting med fergedeteksjon (`mode: ferry` i OSM-data) |
| [CartoDB](https://carto.com/) + [Leaflet](https://leafletjs.com/) | Mørke kartfliser og kartvisning |

Alle kall gjøres direkte fra nettleseren — ingen backend, ingen API-nøkler.

> **Merk:** Fergeprisene er *estimater* beregnet fra kryssingens lengde (lineær tilpasning mot publiserte AutoPASS-takster) og merkes «estimat» i appen. OSRM-demoserveren har ingen oppetidsgaranti; ved jevn bruk bør rutingen flyttes til en betalt tjeneste eller egen OSRM-instans.

## Teknisk

Hele appen er **én HTML-fil** (`index.html`): React 18 (UMD fra CDN, `React.createElement`, ingen byggesteg), Leaflet 1.9 og håndskrevet CSS. I tillegg:

- `manifest.json` + `icons/` — PWA-manifest og app-ikoner
- `sw.js` — service worker (network-first, offline-fallback)
- `project/`, `chats/` — original designeksport fra Claude Design (historikk, brukes ikke av appen)

### Kjøre lokalt

Ingen avhengigheter eller byggesteg — server mappen statisk:

```bash
npx serve .          # eller: python3 -m http.server 8000
```

Åpne `http://localhost:8000`. API-ene (Entur/OSRM) er CORS-åpne og fungerer rett fra localhost.

### Deploy

Statisk site — pushes til `main` og Vercel deployer automatisk (ingen build command, output directory `.`).
