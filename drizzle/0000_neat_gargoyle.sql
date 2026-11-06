CREATE TABLE `images` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`order_id` text NOT NULL,
	`seq` integer NOT NULL,
	`package` text,
	`file_name` text,
	`mime_type` text,
	`file_size` integer,
	`storage_key` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "images_package_check" CHECK("images"."package" IS NULL OR "images"."package" IN ('Primary', 'Inner Box', 'Sleeve Box', 'Tray', 'Carton'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_images_item_seq` ON `images` (`item_id`,`seq`);--> statement-breakpoint
CREATE INDEX `idx_images_order` ON `images` (`order_id`);--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`parent_item_id` text,
	`item_number` integer NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_items_order_number` ON `items` (`order_id`,`item_number`);--> statement-breakpoint
CREATE INDEX `idx_items_parent` ON `items` (`parent_item_id`);--> statement-breakpoint
CREATE TABLE `line_walks` (
	`id` text PRIMARY KEY NOT NULL,
	`walk_date` text NOT NULL,
	`shift` text NOT NULL,
	`line` text NOT NULL,
	`brand` text NOT NULL,
	`pack_style` text NOT NULL,
	`people` integer NOT NULL,
	`amount` integer NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "line_walks_shift_check" CHECK("line_walks"."shift" IN ('day', 'night')),
	CONSTRAINT "line_walks_people_check" CHECK("line_walks"."people" >= 0),
	CONSTRAINT "line_walks_amount_check" CHECK("line_walks"."amount" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_line_walks_key` ON `line_walks` (`walk_date`,`shift`,`line`,`brand`,`pack_style`);--> statement-breakpoint
CREATE INDEX `idx_line_walks_date` ON `line_walks` (`walk_date`);--> statement-breakpoint
CREATE TABLE `lines` (
	`name` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`order_number` text NOT NULL,
	`order_date` text NOT NULL,
	`line` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_orders_number_date_line` ON `orders` (`order_number`,`order_date`,`line`);--> statement-breakpoint
CREATE INDEX `idx_orders_order_number` ON `orders` (`order_number`);--> statement-breakpoint
CREATE INDEX `idx_orders_line` ON `orders` (`line`);--> statement-breakpoint
CREATE INDEX `idx_orders_order_date` ON `orders` (`order_date`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`avatar_url` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`requested_at` text NOT NULL,
	`decided_at` text,
	`line_user_id` text,
	CONSTRAINT "users_status_check" CHECK("users"."status" IN ('pending', 'approved'))
);
--> statement-breakpoint
CREATE INDEX `idx_users_status` ON `users` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_line_user_id` ON `users` (`line_user_id`);