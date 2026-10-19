-- Registros históricos foram criados exclusivamente no Sandbox.
-- Alteração aditiva: preserva os vínculos, índices, grants e políticas RLS existentes.
ALTER TABLE "assinaturas" ADD COLUMN "ambiente" TEXT NOT NULL DEFAULT 'test';
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_ambiente_check"
  CHECK ("ambiente" IN ('test', 'live'));
