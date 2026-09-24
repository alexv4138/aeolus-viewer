export type WorkbookUser = { locationId: number; location: string; role: number; username: string; name: string; phone: string };
export type WorkbookTelemetry = { IDLocatie: number; DataOra: string; TempC: number; PresAtm: number; Umiditate: number; VitVant: number; DirectieVant: string; RadSolara: number; Turatie: number; Voltaj: number; Amperaj: number; Putere: number; Energie: number; Vibratii: number; CupluMec: number; TempInfas: number; Alarma: number; alerts?: Array<{ code: string; severity: "info" | "low" | "medium" | "high" | "critical"; status: "active" | "resolved"; occurredAt: string; reading?: string; action?: string }> };

// Public-safe, fictional accounts for the isolated visual sandbox.
export const workbookUsers: WorkbookUser[] = [
  ...[1, 2, 3, 4].map((locationId) => ({
    locationId,
    location: ["Comuna Fundeni, jud Călărași, România", "Comuna Cogealac, jud Constanța, România", "Comuna Topolog, jud Tulcea, România", "Comuna Feldioara, jud Sibiu, România"][locationId - 1],
    role: 2,
    username: `operator${locationId}@example.invalid`,
    name: `Operator Demo ${locationId}`,
    phone: "—",
  })),
  { locationId: 5, location: "ADMINISTRATOR", role: 1, username: "demo@example.invalid", name: "Operator Demo", phone: "—" },
];
