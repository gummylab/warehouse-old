CREATE TABLE `forms` (
	`id` text PRIMARY KEY NOT NULL,
	`sort_order` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_forms` (
	`user_id` text NOT NULL,
	`form_id` text NOT NULL,
	PRIMARY KEY(`user_id`, `form_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON UPDATE no action ON DELETE cascade
);
