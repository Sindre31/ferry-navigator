# Browser-tester

End-to-end-tester kjørt med Playwright mot en lokal statisk server, med alle
eksterne API-er mocket (`mock.html` injiseres i `index.html`).

## Kjøre

```bash
# bygg testsiden: kopier index.html, bytt CDN-react mot lokale filer og
# injiser mock.html rett før app-scriptet, fjern ev. Google-nøkkel
# (se scripts i historikken), server katalogen:
python3 -m http.server 8741 &
node tests/driveN.mjs
```

Testene forventer `index.html` med:
- `vendor/react.js` + `vendor/react-dom.js` (React 18 UMD)
- `mock.html`-innholdet injisert før `'use strict'`-scriptet
- `GOOGLE_KEY_DEFAULT=''` (Google-pipeline testes via mock + localStorage-nøkkel)

| Test | Dekker |
|---|---|
| drive.mjs | Mobil fullskjerm, planlegging, deling, delt lenke, SW |
| drive2 | Rutealternativer, bytte, fergenavn A–B |
| drive4 | Min posisjon, via-punkt, pris, avvik, favoritter |
| drive5 | Avreisemodus, EN/NO, avgangschips, neste ferge |
| drive6 | Velg avgang frem/tilbake |
| drive7 | Kjøretøytype-pris (velger i resultatfoten) |
| drive8 | Slider fjernet, tidsinput, favoritter-persistens |
| drive9 | −5 min buffer |
| drive10 | Kaiankomst, favoritter fra/til, standardmodus |
| drive11 | Google-pipeline med kystrute |
| drive12 | Sortering + rød forsinket ankomst |
| drive13 | Karttid oppdateres ved fergebytte |
| drive14 | Navigasjonsmodus (GPS-simulering) |
| drive15 | Ferge 1 flytter avreise; ferge 2 varsler |
| drive16 | Avreise kl. er presis, meny, iPad-oppsett |
| drive17 | Beste avreisetider |
| drive18 | Lys modus (standard) + bytte til mørk |
| drive19 | Auto-oppdatering, omruting, live fartøy, offline-plan |
| drive20 | Tidsmodus: Nå / Innen / Kl. / Ankomst |
| drive21 | Avvist Google-nøkkel: fallback til OSRM + melding |

Screenshots havner i `$SHOT_DIR` (standard `/tmp/ferrynav-shots`).

Alle 21 testene skal være grønne. `mock.html` genererer rutetider for i dag og i
morgen i Oslo-tid, slik at appen bruker «live» data (ikke demo-rutene) og
innstilte avganger havner innenfor rutetabellens vindu uansett når testene kjøres.
