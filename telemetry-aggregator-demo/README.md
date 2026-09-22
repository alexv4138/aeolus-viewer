# Turbine telemetry aggregator — local demo

## Simulator JavaScript pentru beta

`src/simulator.mjs` este un generator JavaScript pur, utilizabil și în browser. La prima pornire creează **21 de zile anterioare ceasului sistemului**, la pas de **30 de minute**. `scripts/generate.mjs --watch` continuă **nelimitat**, verifică timpul sistemului în fiecare minut și adaugă numai citirile noi. După repornire completează automat fiecare interval lipsă. Fișierul pentru site păstrează o **fereastră mobilă de 21 de zile** pentru a nu încetini graficele; arhiva completă, fără limită de 21 de zile, este în `data/simulated-telemetry.archive.jsonl` (locală, nepublică).

Fiecare rând conține câmpurile de telemetrie și un câmp `alerts` cu evenimentele aferente timestamp-ului. Scenariul de rafală crește vântul și puterea, apoi declanșează `ERR-001` când turația liberă ar depăși 120 RPM; frânarea limitează turația și reduce puterea. Aceste praguri și relații sunt **doar pentru demonstrație**, nu limite reale de protecție.

Generare locală pentru site:

```powershell
npm run simulate -- ../public/simulated-telemetry.json
npm run simulate:live -- ../public/simulated-telemetry.json
```

În beta, `/beta?sim=1` citește `GET /api/telemetry` la fiecare minut; `/beta` fără parametrul `sim` rămâne pe istoricul existent. Endpoint-ul citește din D1 numai ultimele 21 de zile. Simulatorul nu modifică logica de randare a graficelor. Alertele sunt citite din același rând de telemetrie, nu calculate de server sau suprapuse arbitrar.

**Upload și backlog:** site-ul are `POST /api/telemetry` protejat prin `x-api-key` (secretul `TELEMETRY_INGEST_KEY` în configurarea Sites, nu în JavaScript-ul browserului). Runnerul local citește cheia și URL-ul din `.env.local`, adaugă citiri în `data/simulated-telemetry.archive.jsonl`, apoi transmite loturi de cel mult 50. Cursorul de upload este salvat în `data/push-offset.json` **doar după** un răspuns reușit; la indisponibilitatea site-ului loturile rămân în arhivă și sunt retrimise automat. Endpoint-ul este idempotent după perechea `(IDLocatie, DataOra)`. Nu ștergeți arhiva sau cursorul dacă doriți recuperarea backlog-ului.

Runnerul trebuie să rămână pornit pe un calculator/server persistent; dacă procesul se oprește, la repornire generează citirile lipsă conform ceasului sistemului. Browserul singur nu poate executa un proces în fundal când site-ul este închis. Păstrați ceasul sistemului sincronizat. Acesta este un **demo**, nu o integrare SCADA certificată.

Small, protocol-neutral handoff project for collecting readings from **local producer scripts** into one serialized process. It is deliberately separate from the dashboard and has no turbine/vendor driver built in.

## What is known — and what is not

The dashboard project includes historical spreadsheet data and reads `public/telemetry.json`; it also has APIs for login and notes. There is no evidence in this repository of a turbine communication driver (Modbus, OPC UA, MQTT, etc.). The spreadsheet is historical output, not a device protocol specification. Consequently this demo accepts normalized readings over local HTTP; it does not connect to a physical turbine or control it.

Before writing a real adapter, obtain the turbine/SCADA vendor and model, controller/PLC interface and register/tag map, supported protocol and version, units/scaling, sampling cadence, timestamp/timezone behavior, quality/status codes, alarm semantics, network topology, and authorized read-only credentials. Start with read-only telemetry. Do not send control commands through this demo.

## Run

Requires Node.js 22+ and Python 3 for the example producer. No npm packages are required.

```powershell
cd telemetry-aggregator-demo
npm test
npm start
```

The server binds to `127.0.0.1:8787` by default. Keep it on loopback; it has no authentication and is not suitable for LAN/public exposure. Runtime data is kept in `data/` and ignored by Git.

In a second terminal, post one sample:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8787/v1/readings -ContentType 'application/json' -InFile examples/sample-reading.json
Invoke-RestMethod http://127.0.0.1:8787/v1/snapshot
```

Or run the local polling example (Ctrl+C to stop):

```powershell
python examples/send-reading.py
```

The Python script intentionally uses illustrative constant values. Replace its `payload` generation with readings from the authorized local input source.

## Input contract

`POST /v1/readings`, JSON, maximum 64 KiB:

```json
{
  "turbineId": "turbine-01",
  "sensorId": "controller-a",
  "observedAt": "2026-09-23T12:30:00+03:00",
  "sequence": 42,
  "eventId": "controller-a-000042",
  "readings": {
    "windSpeed": { "value": 6.2, "unit": "m/s" },
    "rotorSpeed": { "value": 18.4, "unit": "rpm" },
    "alarm": 0
  }
}
```

`turbineId` and `sensorId` identify source/device; metric keys remain flexible while wiring this to the actual schema. Every value must be finite numeric. `observedAt` requires an explicit timezone. Send a stable `eventId` to make retries idempotent. The system stores event history and maintains latest timestamped value **per metric**, so delayed/out-of-order samples do not overwrite newer values.

## API

- `GET /health` — process health.
- `POST /v1/readings` — accept one observation event containing one or more metrics.
- `GET /v1/snapshot` — latest metric values grouped by turbine and sensor.
- `GET /v1/history? turbineId=turbine-01&since=2026-09-23T00:00:00Z&limit=100` — newest-first event history; limit 1–1000.

Writes are serialized through one process, appended to `data/events.jsonl`, then a snapshot is atomically replaced at `data/snapshot.json`. This is a single-machine demo design, not a multi-host/high-availability database. Back up the event log. If multiple producers run, they all POST to this one collector; they must not edit the snapshot file directly.

## How it could connect to the dashboard later

The dashboard currently loads a static historical JSON file; changing that file locally will not update a published/static site, and a hosted site cannot read a developer's local filesystem. For local development, a separate dashboard adapter can poll `/v1/snapshot` or subscribe to a future stream endpoint. For deployed use, place an authenticated ingestion service/database on an authorized reachable network and define retention, access control, TLS, validation, audit, and alerting. This demo intentionally does not add a browser connection or change the existing site.

## Data observations for developers (not safety thresholds)

The supplied workbook suggests 30-minute historical sampling, occasional 5-minute intervals and gaps, and columns such as `Turatie`, `Voltaj`, `Amperaj`, `Putere`, `Energie`, `Vibratii`, `CupluMec`, `TempInfas`, and binary `Alarma`. Some relationships (e.g. power near voltage × current) appear in the sample; they are not protocol guarantees or certified operating limits. Existing demo thresholds in the UI are not calibrated against an authoritative turbine specification. Do not use this workbook to set protection limits or operate equipment.
