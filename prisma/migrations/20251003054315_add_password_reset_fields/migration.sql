/*
  Warnings:

  - A unique constraint covering the columns `[password_reset_token]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `users` ADD COLUMN `password_reset_expires_at` TIMESTAMP(6) NULL,
    ADD COLUMN `password_reset_token` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_password_reset_token_key` ON `users`(`password_reset_token`);
