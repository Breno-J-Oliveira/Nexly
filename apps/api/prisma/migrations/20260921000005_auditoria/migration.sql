-- CreateEnum
CREATE TYPE "AuditAcao" AS ENUM ('CRIAR', 'EDITAR', 'EXCLUIR', 'LOGIN', 'LOGOUT');

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "acao" "AuditAcao" NOT NULL,
    "recurso" TEXT NOT NULL,
    "recurso_id" TEXT,
    "dados_antigos" JSONB,
    "dados_novos" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_empresa_id_criado_em_idx" ON "audit_logs"("empresa_id", "criado_em");

-- CreateIndex
CREATE INDEX "audit_logs_empresa_id_acao_idx" ON "audit_logs"("empresa_id", "acao");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
