ALTER TABLE `budgets` ADD `holdedServiceId` varchar(100);--> statement-breakpoint
ALTER TABLE `budgets` ADD `holdedServiceName` varchar(300);--> statement-breakpoint
ALTER TABLE `budgets` ADD `holdedServiceDesc` text;--> statement-breakpoint
ALTER TABLE `budgets` ADD `holdedServicePrice` decimal(10,2);