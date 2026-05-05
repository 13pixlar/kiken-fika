CREATE TABLE `badge_cache` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_name` text NOT NULL,
	`badge_url` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `badge_cache_team_name_unique` ON `badge_cache` (`team_name`);