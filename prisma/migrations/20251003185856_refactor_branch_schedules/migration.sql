/*
  Warnings:

  - You are about to drop the column `closing_time` on the `branches` table. All the data in the column will be lost.
  - You are about to drop the column `opening_time` on the `branches` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `branches` DROP COLUMN `closing_time`,
    DROP COLUMN `opening_time`;

-- CreateTable
CREATE TABLE `branch_schedules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `branch_id` INTEGER NOT NULL,
    `dayOfWeek` INTEGER NOT NULL,
    `opening_time` TIME NOT NULL,
    `closing_time` TIME NOT NULL,
    `is_closed` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `branch_schedules` ADD CONSTRAINT `branch_schedules_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
