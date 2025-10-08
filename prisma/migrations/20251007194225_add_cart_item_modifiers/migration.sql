-- CreateTable
CREATE TABLE `cart_item_modifiers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cart_item_id` INTEGER NOT NULL,
    `modifier_option_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cart_item_modifiers` ADD CONSTRAINT `cart_item_modifiers_cart_item_id_fkey` FOREIGN KEY (`cart_item_id`) REFERENCES `cart_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cart_item_modifiers` ADD CONSTRAINT `cart_item_modifiers_modifier_option_id_fkey` FOREIGN KEY (`modifier_option_id`) REFERENCES `ModifierOption`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
