# Modelo de dados

Inventário gerado de [schema.prisma](../apps/api/prisma/schema.prisma). Prisma descreve modelos (grupos de registros), campos e relações. `?` indica campo opcional e `[]` indica uma coleção relacionada. `id` identifica o registro; relações e chaves ligam registros. Migrações em `apps/api/prisma/migrations` registram a evolução. Valores padrão, índices, constraints e regras completas devem ser consultados no schema.

O PostgreSQL é a persistência principal; Redis não aparece como tabela neste inventário. `empresaId` identifica escopo direto quando presente. Modelos sem esse campo podem ser globais ou vinculados por relações; confira o [escopo da aplicação](../apps/api/src/database/tenant-scope.ts), a autorização e as políticas do banco antes de utilizá-los.

Esta revisão contém **41 modelos** e **7 enumerações**.

## Empresa

Tabela: `empresas`.

| Campo                      | Tipo Prisma                |
| -------------------------- | -------------------------- |
| `assinatura`               | `Assinatura?`              |
| `id`                       | `String`                   |
| `nome`                     | `String`                   |
| `cnpj`                     | `String`                   |
| `plano`                    | `Plano`                    |
| `bookingToken`             | `String?`                  |
| `fusoHorario`              | `String`                   |
| `horarioAbertura`          | `String?`                  |
| `horarioFechamento`        | `String?`                  |
| `diasFuncionamento`        | `String?`                  |
| `telefone`                 | `String?`                  |
| `emailContato`             | `String?`                  |
| `endereco`                 | `String?`                  |
| `descricao`                | `String?`                  |
| `instagram`                | `String?`                  |
| `whatsapp`                 | `String?`                  |
| `segmento`                 | `String?`                  |
| `preset`                   | `String?`                  |
| `modulos`                  | `String[]`                 |
| `cidade`                   | `String?`                  |
| `dadosPagamento`           | `Json?`                    |
| `horarios`                 | `Json?`                    |
| `notificacoes`             | `Json?`                    |
| `lembretesAtivos`          | `Boolean`                  |
| `templateLembrete`         | `String?`                  |
| `preferencias`             | `Json`                     |
| `primeiroAcessoDispensado` | `Boolean`                  |
| `lancamentos`              | `LancamentoFinanceiro[]`   |
| `jobs`                     | `JobDuravel[]`             |
| `importacoes`              | `Importacao[]`             |
| `comprovacoes`             | `ComprovacaoOperacional[]` |
| `transferencias`           | `TransferenciaFilial[]`    |
| `createdAt`                | `DateTime`                 |
| `tarefas`                  | `Tarefa[]`                 |
| `filiais`                  | `Filial[]`                 |
| `documentos`               | `Documento[]`              |
| `campanhas`                | `Campanha[]`               |
| `consentimentosMarketing`  | `ConsentimentoMarketing[]` |
| `automacoes`               | `Automacao[]`              |
| `recorrencias`             | `Recorrencia[]`            |
| `usuarios`                 | `Usuario[]`                |
| `cupons`                   | `Cupom[]`                  |
| `fornecedores`             | `Fornecedor[]`             |
| `pedidosCompra`            | `PedidoCompra[]`           |
| `convites`                 | `ConviteUsuario[]`         |
| `auditLogs`                | `AuditLog[]`               |
| `exclusoesConta`           | `ExclusaoConta[]`          |

## Assinatura

Tabela: `assinaturas`.

| Campo            | Tipo Prisma |
| ---------------- | ----------- |
| `empresaId`      | `String`    |
| `ambiente`       | `String`    |
| `customerId`     | `String?`   |
| `subscriptionId` | `String?`   |
| `plano`          | `Plano`     |
| `status`         | `String`    |
| `periodoFim`     | `DateTime?` |
| `cancelarEm`     | `DateTime?` |
| `checkoutId`     | `String?`   |
| `checkoutPlano`  | `Plano?`    |
| `checkoutChave`  | `String?`   |
| `updatedAt`      | `DateTime`  |
| `empresa`        | `Empresa`   |

## EventoStripe

Tabela: `eventos_stripe`.

| Campo       | Tipo Prisma |
| ----------- | ----------- |
| `id`        | `String`    |
| `tipo`      | `String`    |
| `createdAt` | `DateTime`  |

## Usuario

Tabela: `usuarios`.

| Campo                         | Tipo Prisma          |
| ----------------------------- | -------------------- |
| `recuperacoes`                | `RecuperacaoSenha[]` |
| `id`                          | `String`             |
| `empresaId`                   | `String`             |
| `nome`                        | `String`             |
| `email`                       | `String`             |
| `senhaHash`                   | `String`             |
| `googleSubject`               | `String?`            |
| `role`                        | `Role`               |
| `ativo`                       | `Boolean`            |
| `twoFactorSecret`             | `String?`            |
| `twoFactorEnabled`            | `Boolean`            |
| `twoFactorBackupCodes`        | `String[]`           |
| `twoFactorChallengeHash`      | `String?`            |
| `twoFactorChallengeExpiresAt` | `DateTime?`          |
| `twoFactorLastUsedStep`       | `Int?`               |
| `diasDeUso`                   | `Int`                |
| `ultimoDiaUso`                | `String?`            |
| `lembrarAvaliacaoEm`          | `DateTime?`          |
| `naoPedirAvaliacao`           | `Boolean`            |
| `createdAt`                   | `DateTime`           |
| `empresa`                     | `Empresa`            |
| `refreshTokens`               | `RefreshToken[]`     |
| `sessoes`                     | `AuthSession[]`      |
| `auditLogs`                   | `AuditLog[]`         |
| `termosAceite`                | `TermoAceite[]`      |
| `depoimento`                  | `Depoimento?`        |

## Depoimento

Tabela: `depoimentos`.

| Campo                | Tipo Prisma |
| -------------------- | ----------- |
| `id`                 | `String`    |
| `empresaId`          | `String`    |
| `usuarioId`          | `String`    |
| `nota`               | `Int`       |
| `texto`              | `String`    |
| `nomePublico`        | `String`    |
| `ocupacao`           | `String`    |
| `autorizaPublicacao` | `Boolean`   |
| `status`             | `String`    |
| `createdAt`          | `DateTime`  |
| `updatedAt`          | `DateTime`  |
| `usuario`            | `Usuario`   |

## AuthSession

Tabela: `sessoes`.

| Campo                  | Tipo Prisma      |
| ---------------------- | ---------------- |
| `id`                   | `String`         |
| `usuarioId`            | `String`         |
| `revogado`             | `Boolean`        |
| `lastRotationTokenId`  | `String?`        |
| `lastRotationAt`       | `DateTime?`      |
| `lastRotationResponse` | `String?`        |
| `expiresAt`            | `DateTime`       |
| `createdAt`            | `DateTime`       |
| `usuario`              | `Usuario`        |
| `refreshTokens`        | `RefreshToken[]` |

## RefreshToken

Tabela: `refresh_tokens`.

| Campo       | Tipo Prisma   |
| ----------- | ------------- |
| `id`        | `String`      |
| `sessionId` | `String`      |
| `usuarioId` | `String`      |
| `tokenHash` | `String`      |
| `expiresAt` | `DateTime`    |
| `revogado`  | `Boolean`     |
| `createdAt` | `DateTime`    |
| `sessao`    | `AuthSession` |
| `usuario`   | `Usuario`     |

## Cliente

Tabela: `clientes`.

| Campo              | Tipo Prisma     |
| ------------------ | --------------- |
| `id`               | `String`        |
| `empresaId`        | `String`        |
| `nome`             | `String`        |
| `telefone`         | `String?`       |
| `email`            | `String?`       |
| `ativo`            | `Boolean`       |
| `createdAt`        | `DateTime`      |
| `agendamentos`     | `Agendamento[]` |
| `pontosFidelidade` | `Int`           |
| `totalGasto`       | `Decimal?`      |
| `ultimaVisita`     | `DateTime?`     |
| `tag`              | `String?`       |
| `observacoes`      | `String?`       |
| `vendas`           | `Venda[]`       |

## Profissional

Tabela: `profissionais`.

| Campo                | Tipo Prisma     |
| -------------------- | --------------- |
| `id`                 | `String`        |
| `empresaId`          | `String`        |
| `nome`               | `String`        |
| `especialidade`      | `String?`       |
| `comissaoPercentual` | `Float`         |
| `fotoUrl`            | `String?`       |
| `ativo`              | `Boolean`       |
| `createdAt`          | `DateTime`      |
| `agendamentos`       | `Agendamento[]` |

## Servico

Tabela: `servicos`.

| Campo          | Tipo Prisma       |
| -------------- | ----------------- |
| `id`           | `String`          |
| `empresaId`    | `String`          |
| `nome`         | `String`          |
| `duracaoMin`   | `Int`             |
| `preco`        | `Decimal`         |
| `ativo`        | `Boolean`         |
| `createdAt`    | `DateTime`        |
| `agendamentos` | `Agendamento[]`   |
| `insumos`      | `InsumoServico[]` |

## InsumoServico

Tabela: `insumos_servico`.

| Campo        | Tipo Prisma |
| ------------ | ----------- |
| `id`         | `String`    |
| `servicoId`  | `String`    |
| `produtoId`  | `String`    |
| `quantidade` | `Int`       |
| `servico`    | `Servico`   |
| `produto`    | `Produto`   |

## Agendamento

Tabela: `agendamentos`.

| Campo                        | Tipo Prisma         |
| ---------------------------- | ------------------- |
| `id`                         | `String`            |
| `empresaId`                  | `String`            |
| `clienteId`                  | `String`            |
| `profissionalId`             | `String`            |
| `servicoId`                  | `String`            |
| `dataHora`                   | `DateTime`          |
| `dataHoraFim`                | `DateTime`          |
| `status`                     | `StatusAgendamento` |
| `pendenciasEstoque`          | `Json`              |
| `valorServicoConcluido`      | `Decimal?`          |
| `comissaoPercentualAplicada` | `Decimal?`          |
| `createdAt`                  | `DateTime`          |
| `cliente`                    | `Cliente`           |
| `profissional`               | `Profissional`      |
| `servico`                    | `Servico`           |
| `recorrenciaId`              | `String?`           |
| `recorrencia`                | `Recorrencia?`      |
| `vendas`                     | `Venda[]`           |
| `avaliacoes`                 | `Avaliacao[]`       |

## Produto

Tabela: `produtos`.

| Campo               | Tipo Prisma             |
| ------------------- | ----------------------- |
| `id`                | `String`                |
| `empresaId`         | `String`                |
| `nome`              | `String`                |
| `sku`               | `String`                |
| `preco`             | `Decimal`               |
| `custoAtual`        | `Decimal?`              |
| `estoqueAtual`      | `Int`                   |
| `estoqueMinimo`     | `Int`                   |
| `categoria`         | `String?`               |
| `ativo`             | `Boolean`               |
| `dataVencimento`    | `DateTime?`             |
| `lote`              | `String?`               |
| `createdAt`         | `DateTime`              |
| `movimentacoes`     | `MovimentacaoEstoque[]` |
| `itensVenda`        | `ItemVenda[]`           |
| `insumos`           | `InsumoServico[]`       |
| `itensPedidoCompra` | `ItemPedidoCompra[]`    |
| `saldosFilial`      | `SaldoFilial[]`         |

## MovimentacaoEstoque

Tabela: `movimentacoes_estoque`.

| Campo           | Tipo Prisma        |
| --------------- | ------------------ |
| `id`            | `String`           |
| `empresaId`     | `String`           |
| `filialId`      | `String?`          |
| `produtoId`     | `String`           |
| `tipo`          | `TipoMovimentacao` |
| `quantidade`    | `Int`              |
| `motivo`        | `String`           |
| `agendamentoId` | `String?`          |
| `createdAt`     | `DateTime`         |
| `produto`       | `Produto`          |

## Venda

Tabela: `vendas`.

| Campo            | Tipo Prisma             |
| ---------------- | ----------------------- |
| `id`             | `String`                |
| `empresaId`      | `String`                |
| `clienteId`      | `String?`               |
| `agendamentoId`  | `String?`               |
| `cupomId`        | `String?`               |
| `filialId`       | `String?`               |
| `status`         | `String`                |
| `estornadaEm`    | `DateTime?`             |
| `motivoEstorno`  | `String?`               |
| `chaveOperacao`  | `String?`               |
| `requisicaoHash` | `String?`               |
| `estornadaPor`   | `String?`               |
| `total`          | `Decimal`               |
| `formaPagamento` | `String?`               |
| `desconto`       | `Decimal?`              |
| `valorPago`      | `Decimal?`              |
| `troco`          | `Decimal?`              |
| `createdAt`      | `DateTime`              |
| `cliente`        | `Cliente?`              |
| `agendamento`    | `Agendamento?`          |
| `cupom`          | `Cupom?`                |
| `itens`          | `ItemVenda[]`           |
| `filial`         | `Filial?`               |
| `lancamento`     | `LancamentoFinanceiro?` |

## ItemVenda

Tabela: `itens_venda`.

| Campo           | Tipo Prisma |
| --------------- | ----------- |
| `id`            | `String`    |
| `vendaId`       | `String`    |
| `produtoId`     | `String`    |
| `quantidade`    | `Int`       |
| `precoUnitario` | `Decimal`   |
| `custoUnitario` | `Decimal?`  |
| `venda`         | `Venda`     |
| `produto`       | `Produto`   |

## Avaliacao

Tabela: `avaliacoes`.

| Campo           | Tipo Prisma   |
| --------------- | ------------- |
| `id`            | `String`      |
| `empresaId`     | `String`      |
| `agendamentoId` | `String`      |
| `comentario`    | `String?`     |
| `createdAt`     | `DateTime`    |
| `agendamento`   | `Agendamento` |

## Notificacao

Tabela: `notificacoes`.

| Campo       | Tipo Prisma |
| ----------- | ----------- |
| `id`        | `String`    |
| `empresaId` | `String`    |
| `usuarioId` | `String`    |
| `titulo`    | `String`    |
| `mensagem`  | `String`    |
| `lida`      | `Boolean`   |
| `link`      | `String?`   |
| `createdAt` | `DateTime`  |

## Cupom

Tabela: `cupons`.

| Campo       | Tipo Prisma |
| ----------- | ----------- |
| `id`        | `String`    |
| `empresaId` | `String`    |
| `codigo`    | `String`    |
| `tipo`      | `TipoCupom` |
| `valor`     | `Decimal`   |
| `usoMaximo` | `Int?`      |
| `usoAtual`  | `Int`       |
| `validade`  | `DateTime?` |
| `ativo`     | `Boolean`   |
| `criadoEm`  | `DateTime`  |
| `empresa`   | `Empresa`   |
| `vendas`    | `Venda[]`   |

## Fornecedor

Tabela: `fornecedores`.

| Campo       | Tipo Prisma      |
| ----------- | ---------------- |
| `id`        | `String`         |
| `empresaId` | `String`         |
| `nome`      | `String`         |
| `cnpj`      | `String?`        |
| `telefone`  | `String?`        |
| `email`     | `String?`        |
| `ativo`     | `Boolean`        |
| `criadoEm`  | `DateTime`       |
| `empresa`   | `Empresa`        |
| `pedidos`   | `PedidoCompra[]` |

## PedidoCompra

Tabela: `pedidos_compra`.

| Campo          | Tipo Prisma          |
| -------------- | -------------------- |
| `id`           | `String`             |
| `empresaId`    | `String`             |
| `fornecedorId` | `String?`            |
| `status`       | `StatusPedido`       |
| `observacoes`  | `String?`            |
| `criadoEm`     | `DateTime`           |
| `atualizadoEm` | `DateTime`           |
| `empresa`      | `Empresa`            |
| `fornecedor`   | `Fornecedor?`        |
| `itens`        | `ItemPedidoCompra[]` |

## ItemPedidoCompra

Tabela: `itens_pedido_compra`.

| Campo           | Tipo Prisma    |
| --------------- | -------------- |
| `id`            | `String`       |
| `pedidoId`      | `String`       |
| `produtoId`     | `String`       |
| `quantidade`    | `Int`          |
| `precoEsperado` | `Decimal?`     |
| `pedido`        | `PedidoCompra` |
| `produto`       | `Produto`      |

## ConviteUsuario

Tabela: `convites_usuario`.

| Campo       | Tipo Prisma |
| ----------- | ----------- |
| `id`        | `String`    |
| `empresaId` | `String`    |
| `email`     | `String`    |
| `role`      | `Role`      |
| `token`     | `String`    |
| `expiresAt` | `DateTime`  |
| `usado`     | `Boolean`   |
| `criadoEm`  | `DateTime`  |
| `empresa`   | `Empresa`   |

## AuditLog

Tabela: `audit_logs`.

| Campo          | Tipo Prisma |
| -------------- | ----------- |
| `id`           | `String`    |
| `empresaId`    | `String`    |
| `usuarioId`    | `String?`   |
| `acao`         | `AuditAcao` |
| `recurso`      | `String`    |
| `recursoId`    | `String?`   |
| `dadosAntigos` | `Json?`     |
| `dadosNovos`   | `Json?`     |
| `ip`           | `String?`   |
| `userAgent`    | `String?`   |
| `criadoEm`     | `DateTime`  |
| `empresa`      | `Empresa`   |
| `usuario`      | `Usuario?`  |

## TermoAceite

Tabela: `termos_aceite`.

| Campo       | Tipo Prisma |
| ----------- | ----------- |
| `id`        | `String`    |
| `usuarioId` | `String`    |
| `versao`    | `String`    |
| `ip`        | `String?`   |
| `aceitoEm`  | `DateTime`  |
| `usuario`   | `Usuario`   |

## ExclusaoConta

Tabela: `exclusoes_conta`.

| Campo          | Tipo Prisma |
| -------------- | ----------- |
| `id`           | `String`    |
| `empresaId`    | `String`    |
| `solicitadaEm` | `DateTime`  |
| `executarEm`   | `DateTime`  |
| `executada`    | `Boolean`   |
| `empresa`      | `Empresa`   |

## Filial

Tabela: `filiais`.

| Campo         | Tipo Prisma              |
| ------------- | ------------------------ |
| `id`          | `String`                 |
| `empresaId`   | `String`                 |
| `nome`        | `String`                 |
| `endereco`    | `String`                 |
| `telefone`    | `String?`                |
| `ativa`       | `Boolean`                |
| `createdAt`   | `DateTime`               |
| `empresa`     | `Empresa`                |
| `tarefas`     | `Tarefa[]`               |
| `saldos`      | `SaldoFilial[]`          |
| `vendas`      | `Venda[]`                |
| `lancamentos` | `LancamentoFinanceiro[]` |

## Tarefa

Tabela: `tarefas`.

| Campo           | Tipo Prisma  |
| --------------- | ------------ |
| `id`            | `String`     |
| `empresaId`     | `String`     |
| `titulo`        | `String`     |
| `descricao`     | `String`     |
| `status`        | `String`     |
| `prioridade`    | `String`     |
| `prazo`         | `DateTime?`  |
| `responsavelId` | `String?`    |
| `filialId`      | `String?`    |
| `automacaoId`   | `String?`    |
| `ocorrencia`    | `DateTime?`  |
| `createdAt`     | `DateTime`   |
| `updatedAt`     | `DateTime`   |
| `empresa`       | `Empresa`    |
| `filial`        | `Filial?`    |
| `automacao`     | `Automacao?` |

## Documento

Tabela: `documentos`.

| Campo       | Tipo Prisma |
| ----------- | ----------- |
| `id`        | `String`    |
| `empresaId` | `String`    |
| `titulo`    | `String`    |
| `conteudo`  | `String`    |
| `categoria` | `String`    |
| `versao`    | `Int`       |
| `createdAt` | `DateTime`  |
| `updatedAt` | `DateTime`  |
| `empresa`   | `Empresa`   |

## Campanha

Tabela: `campanhas`.

| Campo       | Tipo Prisma |
| ----------- | ----------- |
| `id`        | `String`    |
| `empresaId` | `String`    |
| `titulo`    | `String`    |
| `mensagem`  | `String`    |
| `status`    | `String`    |
| `createdAt` | `DateTime`  |
| `updatedAt` | `DateTime`  |
| `empresa`   | `Empresa`   |

## ConsentimentoMarketing

Tabela: `consentimentos_marketing`.

| Campo        | Tipo Prisma |
| ------------ | ----------- |
| `id`         | `String`    |
| `empresaId`  | `String`    |
| `clienteId`  | `String`    |
| `autorizado` | `Boolean`   |
| `evidencia`  | `String`    |
| `updatedAt`  | `DateTime`  |
| `empresa`    | `Empresa`   |

## Automacao

Tabela: `automacoes`.

| Campo             | Tipo Prisma |
| ----------------- | ----------- |
| `id`              | `String`    |
| `empresaId`       | `String`    |
| `titulo`          | `String`    |
| `descricao`       | `String`    |
| `intervaloDias`   | `Int`       |
| `proximaExecucao` | `DateTime`  |
| `ultimaExecucao`  | `DateTime?` |
| `responsavelId`   | `String?`   |
| `ativa`           | `Boolean`   |
| `createdAt`       | `DateTime`  |
| `empresa`         | `Empresa`   |
| `tarefas`         | `Tarefa[]`  |

## Recorrencia

Tabela: `recorrencias`.

| Campo           | Tipo Prisma     |
| --------------- | --------------- |
| `id`            | `String`        |
| `empresaId`     | `String`        |
| `titulo`        | `String`        |
| `intervaloDias` | `Int`           |
| `quantidade`    | `Int`           |
| `inicio`        | `DateTime`      |
| `cancelada`     | `Boolean`       |
| `createdAt`     | `DateTime`      |
| `empresa`       | `Empresa`       |
| `agendamentos`  | `Agendamento[]` |

## LancamentoFinanceiro

Tabela: `lancamentos_financeiros`.

| Campo        | Tipo Prisma         |
| ------------ | ------------------- |
| `id`         | `String`            |
| `empresaId`  | `String`            |
| `filialId`   | `String?`           |
| `vendaId`    | `String?`           |
| `descricao`  | `String`            |
| `tipo`       | `String`            |
| `categoria`  | `String`            |
| `valor`      | `Decimal`           |
| `valorPago`  | `Decimal`           |
| `status`     | `String`            |
| `vencimento` | `DateTime`          |
| `createdAt`  | `DateTime`          |
| `empresa`    | `Empresa`           |
| `filial`     | `Filial?`           |
| `venda`      | `Venda?`            |
| `baixas`     | `BaixaFinanceira[]` |

## BaixaFinanceira

Tabela: `baixas_financeiras`.

| Campo          | Tipo Prisma            |
| -------------- | ---------------------- |
| `id`           | `String`               |
| `lancamentoId` | `String`               |
| `chave`        | `String`               |
| `valor`        | `Decimal`              |
| `data`         | `DateTime`             |
| `estornada`    | `Boolean`              |
| `estornadaEm`  | `DateTime?`            |
| `lancamento`   | `LancamentoFinanceiro` |

## SaldoFilial

Tabela: `saldos_filiais`.

| Campo        | Tipo Prisma |
| ------------ | ----------- |
| `id`         | `String`    |
| `empresaId`  | `String`    |
| `filialId`   | `String`    |
| `produtoId`  | `String`    |
| `quantidade` | `Int`       |
| `filial`     | `Filial`    |
| `produto`    | `Produto`   |

## JobDuravel

Tabela: `jobs_duraveis`.

| Campo         | Tipo Prisma |
| ------------- | ----------- |
| `id`          | `String`    |
| `empresaId`   | `String`    |
| `chave`       | `String`    |
| `tipo`        | `String`    |
| `payload`     | `Json`      |
| `status`      | `String`    |
| `tentativas`  | `Int`       |
| `executarEm`  | `DateTime`  |
| `reservadoEm` | `DateTime?` |
| `reserva`     | `String?`   |
| `erro`        | `String?`   |
| `createdAt`   | `DateTime`  |
| `empresa`     | `Empresa`   |

## Importacao

Tabela: `importacoes`.

| Campo       | Tipo Prisma |
| ----------- | ----------- |
| `id`        | `String`    |
| `empresaId` | `String`    |
| `chave`     | `String`    |
| `tipo`      | `String`    |
| `resumo`    | `Json`      |
| `createdAt` | `DateTime`  |
| `empresa`   | `Empresa`   |

## ComprovacaoOperacional

Tabela: `comprovacoes_operacionais`.

| Campo          | Tipo Prisma |
| -------------- | ----------- |
| `id`           | `String`    |
| `empresaId`    | `String`    |
| `tipo`         | `String`    |
| `referencia`   | `String`    |
| `verificadoEm` | `DateTime`  |
| `observacoes`  | `String`    |
| `usuarioId`    | `String`    |
| `createdAt`    | `DateTime`  |
| `empresa`      | `Empresa`   |

## RecuperacaoSenha

Tabela: `recuperacoes_senha`.

| Campo       | Tipo Prisma |
| ----------- | ----------- |
| `id`        | `String`    |
| `usuarioId` | `String`    |
| `tokenHash` | `String`    |
| `expiresAt` | `DateTime`  |
| `usadoEm`   | `DateTime?` |
| `createdAt` | `DateTime`  |
| `usuario`   | `Usuario`   |

## TransferenciaFilial

Tabela: `transferencias_filiais`.

| Campo        | Tipo Prisma |
| ------------ | ----------- |
| `id`         | `String`    |
| `empresaId`  | `String`    |
| `chave`      | `String`    |
| `produtoId`  | `String`    |
| `origemId`   | `String?`   |
| `destinoId`  | `String?`   |
| `quantidade` | `Int`       |
| `motivo`     | `String`    |
| `createdAt`  | `DateTime`  |
| `empresa`    | `Empresa`   |

## Enumerações

- **Role:** `ADMIN`, `GESTOR`, `PROFISSIONAL`, `RECEPCIONISTA`, `CAIXA`.
- **Plano:** `FREE`, `BASIC`, `PRO`, `ENTERPRISE`.
- **StatusAgendamento:** `AGENDADO`, `CONFIRMADO`, `CONCLUIDO`, `CANCELADO`.
- **TipoMovimentacao:** `ENTRADA`, `SAIDA`.
- **TipoCupom:** `PERCENTUAL`, `FIXO`.
- **StatusPedido:** `RASCUNHO`, `ENVIADO`, `RECEBIDO`, `CANCELADO`.
- **AuditAcao:** `CRIAR`, `EDITAR`, `EXCLUIR`, `LOGIN`, `LOGOUT`.
