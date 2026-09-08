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

export const users = sqliteTable('users', {
  username: text('username').primaryKey(),
  locationId: integer('location_id').notNull(),
  location: text('location').notNull(),
  role: integer('role').notNull(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  passwordSalt: text('password_salt').notNull(),
  passwordHash: text('password_hash').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  username: text('username').notNull().references(() => users.username),
  createdAt: integer('created_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
}, (t) => [index('idx_sessions_expiry').on(t.expiresAt)]);

export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  locationId: integer('location_id').notNull(),
  authorUsername: text('author_username').notNull().references(() => users.username),
  body: text('body').notNull(),
  createdAt: integer('created_at').notNull(),
}, (t) => [index('idx_notes_location_created').on(t.locationId, t.createdAt)]);
