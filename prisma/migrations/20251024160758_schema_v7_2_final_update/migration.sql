/*
  Warnings:

  - You are about to alter the column `current_latitude` on the `driver_profiles` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,8)` to `Decimal(10,7)`.
  - You are about to alter the column `current_longitude` on the `driver_profiles` table. The data in that column could be lost. The data in that column will be cast from `Decimal(11,8)` to `Decimal(10,7)`.
  - You are about to alter the column `type` on the `driver_wallet_transactions` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(14))`.
  - You are about to drop the column `branch_id` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `payment_method` on the `orders` table. All the data in the column will be lost.
  - You are about to alter the column `commission_rate_snapshot` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `Decimal(10,2)`.
  - You are about to alter the column `type` on the `restaurant_wallet_transactions` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(14))`.
  - You are about to alter the column `commission_rate` on the `restaurants` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `Decimal(10,2)`.
  - You are about to alter the column `latitude` on the `restaurants` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,8)` to `Decimal(10,7)`.
  - You are about to alter the column `longitude` on the `restaurants` table. The data in that column could be lost. The data in that column will be cast from `Decimal(11,8)` to `Decimal(10,7)`.
  - You are about to drop the column `branch_id` on the `user_role_assignments` table. All the data in the column will be lost.
  - You are about to drop the `ModifierGroup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ModifierOption` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductModifier` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `address` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `branch_schedules` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `branches` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[restaurant_id,subcategory_id,name]` on the table `products` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[owner_id]` on the table `restaurants` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `cart_item_modifiers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `order_item_modifiers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `restaurant_id` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `role_has_permissions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `ModifierGroup` DROP FOREIGN KEY `ModifierGroup_restaurantId_fkey`;

-- DropForeignKey
ALTER TABLE `ModifierOption` DROP FOREIGN KEY `ModifierOption_modifierGroupId_fkey`;

-- DropForeignKey
ALTER TABLE `ProductModifier` DROP FOREIGN KEY `ProductModifier_modifierGroupId_fkey`;

-- DropForeignKey
ALTER TABLE `ProductModifier` DROP FOREIGN KEY `ProductModifier_productId_fkey`;

-- DropForeignKey
ALTER TABLE `address` DROP FOREIGN KEY `address_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `branch_schedules` DROP FOREIGN KEY `branch_schedules_branch_id_fkey`;

-- DropForeignKey
ALTER TABLE `branches` DROP FOREIGN KEY `branches_restaurant_id_fkey`;

-- DropForeignKey
ALTER TABLE `cart_item_modifiers` DROP FOREIGN KEY `cart_item_modifiers_cart_item_id_fkey`;

-- DropForeignKey
ALTER TABLE `cart_item_modifiers` DROP FOREIGN KEY `cart_item_modifiers_modifier_option_id_fkey`;

-- DropForeignKey
ALTER TABLE `cart_items` DROP FOREIGN KEY `cart_items_cart_id_fkey`;

-- DropForeignKey
ALTER TABLE `cart_items` DROP FOREIGN KEY `cart_items_product_id_fkey`;

-- DropForeignKey
ALTER TABLE `carts` DROP FOREIGN KEY `carts_restaurant_id_fkey`;

-- DropForeignKey
ALTER TABLE `carts` DROP FOREIGN KEY `carts_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `driver_profiles` DROP FOREIGN KEY `driver_profiles_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `driver_wallets` DROP FOREIGN KEY `driver_wallets_driver_id_fkey`;

-- DropForeignKey
ALTER TABLE `order_item_modifiers` DROP FOREIGN KEY `order_item_modifiers_modifier_option_id_fkey`;

-- DropForeignKey
ALTER TABLE `orders` DROP FOREIGN KEY `orders_address_id_fkey`;

-- DropForeignKey
ALTER TABLE `orders` DROP FOREIGN KEY `orders_branch_id_fkey`;

-- DropForeignKey
ALTER TABLE `products` DROP FOREIGN KEY `products_restaurant_id_fkey`;

-- DropForeignKey
ALTER TABLE `products` DROP FOREIGN KEY `products_subcategory_id_fkey`;

-- DropForeignKey
ALTER TABLE `refresh_tokens` DROP FOREIGN KEY `refresh_tokens_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `restaurant_wallets` DROP FOREIGN KEY `restaurant_wallets_restaurant_id_fkey`;

-- DropForeignKey
ALTER TABLE `role_has_permissions` DROP FOREIGN KEY `role_has_permissions_permission_id_fkey`;

-- DropForeignKey
ALTER TABLE `role_has_permissions` DROP FOREIGN KEY `role_has_permissions_role_id_fkey`;

-- DropForeignKey
ALTER TABLE `subcategories` DROP FOREIGN KEY `subcategories_category_id_fkey`;

-- DropForeignKey
ALTER TABLE `subcategories` DROP FOREIGN KEY `subcategories_restaurant_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_role_assignments` DROP FOREIGN KEY `user_role_assignments_branch_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_role_assignments` DROP FOREIGN KEY `user_role_assignments_restaurant_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_role_assignments` DROP FOREIGN KEY `user_role_assignments_role_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_role_assignments` DROP FOREIGN KEY `user_role_assignments_user_id_fkey`;

-- DropIndex
DROP INDEX `cart_item_modifiers_cart_item_id_fkey` ON `cart_item_modifiers`;

-- DropIndex
DROP INDEX `cart_item_modifiers_modifier_option_id_fkey` ON `cart_item_modifiers`;

-- DropIndex
DROP INDEX `order_item_modifiers_modifier_option_id_fkey` ON `order_item_modifiers`;

-- DropIndex
DROP INDEX `orders_branch_id_fkey` ON `orders`;

-- DropIndex
DROP INDEX `user_role_assignments_branch_id_fkey` ON `user_role_assignments`;

-- DropIndex
DROP INDEX `user_role_assignments_restaurant_id_fkey` ON `user_role_assignments`;

-- AlterTable
ALTER TABLE `cart_item_modifiers` ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `deleted_at` TIMESTAMP(6) NULL,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `cart_items` ADD COLUMN `deleted_at` TIMESTAMP(6) NULL;

-- AlterTable
ALTER TABLE `carts` ADD COLUMN `deleted_at` TIMESTAMP(6) NULL;

-- AlterTable
ALTER TABLE `categories` ADD COLUMN `deleted_at` TIMESTAMP(6) NULL;

-- AlterTable
ALTER TABLE `driver_profiles` ADD COLUMN `deleted_at` TIMESTAMP(6) NULL,
    ADD COLUMN `domicilio_fiscal` TEXT NULL,
    ADD COLUMN `is_blocked` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `opcion_pago_definitivo` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `rfc` VARCHAR(13) NULL,
    MODIFY `current_latitude` DECIMAL(10, 7) NULL,
    MODIFY `current_longitude` DECIMAL(10, 7) NULL;

-- AlterTable
ALTER TABLE `driver_wallet_transactions` ADD COLUMN `deleted_at` TIMESTAMP(6) NULL,
    ADD COLUMN `external_id` VARCHAR(255) NULL,
    ADD COLUMN `is_paid_out` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `paid_out_at` DATETIME(3) NULL,
    MODIFY `type` ENUM('RESTAURANT_ORDER_CREDIT', 'RESTAURANT_PAYOUT_DEBIT', 'RESTAURANT_REFUND_DEBIT', 'RESTAURANT_PLATFORM_FEE_DEBIT', 'DRIVER_DELIVERY_FEE_CREDIT', 'DRIVER_TIPS_CREDIT', 'DRIVER_PAYOUT_DEBIT', 'DRIVER_PENALTY_DEBIT', 'ADJUSTMENT_CREDIT', 'ADJUSTMENT_DEBIT') NOT NULL;

-- AlterTable
ALTER TABLE `driver_wallets` ADD COLUMN `deleted_at` TIMESTAMP(6) NULL;

-- AlterTable
ALTER TABLE `order_item_modifiers` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `deleted_at` TIMESTAMP(6) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `order_items` ADD COLUMN `deleted_at` TIMESTAMP(6) NULL;

-- AlterTable
ALTER TABLE `orders` DROP COLUMN `branch_id`,
    DROP COLUMN `payment_method`,
    ADD COLUMN `deleted_at` TIMESTAMP(6) NULL,
    ADD COLUMN `driver_fee_gross` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `driver_fee_net` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `driver_retained_isr` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `driver_retained_iva` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `order_confirmed_at` TIMESTAMP(6) NULL,
    ADD COLUMN `order_prepared_at` TIMESTAMP(6) NULL,
    ADD COLUMN `order_ready_for_pickup_at` TIMESTAMP(6) NULL,
    ADD COLUMN `payment_method_type` ENUM('CASH', 'CARD_ONLINE', 'CARD_POS', 'WALLET', 'COUPON') NOT NULL DEFAULT 'CASH',
    ADD COLUMN `restaurant_id` INTEGER NOT NULL,
    ADD COLUMN `retained_isr` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `retained_iva` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    MODIFY `commission_rate_snapshot` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `payments` ADD COLUMN `deleted_at` TIMESTAMP(6) NULL;

-- AlterTable
ALTER TABLE `permissions` ADD COLUMN `deleted_at` TIMESTAMP(6) NULL;

-- AlterTable
ALTER TABLE `products` ADD COLUMN `deleted_at` TIMESTAMP(6) NULL,
    ADD COLUMN `is_flagged` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `stock_quantity` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `refresh_tokens` ADD COLUMN `deleted_at` TIMESTAMP(6) NULL;

-- AlterTable
ALTER TABLE `restaurant_wallet_transactions` ADD COLUMN `deleted_at` TIMESTAMP(6) NULL,
    ADD COLUMN `external_id` VARCHAR(255) NULL,
    ADD COLUMN `is_paid_out` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `paid_out_at` DATETIME(3) NULL,
    MODIFY `type` ENUM('RESTAURANT_ORDER_CREDIT', 'RESTAURANT_PAYOUT_DEBIT', 'RESTAURANT_REFUND_DEBIT', 'RESTAURANT_PLATFORM_FEE_DEBIT', 'DRIVER_DELIVERY_FEE_CREDIT', 'DRIVER_TIPS_CREDIT', 'DRIVER_PAYOUT_DEBIT', 'DRIVER_PENALTY_DEBIT', 'ADJUSTMENT_CREDIT', 'ADJUSTMENT_DEBIT') NOT NULL;

-- AlterTable
ALTER TABLE `restaurant_wallets` ADD COLUMN `deleted_at` TIMESTAMP(6) NULL;

-- AlterTable
ALTER TABLE `restaurants` ADD COLUMN `deleted_at` TIMESTAMP(6) NULL,
    ADD COLUMN `delivery_fee` DECIMAL(10, 2) NOT NULL DEFAULT 25.00,
    ADD COLUMN `delivery_radius` DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
    ADD COLUMN `estimated_delivery_max` INTEGER NOT NULL DEFAULT 35,
    ADD COLUMN `estimated_delivery_min` INTEGER NOT NULL DEFAULT 25,
    ADD COLUMN `is_globally_open` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `is_manually_verified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `uses_platform_drivers` BOOLEAN NOT NULL DEFAULT true,
    MODIFY `commission_rate` DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
    MODIFY `latitude` DECIMAL(10, 7) NULL,
    MODIFY `longitude` DECIMAL(10, 7) NULL;

-- AlterTable
ALTER TABLE `role_has_permissions` ADD COLUMN `deleted_at` TIMESTAMP(6) NULL,
    ADD COLUMN `updated_at` TIMESTAMP(6) NOT NULL;

-- AlterTable
ALTER TABLE `roles` ADD COLUMN `deleted_at` TIMESTAMP(6) NULL;

-- AlterTable
ALTER TABLE `subcategories` ADD COLUMN `deleted_at` TIMESTAMP(6) NULL,
    ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `user_role_assignments` DROP COLUMN `branch_id`,
    ADD COLUMN `deleted_at` TIMESTAMP(6) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `deleted_at` TIMESTAMP(6) NULL,
    ADD COLUMN `is_suspicious` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `password_reset_token` VARCHAR(255) NULL;

-- DropTable
DROP TABLE `ModifierGroup`;

-- DropTable
DROP TABLE `ModifierOption`;

-- DropTable
DROP TABLE `ProductModifier`;

-- DropTable
DROP TABLE `address`;

-- DropTable
DROP TABLE `branch_schedules`;

-- DropTable
DROP TABLE `branches`;

-- CreateTable
CREATE TABLE `global_config` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `default_delivery_radius` DECIMAL(10, 2) NOT NULL,
    `global_commission_rate` DECIMAL(10, 2) NOT NULL,
    `base_delivery_fee` DECIMAL(10, 2) NOT NULL,
    `system_terms` TEXT NULL,
    `system_privacy_policy` TEXT NULL,
    `min_app_version_customer` VARCHAR(10) NOT NULL DEFAULT '1.0.0',
    `min_app_version_driver` VARCHAR(10) NOT NULL DEFAULT '1.0.0',
    `min_app_version_restaurant` VARCHAR(10) NOT NULL DEFAULT '1.0.0',
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_areas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `type` ENUM('CITY', 'NEIGHBORHOOD', 'CUSTOM_POLYGON') NOT NULL,
    `center_latitude` DECIMAL(10, 7) NULL,
    `center_longitude` DECIMAL(10, 7) NULL,
    `radius_km` DECIMAL(10, 2) NULL,
    `polygon_coordinates` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deleted_at` TIMESTAMP(6) NULL,

    UNIQUE INDEX `service_areas_name_key`(`name`),
    INDEX `service_areas_is_active_idx`(`is_active`),
    INDEX `service_areas_type_is_active_idx`(`type`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `restaurant_service_areas` (
    `restaurant_id` INTEGER NOT NULL,
    `service_area_id` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` TIMESTAMP(6) NULL,

    INDEX `restaurant_service_areas_service_area_id_restaurant_id_idx`(`service_area_id`, `restaurant_id`),
    UNIQUE INDEX `restaurant_service_areas_restaurant_id_service_area_id_key`(`restaurant_id`, `service_area_id`),
    PRIMARY KEY (`restaurant_id`, `service_area_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `restaurant_configs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `restaurant_id` INTEGER NOT NULL,
    `auto_accept_orders` BOOLEAN NOT NULL DEFAULT false,
    `max_delivery_radius` DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
    `min_order_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `delivery_time_estimate_minutes` INTEGER NOT NULL DEFAULT 30,
    `is_open` BOOLEAN NOT NULL DEFAULT true,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    UNIQUE INDEX `restaurant_configs_restaurant_id_key`(`restaurant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `restaurant_schedules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `restaurant_id` INTEGER NOT NULL,
    `day_of_week` INTEGER NOT NULL,
    `open_time` VARCHAR(8) NOT NULL,
    `close_time` VARCHAR(8) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,

    INDEX `restaurant_schedules_restaurant_id_day_of_week_idx`(`restaurant_id`, `day_of_week`),
    UNIQUE INDEX `restaurant_schedules_restaurant_id_day_of_week_key`(`restaurant_id`, `day_of_week`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `restaurant_metrics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `restaurant_id` INTEGER NOT NULL,
    `total_orders` INTEGER NOT NULL DEFAULT 0,
    `total_revenue` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `avg_order_value` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `customer_rating` DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
    `on_time_delivery_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `last_updated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `restaurant_metrics_restaurant_id_key`(`restaurant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `restaurant_promotions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `restaurant_id` INTEGER NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `max_spots` INTEGER NOT NULL DEFAULT 5,
    `price_paid` DECIMAL(10, 2) NOT NULL,
    `display_priority` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `click_count` INTEGER NOT NULL DEFAULT 0,
    `view_count` INTEGER NOT NULL DEFAULT 0,
    `approved_by` INTEGER NULL,
    `approved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` TIMESTAMP(6) NULL,

    INDEX `restaurant_promotions_restaurant_id_start_date_end_date_idx`(`restaurant_id`, `start_date`, `end_date`),
    INDEX `restaurant_promotions_display_priority_idx`(`display_priority`),
    INDEX `restaurant_promotions_is_active_end_date_idx`(`is_active`, `end_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_inventory_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `change` INTEGER NOT NULL,
    `new_quantity` INTEGER NOT NULL,
    `reason` ENUM('ORDER_SALE', 'MANUAL_ADJUSTMENT', 'RESTOCK', 'TRANSFER', 'SPOILAGE') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `product_inventory_logs_product_id_createdAt_idx`(`product_id`, `createdAt`),
    INDEX `product_inventory_logs_user_id_createdAt_idx`(`user_id`, `createdAt`),
    INDEX `product_inventory_logs_product_id_user_id_createdAt_idx`(`product_id`, `user_id`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `modifier_groups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `restaurant_id` INTEGER NOT NULL,
    `min_selection` INTEGER NOT NULL DEFAULT 1,
    `max_selection` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` TIMESTAMP(6) NULL,

    INDEX `modifier_groups_restaurant_id_fkey`(`restaurant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `modifier_options` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `modifier_group_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` TIMESTAMP(6) NULL,

    INDEX `modifier_options_modifier_group_id_fkey`(`modifier_group_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_modifiers` (
    `productId` INTEGER NOT NULL,
    `modifier_group_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` TIMESTAMP(6) NULL,

    INDEX `product_modifiers_modifier_group_id_productId_idx`(`modifier_group_id`, `productId`),
    PRIMARY KEY (`productId`, `modifier_group_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `addresses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `alias` VARCHAR(50) NOT NULL,
    `street` VARCHAR(255) NOT NULL,
    `exterior_number` VARCHAR(50) NOT NULL,
    `interior_number` VARCHAR(50) NULL,
    `neighborhood` VARCHAR(150) NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `state` VARCHAR(100) NOT NULL,
    `zip_code` VARCHAR(10) NOT NULL,
    `references` TEXT NULL,
    `latitude` DECIMAL(10, 7) NOT NULL,
    `longitude` DECIMAL(10, 7) NOT NULL,
    `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` TIMESTAMP(6) NOT NULL,
    `deleted_at` TIMESTAMP(6) NULL,

    INDEX `addresses_user_id_fkey`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `route_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `order_id` BIGINT NOT NULL,
    `driver_id` INTEGER NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `latitude` DECIMAL(10, 7) NOT NULL,
    `longitude` DECIMAL(10, 7) NOT NULL,
    `eventType` VARCHAR(50) NOT NULL,

    INDEX `route_logs_order_id_timestamp_idx`(`order_id`, `timestamp`),
    INDEX `route_logs_driver_id_timestamp_idx`(`driver_id`, `timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `driver_assignment_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `order_id` BIGINT NOT NULL,
    `driver_id` INTEGER NOT NULL,
    `status` ENUM('OFFERED', 'ACCEPTED', 'REJECTED', 'TIMEOUT', 'CANCELLED') NOT NULL,
    `rejectionReason` ENUM('TOO_FAR', 'BAD_RATING_CUSTOMER', 'BAD_RATING_RESTAURANT', 'BAD_PAYOUT', 'TOO_MUCH_WAITING', 'OTHER', 'NONE') NOT NULL DEFAULT 'NONE',
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `responded_at` DATETIME(3) NULL,
    `responseTimeSeconds` INTEGER NULL,
    `is_auto_assigned` BOOLEAN NOT NULL DEFAULT false,
    `deleted_at` TIMESTAMP(6) NULL,

    INDEX `driver_assignment_logs_order_id_driver_id_assigned_at_idx`(`order_id`, `driver_id`, `assigned_at`),
    INDEX `driver_assignment_logs_status_assigned_at_idx`(`status`, `assigned_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `driver_sessions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `driver_id` INTEGER NOT NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NULL,
    `start_latitude` DECIMAL(10, 7) NULL,
    `start_longitude` DECIMAL(10, 7) NULL,
    `end_latitude` DECIMAL(10, 7) NULL,
    `end_longitude` DECIMAL(10, 7) NULL,
    `orders_completed` INTEGER NOT NULL DEFAULT 0,
    `earnings` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `session_type` ENUM('ACTIVE', 'BREAK', 'OFFLINE', 'MAINTENANCE') NOT NULL DEFAULT 'ACTIVE',
    `avg_response_time_seconds` INTEGER NULL,
    `avg_customer_rating` DECIMAL(3, 2) NULL,
    `on_time_delivery_rate` DECIMAL(5, 2) NULL,
    `deleted_at` TIMESTAMP(6) NULL,

    INDEX `driver_sessions_driver_id_start_time_idx`(`driver_id`, `start_time`),
    INDEX `driver_sessions_start_time_idx`(`start_time`),
    INDEX `driver_sessions_session_type_start_time_idx`(`session_type`, `start_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity` ENUM('USER', 'RESTAURANT', 'ORDER', 'TRANSACTION', 'DRIVER', 'CONFIG', 'COMPLAINT', 'RATING', 'MESSAGE', 'PROMOTION', 'SERVICE_AREA', 'INVENTORY_LOG', 'DRIVER_LOG', 'NOTIFICATION', 'RESTAURANT_CONFIG', 'RESTAURANT_SCHEDULE', 'ROUTE_LOG') NOT NULL,
    `entityId` BIGINT NULL,
    `details` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_userId_idx`(`userId`),
    INDEX `audit_logs_entity_idx`(`entity`),
    INDEX `audit_logs_entity_entityId_idx`(`entity`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `complaints` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `restaurant_id` INTEGER NULL,
    `driver_id` INTEGER NULL,
    `order_id` BIGINT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('pending', 'resolved', 'closed') NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deleted_at` TIMESTAMP(6) NULL,

    INDEX `complaints_status_idx`(`status`),
    INDEX `complaints_order_id_idx`(`order_id`),
    INDEX `complaints_restaurant_id_idx`(`restaurant_id`),
    INDEX `complaints_driver_id_idx`(`driver_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ratings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` BIGINT NOT NULL,
    `restaurant_id` INTEGER NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `driver_id` INTEGER NULL,
    `restaurantScore` SMALLINT NULL,
    `driverScore` SMALLINT NULL,
    `comment` TEXT NULL,
    `is_reported` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deleted_at` TIMESTAMP(6) NULL,

    UNIQUE INDEX `ratings_order_id_key`(`order_id`),
    INDEX `ratings_restaurant_id_idx`(`restaurant_id`),
    INDEX `ratings_driver_id_idx`(`driver_id`),
    INDEX `ratings_is_reported_idx`(`is_reported`),
    INDEX `ratings_restaurant_id_createdAt_idx`(`restaurant_id`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sender_id` INTEGER NOT NULL,
    `recipient_id` INTEGER NULL,
    `restaurant_id` INTEGER NULL,
    `subject` VARCHAR(150) NOT NULL,
    `body` TEXT NOT NULL,
    `type` ENUM('system', 'restaurant', 'driver', 'customer') NOT NULL DEFAULT 'system',
    `is_global` BOOLEAN NOT NULL DEFAULT false,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deleted_at` TIMESTAMP(6) NULL,

    INDEX `admin_messages_is_global_idx`(`is_global`),
    INDEX `admin_messages_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `type` ENUM('ORDER_UPDATE', 'PROMOTION', 'SYSTEM_ALERT', 'DRIVER_PAYOUT', 'RESTAURANT_PAYOUT', 'DRIVER_ASSIGNMENT', 'RESTAURANT_UPDATE') NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_user_id_isRead_idx`(`user_id`, `isRead`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `cart_item_modifiers_cart_item_id_modifier_option_id_idx` ON `cart_item_modifiers`(`cart_item_id`, `modifier_option_id`);

-- CreateIndex
CREATE INDEX `driver_profiles_status_idx` ON `driver_profiles`(`status`);

-- CreateIndex
CREATE INDEX `driver_profiles_kyc_status_idx` ON `driver_profiles`(`kyc_status`);

-- CreateIndex
CREATE INDEX `driver_profiles_created_at_idx` ON `driver_profiles`(`created_at`);

-- CreateIndex
CREATE INDEX `driver_wallet_transactions_is_paid_out_idx` ON `driver_wallet_transactions`(`is_paid_out`);

-- CreateIndex
CREATE INDEX `order_item_modifiers_order_item_id_modifier_option_id_idx` ON `order_item_modifiers`(`order_item_id`, `modifier_option_id`);

-- CreateIndex
CREATE INDEX `orders_restaurant_id_fkey` ON `orders`(`restaurant_id`);

-- CreateIndex
CREATE INDEX `orders_status_created_at_idx` ON `orders`(`status`, `created_at`);

-- CreateIndex
CREATE INDEX `permissions_created_at_idx` ON `permissions`(`created_at`);

-- CreateIndex
CREATE INDEX `products_is_flagged_idx` ON `products`(`is_flagged`);

-- CreateIndex
CREATE INDEX `products_restaurant_id_created_at_idx` ON `products`(`restaurant_id`, `created_at`);

-- CreateIndex
CREATE UNIQUE INDEX `products_restaurant_id_subcategory_id_name_key` ON `products`(`restaurant_id`, `subcategory_id`, `name`);

-- CreateIndex
CREATE INDEX `restaurant_wallet_transactions_is_paid_out_idx` ON `restaurant_wallet_transactions`(`is_paid_out`);

-- CreateIndex
CREATE UNIQUE INDEX `restaurants_owner_id_key` ON `restaurants`(`owner_id`);

-- CreateIndex
CREATE INDEX `restaurants_status_idx` ON `restaurants`(`status`);

-- CreateIndex
CREATE INDEX `restaurants_created_at_idx` ON `restaurants`(`created_at`);

-- CreateIndex
CREATE INDEX `restaurants_status_created_at_idx` ON `restaurants`(`status`, `created_at`);

-- CreateIndex
CREATE INDEX `roles_created_at_idx` ON `roles`(`created_at`);

-- CreateIndex
CREATE INDEX `subcategories_is_active_idx` ON `subcategories`(`is_active`);

-- CreateIndex
CREATE INDEX `user_role_assignments_restaurant_role_idx` ON `user_role_assignments`(`restaurant_id`, `role_id`);

-- CreateIndex
CREATE INDEX `users_status_idx` ON `users`(`status`);

-- CreateIndex
CREATE INDEX `users_created_at_idx` ON `users`(`created_at`);

-- CreateIndex
CREATE INDEX `users_is_suspicious_idx` ON `users`(`is_suspicious`);

-- AddForeignKey
ALTER TABLE `restaurant_service_areas` ADD CONSTRAINT `restaurant_service_areas_restaurant_id_fkey` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `restaurant_service_areas` ADD CONSTRAINT `restaurant_service_areas_service_area_id_fkey` FOREIGN KEY (`service_area_id`) REFERENCES `service_areas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_has_permissions` ADD CONSTRAINT `role_has_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_has_permissions` ADD CONSTRAINT `role_has_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role_assignments` ADD CONSTRAINT `user_role_assignments_restaurant_id_fkey` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role_assignments` ADD CONSTRAINT `user_role_assignments_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role_assignments` ADD CONSTRAINT `user_role_assignments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `restaurant_configs` ADD CONSTRAINT `restaurant_configs_restaurant_id_fkey` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `restaurant_schedules` ADD CONSTRAINT `restaurant_schedules_restaurant_id_fkey` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `restaurant_metrics` ADD CONSTRAINT `restaurant_metrics_restaurant_id_fkey` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `restaurant_promotions` ADD CONSTRAINT `restaurant_promotions_restaurant_id_fkey` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `restaurant_promotions` ADD CONSTRAINT `restaurant_promotions_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subcategories` ADD CONSTRAINT `subcategories_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subcategories` ADD CONSTRAINT `subcategories_restaurant_id_fkey` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_restaurant_id_fkey` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_subcategory_id_fkey` FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_inventory_logs` ADD CONSTRAINT `product_inventory_logs_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_inventory_logs` ADD CONSTRAINT `product_inventory_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `modifier_groups` ADD CONSTRAINT `modifier_groups_restaurant_id_fkey` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `modifier_options` ADD CONSTRAINT `modifier_options_modifier_group_id_fkey` FOREIGN KEY (`modifier_group_id`) REFERENCES `modifier_groups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_modifiers` ADD CONSTRAINT `product_modifiers_modifier_group_id_fkey` FOREIGN KEY (`modifier_group_id`) REFERENCES `modifier_groups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_modifiers` ADD CONSTRAINT `product_modifiers_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `carts` ADD CONSTRAINT `carts_restaurant_id_fkey` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `carts` ADD CONSTRAINT `carts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_cart_id_fkey` FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cart_item_modifiers` ADD CONSTRAINT `cart_item_modifiers_cart_item_id_fkey` FOREIGN KEY (`cart_item_id`) REFERENCES `cart_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cart_item_modifiers` ADD CONSTRAINT `cart_item_modifiers_modifier_option_id_fkey` FOREIGN KEY (`modifier_option_id`) REFERENCES `modifier_options`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `addresses` ADD CONSTRAINT `addresses_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_address_id_fkey` FOREIGN KEY (`address_id`) REFERENCES `addresses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_restaurant_id_fkey` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_item_modifiers` ADD CONSTRAINT `order_item_modifiers_modifier_option_id_fkey` FOREIGN KEY (`modifier_option_id`) REFERENCES `modifier_options`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `driver_profiles` ADD CONSTRAINT `driver_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `route_logs` ADD CONSTRAINT `route_logs_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `route_logs` ADD CONSTRAINT `route_logs_driver_id_fkey` FOREIGN KEY (`driver_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `restaurant_wallets` ADD CONSTRAINT `restaurant_wallets_restaurant_id_fkey` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `driver_assignment_logs` ADD CONSTRAINT `driver_assignment_logs_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `driver_assignment_logs` ADD CONSTRAINT `driver_assignment_logs_driver_id_fkey` FOREIGN KEY (`driver_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `driver_sessions` ADD CONSTRAINT `driver_sessions_driver_id_fkey` FOREIGN KEY (`driver_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `driver_wallets` ADD CONSTRAINT `driver_wallets_driver_id_fkey` FOREIGN KEY (`driver_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaints` ADD CONSTRAINT `complaints_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaints` ADD CONSTRAINT `complaints_restaurant_id_fkey` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaints` ADD CONSTRAINT `complaints_driver_id_fkey` FOREIGN KEY (`driver_id`) REFERENCES `driver_profiles`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ratings` ADD CONSTRAINT `ratings_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ratings` ADD CONSTRAINT `ratings_restaurant_id_fkey` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_messages` ADD CONSTRAINT `admin_messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_messages` ADD CONSTRAINT `admin_messages_recipient_id_fkey` FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_messages` ADD CONSTRAINT `admin_messages_restaurant_id_fkey` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
