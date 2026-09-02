CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`turbine_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`severity` text NOT NULL,
	`parameter` text NOT NULL,
	`message` text NOT NULL,
	`resolved_at` integer,
	FOREIGN KEY (`turbine_id`) REFERENCES `turbines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_alerts_turbine_created` ON `alerts` (`turbine_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_alerts_open` ON `alerts` (`severity`,`resolved_at`);--> statement-breakpoint
CREATE TABLE `telemetry` (
	`id` text PRIMARY KEY NOT NULL,
	`turbine_id` text NOT NULL,
	`captured_at` integer NOT NULL,
	`rpm` real NOT NULL,
	`output_kw` real NOT NULL,
	`amps` real NOT NULL,
	`temperature` real NOT NULL,
	`vibration` real NOT NULL,
	`wind_speed` real NOT NULL,
	`total_kwh` real NOT NULL,
	FOREIGN KEY (`turbine_id`) REFERENCES `turbines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_telemetry_turbine_captured` ON `telemetry` (`turbine_id`,`captured_at`);--> statement-breakpoint
CREATE TABLE `turbines` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_username` text NOT NULL,
	`label` text NOT NULL,
	`location` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_turbines_owner` ON `turbines` (`owner_username`);