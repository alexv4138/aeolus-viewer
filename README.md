# Sistem Monitorizare Urban Lentz 2

Aplicație de monitorizare pentru turbine eoliene. Interfața este în limba română, are autentificare pe utilizator și un panou principal pentru administrator.

## Date importate

- `TabelLocatieUseri.xlsx` este importat în `app/fleet-data.ts`: locații, utilizatori, roluri și date de autentificare.
- `TabelDateTurbine.xlsx` este importat în același fișier: 32 înregistrări istorice de telemetrie pentru locațiile 1 și 2.
- Utilizatorul cu `TipUtilizator = 1` este administratorul principal. În fișierul actual este Dragos Preda.
- Există patru locații de operare. Pentru locațiile 3 și 4, tabelul de telemetrie nu conține rânduri istorice; aplicația pornește cu o referință normalizată și adaugă citiri live la fiecare 20 de secunde, astfel încât fiecare utilizator are un panou funcțional.

Datele de acces din fișier sunt folosite doar pentru demonstrație. Pentru producție, parolele trebuie păstrate hash-uit într-un serviciu de autentificare, nu în codul clientului.

## Actualizare și istoric

- Interfața adaugă o citire nouă la fiecare 20 de secunde.
- `POST /api/telemetry` scrie aceleași cicluri în baza D1 configurată prin `.openai/hosting.json`.
- Tabela `telemetry` are index pe turbină și timp, pentru interogări rapide ale istoricului.

## Rulare locală

```powershell
npm install
npm run dev
```

Pentru compilarea de producție:

```powershell
npm run build
```

## Structură

- `app/page.tsx` — autentificare, dashboard individual și panou administrator.
- `app/fleet-data.ts` — setul de date importat din cele două fișiere Excel.
- `app/api/telemetry/route.ts` — persistarea ciclurilor de telemetrie în D1.
- `db/schema.ts` — schema și indecșii bazei de date.