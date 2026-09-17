import type { WorkbookTelemetry } from "@/app/fleet-data";

export type DatasetState = "loading" | "ready" | "unavailable";
export type OperatingState = "generating" | "idle" | "warning" | "fault" | "unknown";

export type TurbineStatus = {
  state: OperatingState;
  title: string;
  detail: string;
  issues: string[];
};

const numeric = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** One interpretation used by the client route; it never asserts a brake action. */
export function getTurbineStatus(point?: WorkbookTelemetry): TurbineStatus {
  if (!point) {
    return { state: "unknown", title: "Stare necunoscută", detail: "Nu există o citire disponibilă pentru această turbină.", issues: [] };
  }

  const vibration = numeric(point.Vibratii);
  const temperature = numeric(point.TempInfas);
  const current = numeric(point.Amperaj);
  const rotor = numeric(point.Turatie);
  const wind = numeric(point.VitVant);
  const power = numeric(point.Putere);
  const issues = [
    point.Alarma ? "Alarmă raportată de setul de date" : null,
    vibration !== null && vibration > 0.8 ? "Vibrație peste pragul de atenție" : null,
    temperature !== null && temperature > 65 ? "Temperatură generator peste pragul de atenție" : null,
    current !== null && current < 0 ? "Curent negativ raportat" : null,
    rotor !== null && rotor > 120 ? "Supraturație detectată" : null,
  ].filter((issue): issue is string => Boolean(issue));

  if (point.Alarma) return { state: "fault", title: "Alarmă activă", detail: "Este necesară verificarea de către operator.", issues };
  if (issues.length) return { state: "warning", title: "Necesită atenție", detail: "O citire depășește un prag de atenție.", issues };
  if ((power ?? 0) > 0) return { state: "generating", title: "Produce energie", detail: "Turbina generează la ultima mostră disponibilă.", issues: [] };
  if ((wind ?? 0) < 2.5) return { state: "idle", title: "Pregătită · vânt insuficient", detail: "Nu produce deoarece vântul este sub pragul de pornire.", issues: [] };
  return { state: "idle", title: "Pregătită · fără producție", detail: "Nu există producție la ultima mostră; verificați intervalul și telemetria.", issues: [] };
}

export function datasetLabel(state: DatasetState, latest?: WorkbookTelemetry) {
  if (state === "loading") return "Se încarcă setul beta…";
  if (state === "unavailable") return "Set beta indisponibil";
  return latest ? `Set beta static · ultima mostră ${latest.DataOra}` : "Set beta fără citiri";
}
