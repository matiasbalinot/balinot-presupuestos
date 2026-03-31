CREATE TABLE `budget_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budgetId` int NOT NULL,
	`workerId` int,
	`area` enum('seo','design','development','management','commission','various','fixed') NOT NULL,
	`description` varchar(300) NOT NULL,
	`estimatedHours` decimal(6,2) DEFAULT '0',
	`costPerHour` decimal(10,2) DEFAULT '0',
	`salePricePerHour` decimal(10,2) DEFAULT '0',
	`lineCost` decimal(10,2) DEFAULT '0',
	`lineSale` decimal(10,2) DEFAULT '0',
	`isFixedPrice` boolean DEFAULT false,
	`fixedPrice` decimal(10,2),
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `budget_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budgetNumber` varchar(30) NOT NULL,
	`projectName` varchar(200) NOT NULL,
	`clientName` varchar(200) NOT NULL,
	`clientEmail` varchar(320),
	`projectTypeId` int,
	`managementPct` decimal(5,2) DEFAULT '40',
	`status` enum('draft','sent','accepted','rejected') NOT NULL DEFAULT 'draft',
	`totalCost` decimal(10,2) DEFAULT '0',
	`totalSale` decimal(10,2) DEFAULT '0',
	`grossMargin` decimal(10,2) DEFAULT '0',
	`grossMarginPct` decimal(5,2) DEFAULT '0',
	`fixedCostsAmount` decimal(10,2) DEFAULT '0',
	`netMargin` decimal(10,2) DEFAULT '0',
	`netMarginPct` decimal(5,2) DEFAULT '0',
	`notes` text,
	`internalNotes` text,
	`holdedContactId` varchar(100),
	`holdedDocumentId` varchar(100),
	`createdBy` int,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `budgets_id` PRIMARY KEY(`id`),
	CONSTRAINT `budgets_budgetNumber_unique` UNIQUE(`budgetNumber`)
);
--> statement-breakpoint
CREATE TABLE `commissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`percentage` decimal(5,2) NOT NULL,
	`appliesTo` enum('subtotal','with_management') NOT NULL DEFAULT 'with_management',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fixed_costs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`monthlyAmount` decimal(10,2) NOT NULL,
	`projectAllocationPct` decimal(5,2) NOT NULL,
	`category` enum('management','infrastructure','licenses','other') NOT NULL,
	`holdedSource` boolean DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fixed_costs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integration_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`service` enum('holded','clockify') NOT NULL,
	`apiKey` varchar(200),
	`workspaceId` varchar(100),
	`isConnected` boolean DEFAULT false,
	`lastTestedAt` timestamp,
	`lastSyncedAt` timestamp,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integration_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `integration_config_service_unique` UNIQUE(`service`)
);
--> statement-breakpoint
CREATE TABLE `project_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clockifyProjectId` varchar(100),
	`projectName` varchar(200) NOT NULL,
	`projectTypeId` int,
	`realSeoHours` decimal(6,2) DEFAULT '0',
	`realDesignHours` decimal(6,2) DEFAULT '0',
	`realDevHours` decimal(6,2) DEFAULT '0',
	`realVariousHours` decimal(6,2) DEFAULT '0',
	`realTotalHours` decimal(6,2) DEFAULT '0',
	`estimatedTotalHours` decimal(6,2) DEFAULT '0',
	`efficiencyStatus` enum('efficient','correct','excess'),
	`benefitPct` decimal(5,2),
	`syncedAt` timestamp DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(50) NOT NULL,
	`avgSeoHours` decimal(6,2) DEFAULT '0',
	`avgDesignHours` decimal(6,2) DEFAULT '0',
	`avgDevHours` decimal(6,2) DEFAULT '0',
	`avgVariousHours` decimal(6,2) DEFAULT '0',
	`sampleCount` int DEFAULT 0,
	`lastSyncedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_types_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `workers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`department` enum('seo','design','development','management','various') NOT NULL,
	`costPerHour` decimal(10,2) NOT NULL,
	`salePricePerHour` decimal(10,2) NOT NULL,
	`clockifyUserId` varchar(100),
	`clockifyUserEmail` varchar(320),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workers_id` PRIMARY KEY(`id`)
);
