-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('RASCUNHO', 'ENVIADO', 'RECEBIDO', 'CANCELADO');

-- CreateTable
CREATE TABLE "fornecedores" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos_compra" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "fornecedor_id" TEXT,
    "status" "StatusPedido" NOT NULL DEFAULT 'RASCUNHO',
    "observacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_pedido_compra" (
    "id" TEXT NOT NULL,
    "pedido_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "preco_esperado" DECIMAL(10,2),

    CONSTRAINT "itens_pedido_compra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fornecedores_empresa_id_idx" ON "fornecedores"("empresa_id");

-- CreateIndex
CREATE INDEX "pedidos_compra_empresa_id_status_idx" ON "pedidos_compra"("empresa_id", "status");

-- CreateIndex
CREATE INDEX "itens_pedido_compra_pedido_id_idx" ON "itens_pedido_compra"("pedido_id");

-- AddForeignKey
ALTER TABLE "fornecedores" ADD CONSTRAINT "fornecedores_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_compra" ADD CONSTRAINT "pedidos_compra_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_compra" ADD CONSTRAINT "pedidos_compra_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_pedido_compra" ADD CONSTRAINT "itens_pedido_compra_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_pedido_compra" ADD CONSTRAINT "itens_pedido_compra_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
