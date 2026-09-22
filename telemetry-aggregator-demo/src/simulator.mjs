// Pure, browser-compatible demo physics. Never use these thresholds for real equipment.
export const STEP_MS = 30 * 60 * 1000;
export const WINDOW_MS = 21 * 24 * 60 * 60 * 1000;
const round = (value, digits = 2) => Number(value.toFixed(digits));
const EVENT_SEVERITIES = ["critical", "critical", "critical", "high", "critical", "medium", "high", "medium", "medium", "high", "medium", "high", "critical", "low", "info", "low", "medium", "high", "high", "medium", "low", "critical"];

export function simulateStep(atMs, IDLocatie, previousEnergy = 700 + IDLocatie * 120, previousOverspeed = false) {
  if (!Number.isFinite(atMs) || !Number.isInteger(IDLocatie)) throw new Error('Invalid timestamp or turbine ID.');
  const tick = Math.floor(atMs / STEP_MS);
  const date = new Date(tick * STEP_MS);
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60;
  const dayFraction = hour / 24;
  // A gust sequence plus a rotating demo event every 2h across the four turbines.
  const gust = IDLocatie === 1 ? 8 * Math.exp(-(((hour - 16) / 2.2) ** 2)) : 0;
  let VitVant = round(Math.max(0, 5.2 + 1.8 * Math.sin(tick * 0.19 + IDLocatie) + gust), 1);
  let Turatie = round(Math.min(VitVant * 16, 120), 1);
  let Voltaj = round(Turatie > 0 ? 24 + Turatie * 0.39 : 0, 1);
  let Amperaj;
  let Putere;
  let Vibratii = round(0.08 + Turatie / 1500, 2);
  let TempInfas;
  let CupluMec;
  let TempC = round(17 + 7 * Math.sin(2 * Math.PI * (dayFraction - 0.25)), 1);
  let PresAtm = 1008;
  let RadSolara = round(Math.max(0, Math.sin(Math.PI * (dayFraction - 0.22) / 0.55)) * 820, 1);
  let reading;
  const offsetTicks = (IDLocatie - 1) * 2;
  const slot = Math.floor((tick - offsetTicks) / 12);
  const codeNumber = ((slot + IDLocatie - 1) % 22 + 22) % 22 + 1;
  const eventAtThisSample = (tick - offsetTicks) % 12 === 0;
  const code = `ERR-${String(codeNumber).padStart(3, '0')}`;
  const overspeed = IDLocatie === 1 && VitVant * 16 > 120;
  if (overspeed) { VitVant = Math.max(VitVant, 9.8); Turatie = 120; }
  const uncurtailedPower = Math.min(1600, VitVant ** 3 * 3.1);
  Putere = round(uncurtailedPower * (overspeed ? 0.48 : 1), 1);
  Voltaj = round(Turatie > 0 ? 24 + Turatie * 0.39 : 0, 1);
  Amperaj = round(Voltaj > 0 ? Putere / Voltaj : 0, 2);
  TempInfas = round(26 + Putere / 145 + (overspeed ? 5 : 0), 1);
  CupluMec = round(Turatie ? Putere * 60 / (2 * Math.PI * Turatie) : 0, 2);
  if (eventAtThisSample) {
    switch (code) {
      case 'ERR-001': VitVant = 10.5; Turatie = 120; Putere = round(1600 * 0.48, 1); reading = '168 RPM înainte de limitare'; break;
      case 'ERR-002': TempInfas = 92; reading = '92 °C'; break;
      case 'ERR-003': Vibratii = 2.4; reading = '2,4 G'; break;
      case 'ERR-004': Voltaj = 258; Amperaj = round(Putere / Voltaj, 2); reading = '258 V'; break;
      case 'ERR-005': Amperaj = 18.6; Putere = round(Voltaj * Amperaj, 1); reading = '18,6 A'; break;
      case 'ERR-006': Voltaj = 18; Amperaj = round(Putere / Voltaj, 2); reading = '18 V'; break;
      case 'ERR-007': CupluMec = 1420; reading = '1.420 Nm'; break;
      case 'ERR-008': reading = 'Conexiune întreruptă'; break;
      case 'ERR-009': VitVant = 0; reading = '0 m/s · anemometru'; break;
      case 'ERR-010': Turatie = 0; reading = '0 RPM · encoder'; break;
      case 'ERR-011': reading = '86 dB'; break;
      case 'ERR-012': Voltaj = 0; Amperaj = 0; Putere = 0; reading = 'Invertor offline'; break;
      case 'ERR-013': Turatie = 148; reading = '148 RPM · frână ineficientă'; break;
      case 'ERR-014': TempC = 54; reading = '54 °C exterior'; break;
      case 'ERR-015': PresAtm = 946; reading = '946 hPa'; break;
      case 'ERR-016': RadSolara = 1320; reading = '1.320 W/m²'; break;
      case 'ERR-017': Vibratii = 0; reading = 'Semnal lipsă'; break;
      case 'ERR-018': TempInfas = 91; reading = '91 °C'; break;
      case 'ERR-019': reading = '14% abatere faze'; break;
      case 'ERR-020': Turatie = 0; Putere = 0; Amperaj = 0; reading = 'Frână activă · 0 RPM'; break;
      case 'ERR-021': reading = '10,8 V baterie backup'; break;
      case 'ERR-022': Turatie = 0; Putere = 0; Amperaj = 0; reading = 'E-STOP activ'; break;
    }
    if (code !== 'ERR-007') CupluMec = round(Turatie ? Putere * 60 / (2 * Math.PI * Turatie) : 0, 2);
  }
  const DataOra = date.toISOString();
  const alerts = eventAtThisSample ? [{ code, severity: EVENT_SEVERITIES[codeNumber - 1], status: 'active', occurredAt: DataOra, reading, action: code === 'ERR-001' ? 'Frânare simulată; puterea este limitată.' : 'Verificare și remediere conform ghidului demo.' }] : [];
  const Energie = previousEnergy + Putere * STEP_MS / 3_600_000_000;
  const row = { IDLocatie, DataOra, TempC, PresAtm, Umiditate: round(65 - 10 * Math.sin(2 * Math.PI * (dayFraction - 0.25)), 1), VitVant, DirectieVant: 'VSV', RadSolara, Turatie, Voltaj, Amperaj, Putere, Energie: round(Energie, 3), Vibratii, CupluMec, TempInfas, Alarma: alerts.length ? 1 : 0, alerts };
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
