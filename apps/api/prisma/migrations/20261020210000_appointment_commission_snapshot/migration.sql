-- Valores futuros são preservados na conclusão; o histórico desconhecido permanece NULL.
ALTER TABLE "agendamentos"
  ADD COLUMN "valor_servico_concluido" DECIMAL(10,2),
  ADD COLUMN "comissao_percentual_aplicada" DECIMAL(5,2);
