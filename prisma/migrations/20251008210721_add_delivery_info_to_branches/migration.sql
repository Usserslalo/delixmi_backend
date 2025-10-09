-- AlterTable
ALTER TABLE `branches` ADD COLUMN `delivery_fee` DECIMAL(10, 2) NOT NULL DEFAULT 25.00,
    ADD COLUMN `delivery_radius` DECIMAL(5, 2) NOT NULL DEFAULT 5.0,
    ADD COLUMN `estimated_delivery_max` INTEGER NOT NULL DEFAULT 35,
    ADD COLUMN `estimated_delivery_min` INTEGER NOT NULL DEFAULT 25;
