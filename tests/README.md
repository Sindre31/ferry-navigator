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
| drive5 | Avreisemodus, EN/NO, avgangschips |
| drive6 | Velg avgang frem/tilbake |
| drive7 | Kjøretøytype-pris |
| drive8 | Slider fjernet, tidsinput, favoritter-persistens |
| drive9 | −5 min buffer |
| drive10 | Kaiankomst, favoritter fra/til, standardmodus |
| drive11 | Google-pipeline med kystrute |
| drive12 | Sortering + rød forsinket ankomst |
| drive13 | Karttid oppdateres ved fergebytte |
| drive14 | Navigasjonsmodus (GPS-simulering) |
| drive15 | Ferge 1 flytter avreise; ferge 2 varsler |
| drive16 | Avreise justeres til ferge, meny, iPad-oppsett |
| drive17 | Beste avreisetider |
| drive18 | Light mode |
