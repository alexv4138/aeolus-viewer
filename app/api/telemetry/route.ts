import { sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { telemetry, turbines } from '@/db/schema';
import { workbookUsers, type WorkbookTelemetry } from '@/app/fleet-data';

const operators = workbookUsers.filter((user) => user.role !== 1);
const baseline: WorkbookTelemetry = { IDLocatie: 0, DataOra: '', TempC: 18, PresAtm: 1012, Umiditate: 65, VitVant: 6, DirectieVant: 'SSV', RadSolara: 300, Turatie: 100, Voltaj: 52, Amperaj: 6, Putere: 320, Energie: 0, Vibratii: 0.2, CupluMec: 35, TempInfas: 22, Alarma: 0 };

export async function POST() {
  const now = new Date();
  try {
    const db = getDb();
    const fleet = operators.map((user, index) => ({
      id: `t-loc-${user.locationId}`,
      ownerUsername: user.username,
      label: `TURBINĂ ${String(user.locationId).padStart(2, '0')}`,
      location: user.location,
      createdAt: now,
      baseline: { ...baseline, IDLocatie: user.locationId },
      index,
    }));
    await db.insert(turbines).values(fleet.map(({ baseline: _, index: __, ...turbine }) => turbine)).onConflictDoUpdate({
      target: turbines.id,
      set: { ownerUsername: sql`excluded.owner_username`, label: sql`excluded.label`, location: sql`excluded.location` },
    });
    await db.insert(telemetry).values(fleet.map(({ id, baseline, index }) => {
      const wind = Math.max(1.1, baseline.VitVant + (Math.random() - .42) * .55 + index * .12);
      const outputKw = Math.max(.01, (baseline.Putere + (wind - baseline.VitVant) * 24 + (Math.random() - .5) * 6) / 1000);
      return {
        id: crypto.randomUUID(), turbineId: id, capturedAt: now,
        rpm: baseline.Turatie + (wind - baseline.VitVant) * 13,
        outputKw, amps: baseline.Amperaj + (outputKw * 1000 - baseline.Putere) / 50,
        temperature: baseline.TempInfas + (Math.random() - .5) * .18,
        vibration: baseline.Vibratii + (Math.random() - .5) * .01,
        windSpeed: wind,
        totalKwh: baseline.Energie + outputKw / 3.6,
      };
    }));
    return Response.json({ stored: fleet.length, capturedAt: now.toISOString(), durable: true });
  } catch {
    return Response.json({ stored: 0, capturedAt: now.toISOString(), durable: false });
  }
}
