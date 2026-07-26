# ⛴ Ferry Navigator

Norsk fergeplanlegger for bilturer. Skriv inn hvor du skal — appen finner ruten, oppdager alle fergekryssinger automatisk, henter sanntids fergetider og regner ut når du må dra hjemmefra for å rekke fergen.

**Live:** https://ferry-navigator.vercel.app *(deployes automatisk fra `main`)*

## Funksjoner

- **Alle ferger i Norge** — fergekryssinger oppdages automatisk fra rutedata (OpenStreetMap), ingen hardkodet sambandsliste
- **Sanntids rutetider** fra Entur, inkludert driftsavvik og innstilte avganger
- **Fire tidsmodus** — velg hvordan turen skal tidsettes:
  - **Nå** — beste rute akkurat nå; du drar dette minuttet
  - **Innen kl.** — appen finner det beste avreisetidspunktet mellom nå og klokkeslettet (minst mulig venting)
  - **Kl.** — du drar presis på klokkeslettet, eventuell venting havner på fergekaia
  - **Ankomst kl.** — baklengs-planlegging: seneste avreise som gir ankomst i tide
- **Rutealternativer** — ferge vs. kjøre rundt når begge er realistiske, som trykkbare kort og linjer på kartet. Parallelle fergekorridorer (f.eks. E39 over Anda–Lote) hentes fram ved å prøve ruter via fergekaiene i korridoren, og alternativer skilles på geografi — ikke på reisetid — så to ulike veier som tar like lang tid ikke slås sammen. Bare reelle valg vises: alternativer som tar mye lengre tid enn det beste filtreres bort
- **Velg avgang** — de neste fergeavgangene vises som chips i tidslinjen; velg en annen og hele planen regnes om
- **Rutetabell neste døgn** — fungerer over midnatt, morgendagens avganger merket «I MORGEN»
- **Neste ferge** — søk opp en fergekai og se neste avganger med nedtelling, uten å planlegge rute
- **Prisestimat** — AutoPASS-basert estimat per kryssing, justert for kjøretøytype (bil / el-bil / MC / over 6 m)
- **Via-punkt**, **min posisjon** (GPS), **favoritter og nylige søk**, **delbare lenker** (hele ruten i URL-en)
- **Tilpasset skjermen** — fullskjerm på mobil, sentrert kolonne på iPad, og i nettleser på PC et to-delt oppsett med panel til venstre og stort kart til høyre
- **Installerbar PWA** — legg til på hjemskjerm, med offline-fallback via service worker
- **Norsk og engelsk** UI (NO/EN-bryter, huskes)
- **Lys modus som standard**, mørk modus ett trykk unna (☀️/🌙-bryteren, huskes)
- **Feillogg på enheten** — de 20 siste feilene listes nederst på plan-skjermen (bare når noe faktisk har feilet) og kan kopieres inn i en feilmelding

## Datakilder

| Tjeneste | Brukes til |
|---|---|
| [Entur](https://developer.entur.org/) | Adressesøk (geocoder), fergetider, avvik og kanselleringer (journey-planner v3) |
| [Google Maps Directions](https://developers.google.com/maps/documentation/javascript/directions) *(valgfritt)* | Primær bilruting med alternativer og fergedeteksjon — aktiveres med API-nøkkel |
| [OSRM](http://project-osrm.org/) (demoserver) | Bilruting (fallback uten Google-nøkkel) |
| [CartoDB](https://carto.com/) + [Leaflet](https://leafletjs.com/) | Kartfliser (lyse/mørke etter tema) og kartvisning |

Alle kall gjøres direkte fra nettleseren — ingen backend. Kall som flere rutealternativer deler (fergekai-oppslag, rutetider, kaier i korridoren) caches i økten, og rutegeometri hentes som kodet polylinje, så ett søk Bergen–Ålesund koster 33 forespørsler / 1,6 MB i stedet for 54 / 5,2 MB — et nytt søk på samme tur koster 8. Google-ruting aktiveres med en API-nøkkel (Maps JavaScript API + Directions API): åpne appen én gang med `?gkey=DIN_NØKKEL` (lagres lokalt i nettleseren), eller sett `GOOGLE_KEY_DEFAULT` i `index.html` for alle brukere. Husk å begrense nøkkelen til appens domene i Google Cloud Console. Uten nøkkel brukes OSRM.

Feil lagres på enheten **og** sendes til `/api/log` — en liten serverless-funksjon (`api/log.js`) som skriver én linje til deployments runtime-logg. Den finner du i Vercel: Deployment → Logs, eller `vercel logs <deployment>`. Ingenting lagres i noen database, og Vercel beholder runtime-logger bare en kort periode — sett miljøvariabelen `LOG_WEBHOOK` til en Slack-, Discord- eller webhook.site-URL hvis du vil at de skal overleve lenger.

| URL-parameter | Effekt |
|---|---|
| `?logurl=https://…` | send feilene et annet sted i stedet |
| `?logurl=off` | behold dem bare på enheten |
| `?logurl=` | tilbake til `/api/log` |

Forespørsels-URL-er kortes ned til vert + sti før logging, siden de inneholder koordinater. Endepunktet er åpent, så det tar bare POST, avviser kropper over 4 KB, og logger kun de feltene appen sender — avkortet.

> **Merk:** Fergeprisene er *estimater* beregnet fra kryssingens lengde (lineær tilpasning mot publiserte AutoPASS-takster) og merkes «estimat» i appen. OSRM-demoserveren har ingen oppetidsgaranti; ved jevn bruk bør rutingen flyttes til en betalt tjeneste eller egen OSRM-instans.

## Teknisk

Hele appen er **én HTML-fil** (`index.html`): React 18 (UMD fra CDN, `React.createElement`, ingen byggesteg), Leaflet 1.9 og håndskrevet CSS. I tillegg:

- `manifest.json` + `icons/` — PWA-manifest og app-ikoner
- `sw.js` — service worker (network-first, offline-fallback)
- `api/log.js` — serverless-funksjon som tar imot feilloggen (Vercel, ingen konfigurasjon)
- `project/`, `chats/` — original designeksport fra Claude Design (historikk, brukes ikke av appen)

### Kjøre lokalt

Ingen avhengigheter eller byggesteg — server mappen statisk:

```bash
npx serve .          # eller: python3 -m http.server 8000
```

Åpne `http://localhost:8000`. API-ene (Entur/OSRM) er CORS-åpne og fungerer rett fra localhost.

### Deploy

Statisk site — pushes til `main` og Vercel deployer automatisk (ingen build command, output directory `.`). Filer i `api/` blir automatisk serverless-funksjoner ved siden av de statiske filene; `LOG_WEBHOOK` settes eventuelt under Settings → Environment Variables.
