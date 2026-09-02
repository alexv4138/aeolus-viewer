import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const turbines = sqliteTable('turbines', {
  id: text('id').primaryKey(),
  ownerUsername: text('owner_username').notNull(),
  label: text('label').notNull(),
  location: text('location').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (t) => [index('idx_turbines_owner').on(t.ownerUsername)]);

export const telemetry = sqliteTable('telemetry', {
  id: text('id').primaryKey(),
  turbineId: text('turbine_id').notNull().references(() => turbines.id),
  capturedAt: integer('captured_at', { mode: 'timestamp' }).notNull(),
  rpm: real('rpm').notNull(), outputKw: real('output_kw').notNull(), amps: real('amps').notNull(),
  temperature: real('temperature').notNull(), vibration: real('vibration').notNull(),
  windSpeed: real('wind_speed').notNull(), totalKwh: real('total_kwh').notNull(),
}, (t) => [index('idx_telemetry_turbine_captured').on(t.turbineId, t.capturedAt)]);

export const alerts = sqliteTable('alerts', {
  id: text('id').primaryKey(),
  turbineId: text('turbine_id').notNull().references(() => turbines.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  severity: text('severity', { enum: ['info', 'warning', 'critical'] }).notNull(),
  parameter: text('parameter').notNull(), message: text('message').notNull(),
  resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
}, (t) => [index('idx_alerts_turbine_created').on(t.turbineId, t.createdAt), index('idx_alerts_open').on(t.severity, t.resolvedAt)]);
