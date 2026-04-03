ALTER TABLE `budgets` ADD `commissionType` enum('none','luis','commercial') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `budgets` ADD `commissionPct` decimal(5,2) DEFAULT '10';--> statement-breakpoint
ALTER TABLE `budgets` ADD `commissionAmount` decimal(10,2) DEFAULT '0';