-- CreateIndex
CREATE INDEX "clientes_empresa_id_nome_idx" ON "clientes"("empresa_id", "nome");

-- CreateIndex
CREATE INDEX "clientes_empresa_id_created_at_idx" ON "clientes"("empresa_id", "created_at");

-- CreateIndex
CREATE INDEX "agendamentos_empresa_id_status_data_hora_idx" ON "agendamentos"("empresa_id", "status", "data_hora");

-- CreateIndex
CREATE INDEX "agendamentos_empresa_id_profissional_id_data_hora_idx" ON "agendamentos"("empresa_id", "profissional_id", "data_hora");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_empresa_id_created_at_idx" ON "movimentacoes_estoque"("empresa_id", "created_at");

-- CreateIndex
CREATE INDEX "vendas_empresa_id_cliente_id_idx" ON "vendas"("empresa_id", "cliente_id");
