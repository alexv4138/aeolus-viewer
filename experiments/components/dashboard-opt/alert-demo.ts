import type { WorkbookTelemetry } from "@/app/fleet-data";

export type AlertSeverity = "info" | "low" | "medium" | "high" | "critical";
export type AlertIconName = "overspeed" | "temperature" | "vibration" | "voltage" | "current" | "storm" | "hail" | "seismic" | "bird" | "fire" | "brake" | "network" | "solar" | "pressure" | "sensor" | "sound" | "battery" | "estop" | "torque" | "circuit";
export type AlertRule = {
  code: string;
  parameter: string;
  description: string;
  severity: AlertSeverity;
  action: string;
  notifications: string;
  icon: AlertIconName;
};
export type AlertItem = Pick<AlertRule, "code" | "parameter" | "severity" | "action" | "icon"> & {
  text: string;
  reading?: string;
  occurredAt: string;
  status: "active" | "resolved";
  isDemoActive?: boolean;
};

export const DEMO_ALERT_READINGS: Record<string, string> = {
  "ERR-001": "1.850 RPM", "ERR-002": "92 °C", "ERR-003": "8,4 mm/s", "ERR-004": "258 V",
  "ERR-005": "18,6 A", "ERR-006": "184 V", "ERR-007": "1,42 kNm", "ERR-008": "0% semnal",
  "ERR-009": "0 m/s", "ERR-010": "0 RPM", "ERR-011": "86 dB", "ERR-012": "48 Hz",
  "ERR-013": "Timp frânare: 4,8 s", "ERR-014": "52 °C", "ERR-015": "986 hPa", "ERR-016": "1.320 W/m²",
  "ERR-017": "Semnal absent", "ERR-018": "91 °C", "ERR-019": "14% abatere", "ERR-020": "Frână activă · 0 RPM",
  "ERR-021": "10,8 V", "ERR-022": "E-STOP activ",
};

// Notification recipients are intentionally omitted; this is a client-visible demo catalog.
export const ALERT_CATALOG: AlertRule[] = [
  { code: "ERR-001", parameter: "Supra-turație (Overspeed)", description: "Turația (RPM) a depășit limita maximă admisă din cauza rafalelor de vânt.", severity: "critical", action: "Activare automată frână aerodinamică / mecanică.", notifications: "SMS + e-mail de urgență + alertă pop-up roșie și semnal sonor.", icon: "overspeed" },
  { code: "ERR-002", parameter: "Supraîncălzire generator", description: "Temperatura înfășurărilor generatorului a depășit pragul de protecție.", severity: "critical", action: "Deconectare sarcină / oprire de protecție.", notifications: "SMS + e-mail + pop-up roșu cu alarmă în interfață.", icon: "temperature" },
  { code: "ERR-003", parameter: "Vibrații excesive rotor", description: "Nivelul vibrațiilor pe axul vertical a depășit limita admisă (dezechilibru rotor/pale).", severity: "critical", action: "Oprire imediată a turbinei și inspecție mecanică.", notifications: "SMS + e-mail de urgență + pop-up roșu.", icon: "vibration" },
  { code: "ERR-004", parameter: "Supratensiune generator", description: "Tensiunea de ieșire depășește limita admisă a invertorului sau bateriilor.", severity: "high", action: "Cuplare pe rezistență de frânare (Dump Load).", notifications: "SMS, e-mail și notificare push.", icon: "voltage" },
  { code: "ERR-005", parameter: "Supracurent / scurtcircuit", description: "Amperajul depășește limita nominală pe linia de ieșire.", severity: "critical", action: "Deconectare automată a siguranței / protecției invertorului.", notifications: "SMS + e-mail + pop-up roșu în dashboard.", icon: "circuit" },
  { code: "ERR-006", parameter: "Subtensiune generator", description: "Generatorul se rotește, dar tensiunea este anormal de scăzută (posibilă punte redresoare defectă).", severity: "medium", action: "Notificare tehnician / verificare diode.", notifications: "E-mail, push și alertă vizuală galbenă.", icon: "voltage" },
  { code: "ERR-007", parameter: "Cuplu mecanic excesiv", description: "Blocaj parțial sau gripare a rulmenților axului vertical.", severity: "high", action: "Alertă mentenanță rulmenți / oprire de siguranță.", notifications: "SMS, e-mail și notificare push.", icon: "torque" },
  { code: "ERR-008", parameter: "Cădere conexiune rețea", description: "Pierderea semnalului Wi-Fi / 3G / 4G / 5G pe modulul de transmisie.", severity: "medium", action: "Salvare locală a datelor până la reconectare.", notifications: "E-mail la reconectare și banner Offline în dashboard.", icon: "network" },
  { code: "ERR-009", parameter: "Defecțiune senzor anemometru", description: "Lipsește semnalul vitezei vântului sau datele sunt incoerente.", severity: "medium", action: "Trecere automată în modul conservator.", notifications: "E-mail și notificare push.", icon: "sensor" },
  { code: "ERR-010", parameter: "Defecțiune senzor turație", description: "Semnal întrerupt de la encoderul / senzorul Hall RPM.", severity: "high", action: "Limitare putere / frânare preventivă.", notifications: "SMS, e-mail și alertă vizuală în dashboard.", icon: "sensor" },
  { code: "ERR-011", parameter: "Zgomot acustic anormal", description: "Nivelul dB depășește pragul normal (posibile fisuri ale palelor sau uzură rulmenți).", severity: "medium", action: "Inspecție vizuală a palelor și verificarea prinderilor.", notifications: "E-mail și notificare de mentenanță.", icon: "sound" },
  { code: "ERR-012", parameter: "Eroare invertor / rețea", description: "Invertorul Grid-tie este offline sau sincronizarea a eșuat.", severity: "high", action: "Cuplare pe Dump Load (rezistență de sarcină).", notifications: "SMS, e-mail și alertă portocalie în dashboard.", icon: "circuit" },
  { code: "ERR-013", parameter: "Defecțiune sistem frânare", description: "Protecția la supra-turație nu a redus RPM-ul în timpul alocat.", severity: "critical", action: "Alarmă acustică locală / comandă de urgență.", notifications: "SMS + e-mail de urgență + pop-up roșu.", icon: "brake" },
  { code: "ERR-014", parameter: "Temperatură mediu extremă", description: "Temperatura exterioară este sub −20 °C sau peste +50 °C.", severity: "low", action: "Monitorizare suplimentară a vâscozității lubrifiantului.", notifications: "E-mail și notificare informativă în aplicație.", icon: "temperature" },
  { code: "ERR-015", parameter: "Presiune atmosferică anormală", description: "Modificarea bruscă de presiune poate indica o furtună iminentă.", severity: "info", action: "Pregătirea sistemului pentru rafale puternice.", notifications: "Notificare push și indicator meteo special în dashboard.", icon: "pressure" },
  { code: "ERR-016", parameter: "Anomalie radiație solară", description: "Inconsistență între datele foto-senzorului și meteorologia locală.", severity: "low", action: "Autodiagnosticare senzor / curățare optică.", notifications: "Înregistrare în jurnalul de mentenanță, fără alertă directă.", icon: "solar" },
  { code: "ERR-017", parameter: "Defecțiune senzor vibrații", description: "Senzorul accelerometru nu trimite date validabile (date înghețate).", severity: "medium", action: "Avertisment pentru mentenanța senzorului.", notifications: "E-mail și notificare galbenă în dashboard.", icon: "sensor" },
  { code: "ERR-018", parameter: "Temperatură ridicată invertor", description: "Radiatorul invertorului sau electronica de putere a depășit pragul de temperatură.", severity: "high", action: "Pornire ventilație forțată / reducere derating putere.", notifications: "SMS, e-mail și alertă portocalie în dashboard.", icon: "temperature" },
  { code: "ERR-019", parameter: "Asimetrie sarcină faze", description: "Uzură neuniformă sau dezechilibrare electrică pe faze.", severity: "high", action: "Verificarea conexiunilor statorice ale generatorului.", notifications: "SMS, e-mail și alertă vizuală.", icon: "current" },
  { code: "ERR-020", parameter: "Alertă frână mecanică blocată", description: "Sistemul de frânare rămâne activat deși turația a scăzut la zero.", severity: "medium", action: "Resetare manuală / comandă de deblocare.", notifications: "E-mail și notificare push.", icon: "brake" },
  { code: "ERR-021", parameter: "Baterie backup controller descărcată", description: "Tensiunea bateriei interne a modulului de monitorizare este redusă.", severity: "low", action: "Înlocuirea bateriei tampon a controllerului.", notifications: "E-mail și reminder săptămânal în aplicație.", icon: "battery" },
  { code: "ERR-022", parameter: "Oprire de urgență manuală (E-Stop)", description: "Butonul fizic sau comanda software de oprire de urgență a fost activată.", severity: "critical", action: "Oprire totală până la deblocarea manuală.", notifications: "SMS, e-mail și stare de urgență pe tot ecranul.", icon: "estop" },
];

const HOUR = 60 * 60 * 1000;
function atOffset(latestIso: string, hours: number) {
  const date = new Date(latestIso);
  date.setTime(date.getTime() + hours * HOUR);
  return date.toISOString().slice(0, 16);
}

export function getDemoAlertHistory(latest: WorkbookTelemetry): AlertItem[] {
  const activeCode = "ERR-004";
  // Make the latest eight visible items demonstrate every severity, with two INFO events.
  const recentOffsets: Record<string, number> = {
    "ERR-015": -1,
    "ERR-014": -2,
    "ERR-006": -3,
    "ERR-001": -4,
    "ERR-021": -5,
    "ERR-008": -6,
  };
  const resolvedRules = ALERT_CATALOG.filter((rule) => rule.code !== activeCode);
  const resolved = resolvedRules.map((rule, index) => ({
    ...rule,
    text: rule.description,
    reading: DEMO_ALERT_READINGS[rule.code],
    occurredAt: atOffset(latest.DataOra, recentOffsets[rule.code] ?? -(8 + index)),
    status: "resolved" as const,
  }));
  const infoRule = ALERT_CATALOG.find((rule) => rule.code === "ERR-015")!;
  resolved.push({ ...infoRule, text: infoRule.description, reading: DEMO_ALERT_READINGS[infoRule.code], occurredAt: atOffset(latest.DataOra, -7), status: "resolved" as const });
  const activeRule = ALERT_CATALOG.find((rule) => rule.code === activeCode)!;
  const active = {
    ...activeRule,
    text: activeRule.description,
    reading: DEMO_ALERT_READINGS[activeRule.code],
    occurredAt: atOffset(latest.DataOra, -0.25),
    status: "active" as const,
    isDemoActive: true,
  };
  return [...resolved, active].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
}

export const severityRank: Record<AlertSeverity, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
