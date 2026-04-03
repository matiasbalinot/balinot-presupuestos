ALTER TABLE `budgets` ADD `clientNif` varchar(30);--> statement-breakpoint
ALTER TABLE `budgets` ADD `clientType` enum('company','person') DEFAULT 'company';--> statement-breakpoint
ALTER TABLE `budgets` ADD `clientAddress` varchar(300);--> statement-breakpoint
ALTER TABLE `budgets` ADD `clientCity` varchar(100);--> statement-breakpoint
ALTER TABLE `budgets` ADD `clientPostalCode` varchar(20);--> statement-breakpoint
ALTER TABLE `budgets` ADD `clientProvince` varchar(100);--> statement-breakpoint
ALTER TABLE `budgets` ADD `clientCountry` varchar(100) DEFAULT 'España';--> statement-breakpoint
ALTER TABLE `budgets` ADD `clientPhone` varchar(30);--> statement-breakpoint
ALTER TABLE `budgets` ADD `clientWebsite` varchar(200);