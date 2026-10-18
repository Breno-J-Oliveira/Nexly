BEGIN;
-- AlterTable
ALTER TABLE "empresas" ADD COLUMN     "preferencias" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "primeiro_acesso_dispensado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "produtos" ADD COLUMN     "custo_atual" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "movimentacoes_estoque" ADD COLUMN     "filial_id" TEXT;

-- AlterTable
ALTER TABLE "vendas" ADD COLUMN     "estornada_em" TIMESTAMP(3),
ADD COLUMN     "estornada_por" TEXT,
ADD COLUMN     "filial_id" TEXT,
ADD COLUMN     "motivo_estorno" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'CONCLUIDA';

-- AlterTable
ALTER TABLE "itens_venda" ADD COLUMN     "custo_unitario" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "lancamentos_financeiros" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "filial_id" TEXT,
    "venda_id" TEXT,
    "descricao" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'GERAL',
    "valor" DECIMAL(12,2) NOT NULL,
    "valor_pago" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "vencimento" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lancamentos_financeiros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baixas_financeiras" (
    "id" TEXT NOT NULL,
    "lancamento_id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estornada" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "baixas_financeiras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saldos_filiais" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "filial_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "saldos_filiais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs_duraveis" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "executar_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reservado_em" TIMESTAMP(3),
    "reserva" TEXT,
    "erro" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_duraveis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "importacoes" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "resumo" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "importacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comprovacoes_operacionais" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "verificado_em" TIMESTAMP(3) NOT NULL,
    "observacoes" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comprovacoes_operacionais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recuperacoes_senha" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "usado_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recuperacoes_senha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transferencias_filiais" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "origem_id" TEXT,
    "destino_id" TEXT,
    "quantidade" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transferencias_filiais_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lancamentos_financeiros_venda_id_key" ON "lancamentos_financeiros"("venda_id");

-- CreateIndex
CREATE INDEX "lancamentos_financeiros_empresa_id_vencimento_status_idx" ON "lancamentos_financeiros"("empresa_id", "vencimento", "status");

-- CreateIndex
CREATE INDEX "lancamentos_financeiros_empresa_id_filial_id_vencimento_idx" ON "lancamentos_financeiros"("empresa_id", "filial_id", "vencimento");

-- CreateIndex
CREATE UNIQUE INDEX "baixas_financeiras_chave_key" ON "baixas_financeiras"("chave");

-- CreateIndex
CREATE INDEX "baixas_financeiras_lancamento_id_data_idx" ON "baixas_financeiras"("lancamento_id", "data");

-- CreateIndex
CREATE INDEX "saldos_filiais_empresa_id_produto_id_idx" ON "saldos_filiais"("empresa_id", "produto_id");

-- CreateIndex
CREATE UNIQUE INDEX "saldos_filiais_empresa_id_filial_id_produto_id_key" ON "saldos_filiais"("empresa_id", "filial_id", "produto_id");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_duraveis_chave_key" ON "jobs_duraveis"("chave");

-- CreateIndex
CREATE INDEX "jobs_duraveis_status_executar_em_idx" ON "jobs_duraveis"("status", "executar_em");

-- CreateIndex
CREATE INDEX "jobs_duraveis_empresa_id_created_at_idx" ON "jobs_duraveis"("empresa_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "importacoes_empresa_id_chave_key" ON "importacoes"("empresa_id", "chave");

-- CreateIndex
CREATE INDEX "comprovacoes_operacionais_empresa_id_tipo_verificado_em_idx" ON "comprovacoes_operacionais"("empresa_id", "tipo", "verificado_em");

-- CreateIndex
CREATE UNIQUE INDEX "recuperacoes_senha_token_hash_key" ON "recuperacoes_senha"("token_hash");

-- CreateIndex
CREATE INDEX "recuperacoes_senha_usuario_id_expires_at_idx" ON "recuperacoes_senha"("usuario_id", "expires_at");

-- CreateIndex
CREATE INDEX "transferencias_filiais_empresa_id_created_at_idx" ON "transferencias_filiais"("empresa_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "transferencias_filiais_empresa_id_chave_key" ON "transferencias_filiais"("empresa_id", "chave");

-- AddForeignKey
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_filial_id_fkey" FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_filial_id_fkey" FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "vendas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baixas_financeiras" ADD CONSTRAINT "baixas_financeiras_lancamento_id_fkey" FOREIGN KEY ("lancamento_id") REFERENCES "lancamentos_financeiros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saldos_filiais" ADD CONSTRAINT "saldos_filiais_filial_id_fkey" FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saldos_filiais" ADD CONSTRAINT "saldos_filiais_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs_duraveis" ADD CONSTRAINT "jobs_duraveis_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacoes" ADD CONSTRAINT "importacoes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprovacoes_operacionais" ADD CONSTRAINT "comprovacoes_operacionais_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recuperacoes_senha" ADD CONSTRAINT "recuperacoes_senha_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias_filiais" ADD CONSTRAINT "transferencias_filiais_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Isolamento de novos registros, incluindo relações filhas.
ALTER TABLE "lancamentos_financeiros" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "lancamentos_financeiros" USING (empresa_id=NULLIF(current_setting('app.current_tenant',true),'')) WITH CHECK (empresa_id=NULLIF(current_setting('app.current_tenant',true),''));
REVOKE ALL ON TABLE "lancamentos_financeiros" FROM PUBLIC;
ALTER TABLE "saldos_filiais" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "saldos_filiais" USING (empresa_id=NULLIF(current_setting('app.current_tenant',true),'')) WITH CHECK (empresa_id=NULLIF(current_setting('app.current_tenant',true),''));
REVOKE ALL ON TABLE "saldos_filiais" FROM PUBLIC;
ALTER TABLE "jobs_duraveis" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "jobs_duraveis" USING (empresa_id=NULLIF(current_setting('app.current_tenant',true),'')) WITH CHECK (empresa_id=NULLIF(current_setting('app.current_tenant',true),''));
REVOKE ALL ON TABLE "jobs_duraveis" FROM PUBLIC;
ALTER TABLE "importacoes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "importacoes" USING (empresa_id=NULLIF(current_setting('app.current_tenant',true),'')) WITH CHECK (empresa_id=NULLIF(current_setting('app.current_tenant',true),''));
REVOKE ALL ON TABLE "importacoes" FROM PUBLIC;
ALTER TABLE "comprovacoes_operacionais" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "comprovacoes_operacionais" USING (empresa_id=NULLIF(current_setting('app.current_tenant',true),'')) WITH CHECK (empresa_id=NULLIF(current_setting('app.current_tenant',true),''));
REVOKE ALL ON TABLE "comprovacoes_operacionais" FROM PUBLIC;
ALTER TABLE "transferencias_filiais" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "transferencias_filiais" USING (empresa_id=NULLIF(current_setting('app.current_tenant',true),'')) WITH CHECK (empresa_id=NULLIF(current_setting('app.current_tenant',true),''));
REVOKE ALL ON TABLE "transferencias_filiais" FROM PUBLIC;
ALTER TABLE "baixas_financeiras" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "baixas_financeiras" USING (EXISTS (SELECT 1 FROM lancamentos_financeiros l WHERE l.id=lancamento_id AND l.empresa_id=NULLIF(current_setting('app.current_tenant',true),''))) WITH CHECK (EXISTS (SELECT 1 FROM lancamentos_financeiros l WHERE l.id=lancamento_id AND l.empresa_id=NULLIF(current_setting('app.current_tenant',true),'')));
REVOKE ALL ON TABLE "baixas_financeiras" FROM PUBLIC;
ALTER TABLE "recuperacoes_senha" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "recuperacoes_senha" USING (EXISTS (SELECT 1 FROM usuarios u WHERE u.id=usuario_id AND u.empresa_id=NULLIF(current_setting('app.current_tenant',true),''))) WITH CHECK (EXISTS (SELECT 1 FROM usuarios u WHERE u.id=usuario_id AND u.empresa_id=NULLIF(current_setting('app.current_tenant',true),'')));
REVOKE ALL ON TABLE "recuperacoes_senha" FROM PUBLIC;
ALTER TABLE saldos_filiais ADD CONSTRAINT saldo_nao_negativo CHECK (quantidade>=0);
ALTER TABLE lancamentos_financeiros ADD CONSTRAINT valor_conta_valido CHECK (valor>=0 AND valor_pago>=0 AND valor_pago<=valor);
ALTER TABLE baixas_financeiras ADD CONSTRAINT baixa_positiva CHECK (valor>0);
ALTER TABLE transferencias_filiais ADD CONSTRAINT transferencia_positiva CHECK (quantidade>0 AND origem_id IS DISTINCT FROM destino_id);
-- Vendas históricas geram contas em aberto; recebimentos anteriores não são presumidos.
INSERT INTO lancamentos_financeiros (id,empresa_id,venda_id,descricao,tipo,categoria,valor,vencimento)
SELECT gen_random_uuid()::text,v.empresa_id,v.id,'Venda histórica #'||v.id,'RECEITA','VENDAS',v.total,v.created_at FROM vendas v JOIN empresas e ON e.id=v.empresa_id;

COMMIT;
