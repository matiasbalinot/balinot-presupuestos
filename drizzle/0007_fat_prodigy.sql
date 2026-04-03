ALTER TABLE `budgets` ADD `taxKey` varchar(50) DEFAULT 's_iva_21';--> statement-breakpoint
ALTER TABLE `budgets` ADD `taxRate` decimal(5,2) DEFAULT '21';