-- AlterTable
ALTER TABLE "empresas"
ADD COLUMN "lembretes_ativos" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "template_lembrete" TEXT;
