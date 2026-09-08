# Sistem Monitorizare Urban Lentz 2

Aplicație de monitorizare pentru turbine eoliene. Interfața este în limba română, are autentificare pe utilizator și un panou principal pentru administrator.

## Date importate

- `TabelLocatieUseri.xlsx` este importat în `app/fleet-data.ts`: locații, utilizatori, roluri și date publice de profil.
- `TabelDateTurbine.xlsx` este importat în același fișier: 32 înregistrări istorice de telemetrie pentru locațiile 1 și 2. Intervalul sursă este 24 octombrie 2026, 15:17–16:32, respectiv 25 octombrie 2026, 00:52–02:07; nu conține date de la începutul anului.
- Utilizatorul cu `TipUtilizator = 1` este administratorul principal. În fișierul actual este Dragos Preda.
- Există patru locații de operare. Pentru locațiile 3 și 4, tabelul de telemetrie nu conține rânduri istorice; aplicația pornește cu o referință normalizată și adaugă citiri live la fiecare 20 de secunde, astfel încât fiecare utilizator are un panou funcțional.

Parolele nu sunt incluse în codul livrat browserului. Sunt stocate în D1 sub formă de hash PBKDF2 cu salt individual, iar autentificarea folosește un cookie de sesiune `HttpOnly`, `Secure` și `SameSite=Lax`.

Notițele sunt salvate în D1 pentru fiecare locație. Administratorul poate adăuga și vedea notițe pentru turbina selectată, iar un operator are acces numai la locația proprie.

## Actualizare și istoric

- Interfața citește istoricul importat din `public/telemetry.json`; nu generează valori simulate.
- Filtrele de dată sunt limitate la intervalul disponibil pentru turbina aleasă. Graficele nu inventează valori pentru un interval gol; arată clar că nu există citiri.
- Exportul CSV pentru Excel include toate coloanele de telemetrie din intervalul și locația selectate.
- API-urile `/api/auth/*` și `/api/notes` folosesc baza D1 configurată prin `.openai/hosting.json`.

## Rulare locală

```powershell
npm install
npm run dev
```

Pentru compilarea de producție:

```powershell
npm run build
```

## Export static pentru arrows.ro/turbina

Rulează `sincronizeaza-static.bat` din ramura principală. Scriptul sincronizează numai conținutul comun (`app`, `components`, `public` și dependențele) către `demo-static`, fără să suprascrie configurațiile proprii ale exportului static. Apoi reconstruiește folderul `turbina` și publică ambele ramuri pe GitHub.

După rulare, urcă **tot conținutul** folderului `wind-turbine-monitor-static\turbina` în folderul `/turbina/` de pe hosting. Exportul static citește `telemetry.json`, păstrează sesiunea local și generează exporturile în browser.

## Structură

- `app/page.tsx` — autentificare, dashboard individual și panou administrator.
- `public/telemetry.json` — citirile importate, folosite de dashboard și grafice.
- `turbina/` — exportul pregătit pentru FTP.

## Ramuri și publicare

- `main` este ramura principală pentru aplicația Sites și GitHub.
- `demo-static` este varianta statică pentru hosting FTP, fără API sau bază D1. Este folosită numai pentru `/turbina/` pe arrows.ro.

Nu publica din `demo-static` către Sites. Pentru modificări de conținut și FTP, rulează `sincronizeaza-static.bat`; el publică `main` și `demo-static` cu fișierele potrivite.
