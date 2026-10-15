-- O atendimento e suas baixas/pendências são confirmados na mesma transação.
ALTER TABLE "public"."agendamentos" ADD COLUMN "pendencias_estoque" JSONB NOT NULL DEFAULT '[]'::JSONB;
