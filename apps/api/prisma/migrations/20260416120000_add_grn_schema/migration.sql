-- AlterTable: add active field to users
ALTER TABLE `users` ADD COLUMN `active` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: expand payment_method enum with finance_company and add finance fields to sales
ALTER TABLE `sales` MODIFY `payment_method` ENUM('cash', 'installment', 'finance_company') NOT NULL;
ALTER TABLE `sales` ADD COLUMN `finance_company_name` VARCHAR(255) NULL;
ALTER TABLE `sales` ADD COLUMN `finance_reference_number` VARCHAR(100) NULL;

-- AlterTable: add payment_channel and line_message_id to payments
ALTER TABLE `payments` ADD COLUMN `payment_channel` ENUM('cash', 'bank_transfer', 'line') NOT NULL DEFAULT 'cash';
ALTER TABLE `payments` ADD COLUMN `line_message_id` VARCHAR(255) NULL;

-- AlterTable: add delivery_note_item_id FK to motorcycles
ALTER TABLE `motorcycles` ADD COLUMN `delivery_note_item_id` VARCHAR(36) NULL;

-- CreateTable: delivery_notes
CREATE TABLE `delivery_notes` (
    `id` VARCHAR(36) NOT NULL,
    `note_number` VARCHAR(50) NOT NULL,
    `supplier_name` VARCHAR(255) NOT NULL,
    `received_date` DATE NOT NULL,
    `received_by_user_id` VARCHAR(36) NOT NULL,
    `notes` TEXT NULL,
    `status` ENUM('pending', 'verified', 'cancelled') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `delivery_notes_note_number_key`(`note_number`),
    INDEX `delivery_notes_status_idx`(`status`),
    INDEX `delivery_notes_received_date_idx`(`received_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: delivery_note_items
CREATE TABLE `delivery_note_items` (
    `id` VARCHAR(36) NOT NULL,
    `delivery_note_id` VARCHAR(36) NOT NULL,
    `item_type` ENUM('motorcycle', 'part', 'accessory') NOT NULL,
    `description` VARCHAR(500) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unit_cost` DECIMAL(12, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `delivery_note_items_delivery_note_id_idx`(`delivery_note_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `delivery_notes` ADD CONSTRAINT `delivery_notes_received_by_user_id_fkey`
    FOREIGN KEY (`received_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_note_items` ADD CONSTRAINT `delivery_note_items_delivery_note_id_fkey`
    FOREIGN KEY (`delivery_note_id`) REFERENCES `delivery_notes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `motorcycles` ADD CONSTRAINT `motorcycles_delivery_note_item_id_fkey`
    FOREIGN KEY (`delivery_note_item_id`) REFERENCES `delivery_note_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
