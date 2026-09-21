-- CreateTable
CREATE TABLE "termos_aceite" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "versao" TEXT NOT NULL,
    "ip" TEXT,
    "aceito_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "termos_aceite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exclusoes_conta" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "solicitada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executar_em" TIMESTAMP(3) NOT NULL,
    "executada" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "exclusoes_conta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "termos_aceite_usuario_id_idx" ON "termos_aceite"("usuario_id");

-- CreateIndex
CREATE INDEX "exclusoes_conta_empresa_id_idx" ON "exclusoes_conta"("empresa_id");

-- AddForeignKey
ALTER TABLE "termos_aceite" ADD CONSTRAINT "termos_aceite_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exclusoes_conta" ADD CONSTRAINT "exclusoes_conta_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
