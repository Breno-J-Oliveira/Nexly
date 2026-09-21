-- AlterTable
ALTER TABLE "vendas" ADD COLUMN "cupom_id" TEXT;

-- CreateEnum
CREATE TYPE "TipoCupom" AS ENUM ('PERCENTUAL', 'FIXO');

-- CreateTable
CREATE TABLE "cupons" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" "TipoCupom" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "uso_maximo" INTEGER,
    "uso_atual" INTEGER NOT NULL DEFAULT 0,
    "validade" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cupons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cupons_empresa_id_codigo_key" ON "cupons"("empresa_id", "codigo");

-- CreateIndex
CREATE INDEX "cupons_empresa_id_idx" ON "cupons"("empresa_id");

-- AddForeignKey
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_cupom_id_fkey" FOREIGN KEY ("cupom_id") REFERENCES "cupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cupons" ADD CONSTRAINT "cupons_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
