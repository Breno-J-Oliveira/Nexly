ALTER TABLE "empresas" ADD COLUMN "preset" TEXT,
ADD COLUMN "modulos" TEXT[] NOT NULL DEFAULT ARRAY['agenda','clientes','profissionais','servicos','estoque','pdv','vendas','relatorios','comissao','fidelidade']::TEXT[];
ALTER TABLE "usuarios" ADD COLUMN "dias_de_uso" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "ultimo_dia_uso" TEXT,
ADD COLUMN "lembrar_avaliacao_em" TIMESTAMP(3),
ADD COLUMN "nao_pedir_avaliacao" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "depoimentos" (
  "id" TEXT NOT NULL,
  "empresa_id" TEXT NOT NULL,
  "usuario_id" TEXT NOT NULL,
  "nota" INTEGER NOT NULL CHECK ("nota" BETWEEN 1 AND 5),
  "texto" TEXT NOT NULL,
  "nome_publico" TEXT NOT NULL,
  "ocupacao" TEXT NOT NULL,
  "autoriza_publicacao" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'PENDENTE' CHECK ("status" IN ('PENDENTE','APROVADO','REJEITADO')),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "depoimentos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "depoimentos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "depoimentos_usuario_id_key" ON "depoimentos"("usuario_id");
CREATE INDEX "depoimentos_empresa_id_idx" ON "depoimentos"("empresa_id");
CREATE INDEX "depoimentos_status_autoriza_publicacao_created_at_idx" ON "depoimentos"("status", "autoriza_publicacao", "created_at");
