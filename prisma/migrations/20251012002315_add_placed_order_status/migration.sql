-- AlterTable
ALTER TABLE `orders` MODIFY `status` ENUM('pending', 'placed', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending';
