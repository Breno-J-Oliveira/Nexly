ALTER TABLE "sessoes"
  ADD COLUMN "last_rotation_token_id" TEXT,
  ADD COLUMN "last_rotation_at" TIMESTAMP(3);
