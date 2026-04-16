-- CreateTable
CREATE TABLE `user_permissions` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `page` ENUM('dashboard', 'inventory', 'receiving', 'sales', 'customers', 'finance', 'payments', 'settings') NOT NULL,
    `can_view` BOOLEAN NOT NULL DEFAULT false,
    `can_create` BOOLEAN NOT NULL DEFAULT false,
    `can_edit` BOOLEAN NOT NULL DEFAULT false,
    `can_delete` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `user_permissions_user_id_idx`(`user_id`),
    UNIQUE INDEX `user_permissions_user_id_page_key`(`user_id`, `page`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
