-- AlterTable
ALTER TABLE "usuarios"
ADD COLUMN "two_factor_secret" TEXT,
ADD COLUMN "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "two_factor_backup_codes" TEXT[];
