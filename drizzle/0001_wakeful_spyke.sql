CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`location_id` integer NOT NULL,
	`author_username` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`author_username`) REFERENCES `users`(`username`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_notes_location_created` ON `notes` (`location_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`username`) REFERENCES `users`(`username`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_expiry` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`username` text PRIMARY KEY NOT NULL,
	`location_id` integer NOT NULL,
	`location` text NOT NULL,
	`role` integer NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`password_salt` text NOT NULL,
	`password_hash` text NOT NULL,
	`updated_at` integer NOT NULL
);
