-- Horários de atendimento não dependem do fuso do servidor ou do visitante.
ALTER TABLE "public"."empresas" ADD COLUMN "fuso_horario" TEXT NOT NULL DEFAULT 'America/Sao_Paulo';
