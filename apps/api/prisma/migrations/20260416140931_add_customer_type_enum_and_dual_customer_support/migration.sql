-- DropForeignKey
ALTER TABLE `installments` DROP FOREIGN KEY `installments_sale_id_fkey`;

-- AlterTable
ALTER TABLE `customers` ADD COLUMN `type` ENUM('personal', 'individual', 'finance') NOT NULL DEFAULT 'personal';

-- AlterTable
ALTER TABLE `sales` ADD COLUMN `buyer_customer_id` VARCHAR(36) NULL,
    ADD COLUMN `invoice_customer_id` VARCHAR(36) NULL;

-- CreateIndex
CREATE INDEX `sales_invoice_customer_id_idx` ON `sales`(`invoice_customer_id`);

-- CreateIndex
CREATE INDEX `sales_buyer_customer_id_idx` ON `sales`(`buyer_customer_id`);

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_invoice_customer_id_fkey` FOREIGN KEY (`invoice_customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_buyer_customer_id_fkey` FOREIGN KEY (`buyer_customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `installments` ADD CONSTRAINT `installments_sale_id_fkey` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
