import { sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { telemetry, turbines } from '@/db/schema';

const fleet = [
  ['t-01', 'andrei.pop', 'URBAN LENTZ 01', 'Fundeni, Călărași'],
  ['t-02', 'bianca.ionescu', 'URBAN LENTZ 02', 'Măgurele, Ilfov'],
  ['t-03', 'cristian.munteanu', 'URBAN LENTZ 03', 'Buzău, România'],
  ['t-04', 'diana.stan', 'URBAN LENTZ 04', 'Constanța, România'],
  ['t-05', 'rafael.dobre', 'URBAN LENTZ 05', 'Sibiu, România'],
] as const;

export async function POST() {
  const now = new Date();
  try {
    const db = getDb();
    const count = await db.select({ count: sql<number>`count(*)` }).from(turbines);
    if (!count[0]?.count) {
      await db.insert(turbines).values(fleet.map(([id, ownerUsername, label, location]) => ({ id, ownerUsername, label, location, createdAt: now })));
    }
    await db.insert(telemetry).values(fleet.map(([turbineId], index) => {
      const wind = 5 + Math.random() * 5 - index * .16;
      const outputKw = Math.max(.9, wind * .78 + (Math.random() - .5));
      return { id: crypto.randomUUID(), turbineId, capturedAt: now, rpm: 125 + wind * 11 + Math.random() * 15, outputKw, amps: outputKw * 1.62, temperature: 38 + Math.random() * 6, vibration: .035 + Math.random() * .04, windSpeed: wind, totalKwh: 1400 + index * 120 + Math.random() * 45 };
    }));
    return Response.json({ stored: fleet.length, capturedAt: now.toISOString(), durable: true });
  } catch {
    return Response.json({ stored: 0, capturedAt: now.toISOString(), durable: false });
  }
}
