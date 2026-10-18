BEGIN;
ALTER TABLE "baixas_financeiras" ADD COLUMN "estornada_em" TIMESTAMP(3);
UPDATE "baixas_financeiras" SET "estornada_em" = "data" WHERE "estornada" = true;
CREATE INDEX "baixas_financeiras_estornada_em_idx" ON "baixas_financeiras" ("estornada_em");
COMMIT;
