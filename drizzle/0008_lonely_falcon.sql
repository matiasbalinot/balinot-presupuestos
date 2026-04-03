CREATE TABLE `project_history_workers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectHistoryId` int NOT NULL,
	`workerName` varchar(100) NOT NULL,
	`department` enum('seo','design','development','management','various','external') NOT NULL,
	`clockifyUserId` varchar(100),
	`hoursFromClockify` decimal(8,2) DEFAULT '0',
	`hoursAdjustment` decimal(8,2) DEFAULT '0',
	`totalDays` decimal(6,2) DEFAULT '0',
	`isManual` boolean NOT NULL DEFAULT false,
	`notes` varchar(300),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_history_workers_id` PRIMARY KEY(`id`)
);
