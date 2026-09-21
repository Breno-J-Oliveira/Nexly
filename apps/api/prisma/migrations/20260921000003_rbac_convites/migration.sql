-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'GESTOR';
ALTER TYPE "Role" ADD VALUE 'RECEPCIONISTA';

-- CreateTable
CREATE TABLE "convites_usuario" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "convites_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "convites_usuario_token_key" ON "convites_usuario"("token");

-- CreateIndex
CREATE INDEX "convites_usuario_empresa_id_idx" ON "convites_usuario"("empresa_id");

-- AddForeignKey
ALTER TABLE "convites_usuario" ADD CONSTRAINT "convites_usuario_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
