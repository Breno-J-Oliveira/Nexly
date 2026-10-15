-- AlterTable
ALTER TABLE "agendamentos" ADD COLUMN     "recorrencia_id" TEXT;

-- CreateTable
CREATE TABLE "filiais" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "telefone" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "filiais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarefas" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "prioridade" TEXT NOT NULL DEFAULT 'NORMAL',
    "prazo" TIMESTAMP(3),
    "responsavel_id" TEXT,
    "filial_id" TEXT,
    "automacao_id" TEXT,
    "ocorrencia" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tarefas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'GERAL',
    "versao" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campanhas" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campanhas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consentimentos_marketing" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "autorizado" BOOLEAN NOT NULL,
    "evidencia" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consentimentos_marketing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automacoes" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "intervalo_dias" INTEGER NOT NULL,
    "proxima_execucao" TIMESTAMP(3) NOT NULL,
    "ultima_execucao" TIMESTAMP(3),
    "responsavel_id" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recorrencias" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "intervalo_dias" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "cancelada" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recorrencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "filiais_empresa_id_nome_idx" ON "filiais"("empresa_id", "nome");

-- CreateIndex
CREATE INDEX "tarefas_empresa_id_status_prazo_idx" ON "tarefas"("empresa_id", "status", "prazo");

-- CreateIndex
CREATE UNIQUE INDEX "tarefas_automacao_id_ocorrencia_key" ON "tarefas"("automacao_id", "ocorrencia");

-- CreateIndex
CREATE INDEX "documentos_empresa_id_updated_at_idx" ON "documentos"("empresa_id", "updated_at");

-- CreateIndex
CREATE INDEX "campanhas_empresa_id_created_at_idx" ON "campanhas"("empresa_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "consentimentos_marketing_empresa_id_cliente_id_key" ON "consentimentos_marketing"("empresa_id", "cliente_id");

-- CreateIndex
CREATE INDEX "automacoes_ativa_proxima_execucao_idx" ON "automacoes"("ativa", "proxima_execucao");

-- CreateIndex
CREATE INDEX "automacoes_empresa_id_idx" ON "automacoes"("empresa_id");

-- CreateIndex
CREATE INDEX "recorrencias_empresa_id_inicio_idx" ON "recorrencias"("empresa_id", "inicio");

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_recorrencia_id_fkey" FOREIGN KEY ("recorrencia_id") REFERENCES "recorrencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "filiais" ADD CONSTRAINT "filiais_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_filial_id_fkey" FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_automacao_id_fkey" FOREIGN KEY ("automacao_id") REFERENCES "automacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campanhas" ADD CONSTRAINT "campanhas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consentimentos_marketing" ADD CONSTRAINT "consentimentos_marketing_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automacoes" ADD CONSTRAINT "automacoes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recorrencias" ADD CONSTRAINT "recorrencias_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

