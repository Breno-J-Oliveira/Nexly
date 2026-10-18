BEGIN;
ALTER TABLE "vendas" ADD COLUMN "chave_operacao" TEXT, ADD COLUMN "requisicao_hash" TEXT;
CREATE UNIQUE INDEX "vendas_empresa_id_chave_operacao_key" ON "vendas"("empresa_id", "chave_operacao");
COMMIT;
