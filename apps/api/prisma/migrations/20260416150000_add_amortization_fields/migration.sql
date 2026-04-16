-- AlterTable installments — add amortization breakdown fields for Declining Balance method
ALTER TABLE `installments`
  ADD COLUMN `principal_portion` DECIMAL(12, 2) NULL,
  ADD COLUMN `interest_portion` DECIMAL(12, 2) NULL,
  ADD COLUMN `remaining_balance` DECIMAL(12, 2) NULL;
