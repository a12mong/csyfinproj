-- CreateTable contracts
CREATE TABLE `contracts` (
    `id` VARCHAR(36) NOT NULL,
    `contract_number` VARCHAR(50) NOT NULL,
    `customer_id` VARCHAR(36) NOT NULL,
    `total_principal` DECIMAL(12, 2) NOT NULL,
    `total_interest` DECIMAL(12, 2) NOT NULL,
    `total_amount` DECIMAL(12, 2) NOT NULL,
    `num_installments` INTEGER NOT NULL,
    `interest_rate` DECIMAL(5, 2) NOT NULL,
    `start_date` DATE NOT NULL,
    `status` ENUM('active', 'completed', 'defaulted', 'cancelled') NOT NULL DEFAULT 'active',
    `notes` TEXT NULL,
    `created_by_user_id` VARCHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `contracts_contract_number_key`(`contract_number`),
    INDEX `contracts_customer_id_idx`(`customer_id`),
    INDEX `contracts_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable contract_sales
CREATE TABLE `contract_sales` (
    `id` VARCHAR(36) NOT NULL,
    `contract_id` VARCHAR(36) NOT NULL,
    `sale_id` VARCHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `contract_sales_contract_id_sale_id_key`(`contract_id`, `sale_id`),
    INDEX `contract_sales_contract_id_idx`(`contract_id`),
    INDEX `contract_sales_sale_id_idx`(`sale_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable installments — make sale_id nullable, add contract_id
ALTER TABLE `installments` MODIFY `sale_id` VARCHAR(36) NULL;
ALTER TABLE `installments` ADD COLUMN `contract_id` VARCHAR(36) NULL;
CREATE INDEX `installments_contract_id_idx` ON `installments`(`contract_id`);

-- AlterTable payments — make installment_id nullable, add contract_id
ALTER TABLE `payments` DROP FOREIGN KEY `payments_installment_id_fkey`;
ALTER TABLE `payments` MODIFY `installment_id` VARCHAR(36) NULL;
ALTER TABLE `payments` ADD COLUMN `contract_id` VARCHAR(36) NULL;
CREATE INDEX `payments_contract_id_idx` ON `payments`(`contract_id`);

-- AddForeignKey contracts -> customers
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey contracts -> users
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey contract_sales -> contracts
ALTER TABLE `contract_sales` ADD CONSTRAINT `contract_sales_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey contract_sales -> sales
ALTER TABLE `contract_sales` ADD CONSTRAINT `contract_sales_sale_id_fkey` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Re-add payments -> installments FK as nullable
ALTER TABLE `payments` ADD CONSTRAINT `payments_installment_id_fkey` FOREIGN KEY (`installment_id`) REFERENCES `installments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey payments -> contracts
ALTER TABLE `payments` ADD CONSTRAINT `payments_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey installments -> contracts
ALTER TABLE `installments` ADD CONSTRAINT `installments_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
