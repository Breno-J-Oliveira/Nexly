-- Desafios de login e passos TOTP de uso único, sem guardar tokens em texto puro.
ALTER TABLE "public"."usuarios"
  ADD COLUMN "two_factor_challenge_hash" TEXT,
  ADD COLUMN "two_factor_challenge_expires_at" TIMESTAMP(3),
  ADD COLUMN "two_factor_last_used_step" INTEGER;
