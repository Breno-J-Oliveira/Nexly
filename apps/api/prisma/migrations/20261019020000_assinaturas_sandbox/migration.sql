-- CreateTable
CREATE TABLE "assinaturas" (
    "empresa_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "subscription_id" TEXT,
    "plano" "Plano" NOT NULL DEFAULT 'FREE',
    "status" TEXT NOT NULL DEFAULT 'none',
    "periodo_fim" TIMESTAMP(3),
    "cancelar_em" TIMESTAMP(3),
    "checkout_id" TEXT,
    "checkout_plano" "Plano",
    "checkout_chave" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assinaturas_pkey" PRIMARY KEY ("empresa_id")
);

-- CreateTable
CREATE TABLE "eventos_stripe" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_stripe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assinaturas_customer_id_key" ON "assinaturas"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "assinaturas_subscription_id_key" ON "assinaturas"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "assinaturas_checkout_id_key" ON "assinaturas"("checkout_id");

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Dados de cobrança só passam pela API autenticada / webhook verificado.
ALTER TABLE "assinaturas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "assinaturas"
  USING (empresa_id = NULLIF(current_setting('app.current_tenant', true), ''))
  WITH CHECK (empresa_id = NULLIF(current_setting('app.current_tenant', true), ''));
ALTER TABLE "eventos_stripe" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "assinaturas", "eventos_stripe" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON "assinaturas", "eventos_stripe" FROM authenticated;
  END IF;
END $$;

