CREATE TABLE `admin_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_username_unique` ON `admin_users` (`username`);--> statement-breakpoint
CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fika_signups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`parent_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `parents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fika_signups_game_parent_unique` ON `fika_signups` (`game_id`,`parent_id`);--> statement-breakpoint
CREATE TABLE `games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uid` text NOT NULL,
	`title` text NOT NULL,
	`location` text,
	`starts_at` integer NOT NULL,
	`ends_at` integer,
	`is_home_game` integer DEFAULT false NOT NULL,
	`raw_summary` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `games_uid_unique` ON `games` (`uid`);--> statement-breakpoint
CREATE TABLE `parents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`pin_hash` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `parents_name_unique` ON `parents` (`name`);