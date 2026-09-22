// Pure, browser-compatible demo physics. Never use these thresholds for real equipment.
export const STEP_MS = 30 * 60 * 1000;
export const WINDOW_MS = 21 * 24 * 60 * 60 * 1000;
const round = (value, digits = 2) => Number(value.toFixed(digits));

export function simulateStep(atMs, IDLocatie, previousEnergy = 700 + IDLocatie * 120, previousOverspeed = false) {
  if (!Number.isFinite(atMs) || !Number.isInteger(IDLocatie)) throw new Error('Invalid timestamp or turbine ID.');
  const tick = Math.floor(atMs / STEP_MS);
  const date = new Date(tick * STEP_MS);
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60;
  const dayFraction = hour / 24;
  // Daily gust near 16:00 UTC on turbine 1. Smooth wind and electrical response.
  const gust = IDLocatie === 1 ? 8 * Math.exp(-(((hour - 16) / 2.2) ** 2)) : 0;
  const VitVant = round(Math.max(0, 5.2 + 1.8 * Math.sin(tick * 0.19 + IDLocatie) + gust), 1);
  const freeRpm = VitVant * 16;
  const overspeed = IDLocatie === 1 && freeRpm > 120;
  const Turatie = round(Math.min(freeRpm, 120), 1);
  const uncurtailedPower = Math.min(1600, VitVant ** 3 * 3.1);
  const Putere = round(uncurtailedPower * (overspeed ? 0.48 : 1), 1);
  const Voltaj = round(Turatie > 0 ? 24 + Turatie * 0.39 : 0, 1);
  const Amperaj = round(Voltaj > 0 ? Putere / Voltaj : 0, 2);
  const RadSolara = round(Math.max(0, Math.sin(Math.PI * (dayFraction - 0.22) / 0.55)) * 820, 1);
  const DataOra = date.toISOString();
  const alerts = overspeed && !previousOverspeed ? [{ code: 'ERR-001', severity: 'critical', status: 'active', occurredAt: DataOra, reading: `${round(freeRpm, 0)} RPM (înainte de frânare)`, action: 'Frână aerodinamică / mecanică activată; putere limitată.' }] : [];
  const Energie = previousEnergy + Putere * STEP_MS / 3_600_000_000;
  const row = { IDLocatie, DataOra, TempC: round(17 + 7 * Math.sin(2 * Math.PI * (dayFraction - 0.25)), 1), PresAtm: 1008, Umiditate: round(65 - 10 * Math.sin(2 * Math.PI * (dayFraction - 0.25)), 1), VitVant, DirectieVant: 'VSV', RadSolara, Turatie, Voltaj, Amperaj, Putere, Energie: round(Energie, 3), Vibratii: round(0.08 + Turatie / 1500 + (overspeed ? 0.22 : 0), 2), CupluMec: round(Turatie ? Putere * 60 / (2 * Math.PI * Turatie) : 0, 2), TempInfas: round(26 + Putere / 145 + (overspeed ? 5 : 0), 1), Alarma: overspeed ? 1 : 0, alerts };
  return { row, energy: Energie, overspeed };
}

export function simulateTelemetry({ start, days = 21, turbineIds = [1, 2, 3, 4] } = {}) {
  if (!Number.isFinite(days) || days <= 0) throw new Error('days must be positive.');
  const endMs = Math.floor(Date.now() / STEP_MS) * STEP_MS;
  const startMs = start ? Date.parse(start) : endMs - days * 24 * 60 * 60 * 1000;
  if (!Number.isFinite(startMs)) throw new Error('Invalid start.');
  const rows = [];
  for (const IDLocatie of turbineIds) {
    let energy = 700 + IDLocatie * 120;
    let overspeed = false;
    for (let at = Math.ceil(startMs / STEP_MS) * STEP_MS; at <= endMs; at += STEP_MS) {
      const step = simulateStep(at, IDLocatie, energy, overspeed);
      rows.push(step.row);
      energy = step.energy;
      overspeed = step.overspeed;
    }
  }
  return rows;
}
