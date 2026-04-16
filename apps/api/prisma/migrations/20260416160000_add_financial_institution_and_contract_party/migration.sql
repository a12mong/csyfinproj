-- CreateTable financial_institutions
CREATE TABLE `financial_institutions` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `contact_info` TEXT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `financial_institutions_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable contract_parties
CREATE TABLE `contract_parties` (
    `id` VARCHAR(36) NOT NULL,
    `contract_id` VARCHAR(36) NOT NULL,
    `role` ENUM('owner', 'buyer', 'seller') NOT NULL,
    `party_name` VARCHAR(255) NOT NULL,
    `party_ref_id` VARCHAR(36) NULL,
    `party_ref_type` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `contract_parties_contract_id_idx`(`contract_id`),
    INDEX `contract_parties_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable sales — add financial_institution_id
ALTER TABLE `sales` ADD COLUMN `financial_institution_id` VARCHAR(36) NULL;
CREATE INDEX `sales_financial_institution_id_idx` ON `sales`(`financial_institution_id`);

-- AlterTable contracts — add financial_institution_id
ALTER TABLE `contracts` ADD COLUMN `financial_institution_id` VARCHAR(36) NULL;
CREATE INDEX `contracts_financial_institution_id_idx` ON `contracts`(`financial_institution_id`);

-- AddForeignKey contract_parties -> contracts
ALTER TABLE `contract_parties` ADD CONSTRAINT `contract_parties_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey sales -> financial_institutions
ALTER TABLE `sales` ADD CONSTRAINT `sales_financial_institution_id_fkey` FOREIGN KEY (`financial_institution_id`) REFERENCES `financial_institutions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey contracts -> financial_institutions
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_financial_institution_id_fkey` FOREIGN KEY (`financial_institution_id`) REFERENCES `financial_institutions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
