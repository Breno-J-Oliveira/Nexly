-- A mesma tentativa de compra preserva a promoção autorizada em seus retries.
ALTER TABLE "assinaturas" ADD COLUMN "checkout_promocao_id" TEXT;
