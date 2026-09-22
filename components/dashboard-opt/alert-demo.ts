import type { WorkbookTelemetry } from "@/app/fleet-data";

export type AlertSeverity = "info" | "low" | "medium" | "high" | "critical";
export type AlertIconName =
  | "overspeed"
  | "temperature"
  | "vibration"
  | "voltage"
  | "current"
  | "storm"
  | "hail"
  | "seismic"
  | "bird"
  | "fire"
  | "brake"
  | "network";

export type AlertItem = {
  code: string;
  occurredAt: string;
  severity: AlertSeverity;
  parameter: string;
  text: string;
  action: string;
  icon: AlertIconName;
  isDemoActive?: boolean;
};

const HOUR = 60 * 60 * 1000;

const RULES: Record<string, Omit<AlertItem, "occurredAt" | "isDemoActive">> = {
  "ERR-001": { code: "ERR-001", severity: "critical", parameter: "Supra-turație rotor", text: "Turația rotorului a depășit limita admisă în timpul unei rafale de vânt.", action: "Activare automată frână aerodinamică / mecanică.", icon: "overspeed" },
  "ERR-003": { code: "ERR-003", severity: "critical", parameter: "Vibrații excesive rotor", text: "Nivelul de vibrații pe axul vertical a depășit limita admisă.", action: "Oprire imediată și inspecție mecanică.", icon: "vibration" },
  "ERR-004": { code: "ERR-004", severity: "high", parameter: "Supratensiune generator", text: "Tensiunea de ieșire este peste limita admisă pentru invertor / baterii.", action: "Cuplare pe rezistență de frânare (Dump Load).", icon: "voltage" },
  "ERR-005": { code: "ERR-005", severity: "critical", parameter: "Supracurent", text: "Amperajul de ieșire a depășit pragul nominal.", action: "Deconectare automată a protecției invertorului.", icon: "current" },
  "ERR-008": { code: "ERR-008", severity: "medium", parameter: "Cădere conexiune rețea", text: "Semnalul de transmisie al controllerului a fost întrerupt temporar.", action: "Salvare locală până la reconectare.", icon: "network" },
  "ERR-013": { code: "ERR-013", severity: "critical", parameter: "Defecțiune sistem frânare", text: "Protecția la supra-turație nu a redus RPM-ul în timpul alocat.", action: "Comandă de urgență și verificare fizică.", icon: "brake" },
  "ERR-014": { code: "ERR-014", severity: "low", parameter: "Temperatură mediu extremă", text: "Temperatura exterioară este în afara intervalului recomandat.", action: "Monitorizare suplimentară a sistemului.", icon: "temperature" },
  "ERR-015": { code: "ERR-015", severity: "medium", parameter: "Presiune atmosferică anormală", text: "Schimbarea bruscă de presiune indică posibile rafale sau furtună.", action: "Pregătire sistem pentru rafale puternice.", icon: "storm" },
  "ERR-018": { code: "ERR-018", severity: "high", parameter: "Temperatură ridicată invertor", text: "Electronica de putere a invertorului a depășit pragul de temperatură.", action: "Ventilație forțată și reducere controlată a puterii.", icon: "temperature" },
};

function atOffset(latestIso: string, hours: number) {
  const date = new Date(latestIso);
  date.setTime(date.getTime() + hours * HOUR);
  return date.toISOString().slice(0, 16);
}

export function getDemoAlertHistory(latest: WorkbookTelemetry): AlertItem[] {
  const base = latest.DataOra;
  const events: Array<[string, number, boolean?]> = [
    ["ERR-014", -148],
    ["ERR-008", -119],
    ["ERR-015", -94],
    ["ERR-004", -70],
    ["ERR-003", -47],
    ["ERR-001", -25],
    ["ERR-004", -4, true],
  ];

  return events
    .map(([code, offset, isDemoActive]) => ({
      ...RULES[code],
      occurredAt: atOffset(base, offset),
      isDemoActive,
    }))
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
}

export const severityRank: Record<AlertSeverity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};
