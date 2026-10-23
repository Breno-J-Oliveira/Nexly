# Referência da API

Inventário gerado dos decorators NestJS pelo comando `node scripts/documentation.cjs generate`. Todas as rotas abaixo incluem o prefixo `/api`. DTOs, guards e serviços definem validação, acesso e comportamento; a coluna de decorators registra declarações explícitas, sem substituir a política global. Swagger fica disponível em desenvolvimento em `/api/docs`.

## AgendamentosController

Fonte: [apps/api/src/agendamentos/agendamentos.controller.ts](../apps/api/src/agendamentos/agendamentos.controller.ts).

| Método | Caminho                        | Operação no controller | Decorators de acesso explícitos         |
| ------ | ------------------------------ | ---------------------- | --------------------------------------- |
| GET    | `/api/agendamentos`            | `listar`               | Política global e verificações do fluxo |
| GET    | `/api/agendamentos/:id`        | `obter`                | Política global e verificações do fluxo |
| POST   | `/api/agendamentos`            | `criar`                | Política global e verificações do fluxo |
| PATCH  | `/api/agendamentos/:id/status` | `atualizarStatus`      | Política global e verificações do fluxo |
| DELETE | `/api/agendamentos/:id`        | `cancelar`             | Política global e verificações do fluxo |

## AssinaturasController

Fonte: [apps/api/src/assinaturas/assinaturas.controller.ts](../apps/api/src/assinaturas/assinaturas.controller.ts).

| Método | Caminho                             | Operação no controller | Decorators de acesso explícitos |
| ------ | ----------------------------------- | ---------------------- | ------------------------------- |
| GET    | `/api/assinaturas`                  | `status`               | Roles(Role.ADMIN)               |
| POST   | `/api/assinaturas/checkout`         | `checkout`             | Roles(Role.ADMIN)               |
| POST   | `/api/assinaturas/portal`           | `portal`               | Roles(Role.ADMIN)               |
| POST   | `/api/assinaturas/atualizar-status` | `atualizar`            | Roles(Role.ADMIN)               |
| POST   | `/api/assinaturas/webhook`          | `webhook`              | Roles(Role.ADMIN); Public()     |

## AuditController

Fonte: [apps/api/src/audit/audit.controller.ts](../apps/api/src/audit/audit.controller.ts).

| Método | Caminho           | Operação no controller | Decorators de acesso explícitos |
| ------ | ----------------- | ---------------------- | ------------------------------- |
| GET    | `/api/audit/logs` | `listar`               | Roles(Role.ADMIN)               |

## AuthController

Fonte: [apps/api/src/auth/auth.controller.ts](../apps/api/src/auth/auth.controller.ts).

| Método | Caminho                      | Operação no controller | Decorators de acesso explícitos         |
| ------ | ---------------------------- | ---------------------- | --------------------------------------- |
| GET    | `/api/auth/google/config`    | `googleConfig`         | Public()                                |
| POST   | `/api/auth/google/challenge` | `googleChallenge`      | Public()                                |
| POST   | `/api/auth/google/login`     | `googleLogin`          | Public()                                |
| POST   | `/api/auth/google/register`  | `googleRegister`       | Public()                                |
| GET    | `/api/auth/google/status`    | `googleStatus`         | Roles(...Object.values(Role))           |
| POST   | `/api/auth/google/link`      | `googleLink`           | Roles(...Object.values(Role))           |
| POST   | `/api/auth/register`         | `register`             | Public()                                |
| GET    | `/api/auth/aceitar-convite`  | `obterConvite`         | Public()                                |
| POST   | `/api/auth/convite/detalhes` | `detalhesConvite`      | Public()                                |
| POST   | `/api/auth/aceitar-convite`  | `aceitarConvite`       | Public()                                |
| POST   | `/api/auth/login`            | `login`                | Public()                                |
| POST   | `/api/auth/refresh`          | `refresh`              | Public()                                |
| POST   | `/api/auth/logout`           | `logout`               | Public()                                |
| GET    | `/api/auth/me`               | `me`                   | Política global e verificações do fluxo |
| GET    | `/api/auth/sessions`         | `listarSessoes`        | Roles(...Object.values(Role))           |
| DELETE | `/api/auth/sessions/:id`     | `revogarSessao`        | Roles(...Object.values(Role))           |
| GET    | `/api/auth/2fa/setup`        | `setup2fa`             | Política global e verificações do fluxo |
| GET    | `/api/auth/2fa/status`       | `status2fa`            | Política global e verificações do fluxo |
| POST   | `/api/auth/2fa/enable`       | `enable2fa`            | Política global e verificações do fluxo |
| POST   | `/api/auth/2fa/disable`      | `disable2fa`           | Política global e verificações do fluxo |
| POST   | `/api/auth/2fa/verify`       | `verify2fa`            | Public()                                |

## RecuperacaoController

Fonte: [apps/api/src/auth/recuperacao.controller.ts](../apps/api/src/auth/recuperacao.controller.ts).

| Método | Caminho                           | Operação no controller | Decorators de acesso explícitos |
| ------ | --------------------------------- | ---------------------- | ------------------------------- |
| GET    | `/api/auth/recuperacao/status`    | `status`               | Public()                        |
| POST   | `/api/auth/recuperacao/solicitar` | `solicitar`            | Public()                        |
| POST   | `/api/auth/recuperacao/redefinir` | `redefinir`            | Public()                        |

## AvaliacoesController

Fonte: [apps/api/src/avaliacoes/avaliacoes.controller.ts](../apps/api/src/avaliacoes/avaliacoes.controller.ts).

| Método | Caminho               | Operação no controller | Decorators de acesso explícitos         |
| ------ | --------------------- | ---------------------- | --------------------------------------- |
| POST   | `/api/avaliacoes`     | `criar`                | Política global e verificações do fluxo |
| GET    | `/api/avaliacoes/nps` | `nps`                  | Política global e verificações do fluxo |

## BookingController

Fonte: [apps/api/src/booking/booking.controller.ts](../apps/api/src/booking/booking.controller.ts).

| Método | Caminho                               | Operação no controller | Decorators de acesso explícitos |
| ------ | ------------------------------------- | ---------------------- | ------------------------------- |
| GET    | `/api/booking/:token`                 | `empresa`              | Public()                        |
| GET    | `/api/booking/:token/servicos`        | `servicos`             | Public()                        |
| GET    | `/api/booking/:token/profissionais`   | `profissionais`        | Public()                        |
| GET    | `/api/booking/:token/disponibilidade` | `disponibilidade`      | Public()                        |
| GET    | `/api/booking/:token/horarios`        | `horarios`             | Public()                        |
| POST   | `/api/booking/:token/agendar`         | `agendar`              | Public()                        |
| POST   | `/api/booking/:token`                 | `agendarNaRaiz`        | Public()                        |

## ClientesController

Fonte: [apps/api/src/clientes/clientes.controller.ts](../apps/api/src/clientes/clientes.controller.ts).

| Método | Caminho                       | Operação no controller | Decorators de acesso explícitos         |
| ------ | ----------------------------- | ---------------------- | --------------------------------------- |
| GET    | `/api/clientes`               | `listar`               | Política global e verificações do fluxo |
| GET    | `/api/clientes/:id/metricas`  | `metricas`             | Política global e verificações do fluxo |
| GET    | `/api/clientes/:id/historico` | `historico`            | Política global e verificações do fluxo |
| GET    | `/api/clientes/:id`           | `obter`                | Política global e verificações do fluxo |
| POST   | `/api/clientes`               | `criar`                | Política global e verificações do fluxo |
| PUT    | `/api/clientes/:id`           | `atualizar`            | Política global e verificações do fluxo |
| DELETE | `/api/clientes/:id`           | `desativar`            | Política global e verificações do fluxo |

## ComissaoController

Fonte: [apps/api/src/comissao/comissao.controller.ts](../apps/api/src/comissao/comissao.controller.ts).

| Método | Caminho                         | Operação no controller | Decorators de acesso explícitos         |
| ------ | ------------------------------- | ---------------------- | --------------------------------------- |
| GET    | `/api/comissao/resumo`          | `resumo`               | Política global e verificações do fluxo |
| GET    | `/api/comissao/:profissionalId` | `calcular`             | Política global e verificações do fluxo |

## ConfiguracoesController

Fonte: [apps/api/src/configuracoes/configuracoes.controller.ts](../apps/api/src/configuracoes/configuracoes.controller.ts).

| Método | Caminho                               | Operação no controller  | Decorators de acesso explícitos         |
| ------ | ------------------------------------- | ----------------------- | --------------------------------------- |
| GET    | `/api/configuracoes`                  | `obter`                 | Política global e verificações do fluxo |
| GET    | `/api/configuracoes/link-agendamento` | `linkAgendamento`       | Política global e verificações do fluxo |
| PUT    | `/api/configuracoes`                  | `atualizar`             | Política global e verificações do fluxo |
| PATCH  | `/api/configuracoes/notificacoes`     | `atualizarNotificacoes` | Política global e verificações do fluxo |

## CuponsController

Fonte: [apps/api/src/cupons/cupons.controller.ts](../apps/api/src/cupons/cupons.controller.ts).

| Método | Caminho               | Operação no controller | Decorators de acesso explícitos         |
| ------ | --------------------- | ---------------------- | --------------------------------------- |
| GET    | `/api/cupons`         | `listar`               | Política global e verificações do fluxo |
| POST   | `/api/cupons`         | `criar`                | Política global e verificações do fluxo |
| POST   | `/api/cupons/validar` | `validar`              | Política global e verificações do fluxo |
| PATCH  | `/api/cupons/:id`     | `atualizar`            | Política global e verificações do fluxo |
| DELETE | `/api/cupons/:id`     | `excluir`              | Política global e verificações do fluxo |

## DashboardController

Fonte: [apps/api/src/dashboard/dashboard.controller.ts](../apps/api/src/dashboard/dashboard.controller.ts).

| Método | Caminho                  | Operação no controller | Decorators de acesso explícitos         |
| ------ | ------------------------ | ---------------------- | --------------------------------------- |
| GET    | `/api/dashboard/alertas` | `getAlertas`           | Política global e verificações do fluxo |
| GET    | `/api/dashboard`         | `getDashboard`         | Política global e verificações do fluxo |

## EstoqueController

Fonte: [apps/api/src/estoque/estoque.controller.ts](../apps/api/src/estoque/estoque.controller.ts).

| Método | Caminho                                   | Operação no controller | Decorators de acesso explícitos         |
| ------ | ----------------------------------------- | ---------------------- | --------------------------------------- |
| GET    | `/api/estoque/pendencias`                 | `pendencias`           | Política global e verificações do fluxo |
| POST   | `/api/estoque/pendencias/:id/reprocessar` | `reprocessar`          | Política global e verificações do fluxo |
| POST   | `/api/estoque/pendencias/:id/cancelar`    | `cancelar`             | Política global e verificações do fluxo |
| POST   | `/api/estoque/entrada`                    | `entrada`              | Política global e verificações do fluxo |
| GET    | `/api/estoque/historico/:produtoId`       | `historico`            | Política global e verificações do fluxo |
| GET    | `/api/estoque/resumo`                     | `resumo`               | Política global e verificações do fluxo |

## ExperienciaController

Fonte: [apps/api/src/experiencia/experiencia.controller.ts](../apps/api/src/experiencia/experiencia.controller.ts).

| Método | Caminho                          | Operação no controller | Decorators de acesso explícitos         |
| ------ | -------------------------------- | ---------------------- | --------------------------------------- |
| GET    | `/api/experiencia/recomendacoes` | `publicos`             | Public()                                |
| GET    | `/api/experiencia`               | `perfil`               | Política global e verificações do fluxo |
| POST   | `/api/experiencia/atividade`     | `atividade`            | Política global e verificações do fluxo |
| PUT    | `/api/experiencia/workspace`     | `workspace`            | Roles(Role.ADMIN)                       |
| PUT    | `/api/experiencia/recomendacao`  | `recomendar`           | Política global e verificações do fluxo |
| POST   | `/api/experiencia/lembrar`       | `lembrar`              | Política global e verificações do fluxo |
| DELETE | `/api/experiencia/recomendacao`  | `retirar`              | Política global e verificações do fluxo |

## ExportController

Fonte: [apps/api/src/export/export.controller.ts](../apps/api/src/export/export.controller.ts).

| Método | Caminho                         | Operação no controller | Decorators de acesso explícitos         |
| ------ | ------------------------------- | ---------------------- | --------------------------------------- |
| GET    | `/api/export/vendas/csv`        | `vendasCsv`            | Política global e verificações do fluxo |
| GET    | `/api/export/produtos/vencendo` | `vencendo`             | Política global e verificações do fluxo |

## FidelidadeController

Fonte: [apps/api/src/fidelidade/fidelidade.controller.ts](../apps/api/src/fidelidade/fidelidade.controller.ts).

| Método | Caminho                     | Operação no controller | Decorators de acesso explícitos         |
| ------ | --------------------------- | ---------------------- | --------------------------------------- |
| GET    | `/api/fidelidade/ranking`   | `ranking`              | Política global e verificações do fluxo |
| GET    | `/api/fidelidade/segmentar` | `segmentar`            | Política global e verificações do fluxo |
| POST   | `/api/fidelidade/pontos`    | `pontos`               | Política global e verificações do fluxo |

## FinanceiroController

Fonte: [apps/api/src/financeiro/financeiro.controller.ts](../apps/api/src/financeiro/financeiro.controller.ts).

| Método | Caminho                        | Operação no controller | Decorators de acesso explícitos         |
| ------ | ------------------------------ | ---------------------- | --------------------------------------- |
| GET    | `/api/financeiro/dre`          | `dre`                  | Política global e verificações do fluxo |
| GET    | `/api/financeiro/fluxo-caixa`  | `fluxoCaixa`           | Política global e verificações do fluxo |
| GET    | `/api/financeiro/top-produtos` | `topProdutos`          | Política global e verificações do fluxo |

## FornecedoresController

Fonte: [apps/api/src/fornecedores/fornecedores.controller.ts](../apps/api/src/fornecedores/fornecedores.controller.ts).

| Método | Caminho                 | Operação no controller | Decorators de acesso explícitos         |
| ------ | ----------------------- | ---------------------- | --------------------------------------- |
| GET    | `/api/fornecedores`     | `listar`               | Política global e verificações do fluxo |
| POST   | `/api/fornecedores`     | `criar`                | Política global e verificações do fluxo |
| PATCH  | `/api/fornecedores/:id` | `atualizar`            | Política global e verificações do fluxo |
| DELETE | `/api/fornecedores/:id` | `excluir`              | Política global e verificações do fluxo |

## GestaoController

Fonte: [apps/api/src/gestao/gestao.controller.ts](../apps/api/src/gestao/gestao.controller.ts).

| Método | Caminho                                               | Operação no controller | Decorators de acesso explícitos                                            |
| ------ | ----------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------- |
| GET    | `/api/gestao/inicio`                                  | `inicio`               | Roles(Role.ADMIN, Role.GESTOR)                                             |
| PUT    | `/api/gestao/preferencias`                            | `preferencias`         | Roles(Role.ADMIN, Role.GESTOR)                                             |
| GET    | `/api/gestao/monitor`                                 | `monitor`              | Roles(Role.ADMIN, Role.GESTOR); Roles(Role.ADMIN)                          |
| POST   | `/api/gestao/comprovacoes`                            | `comprovar`            | Roles(Role.ADMIN, Role.GESTOR); Roles(Role.ADMIN)                          |
| POST   | `/api/gestao/rotinas/:id/repetir`                     | `repetir`              | Roles(Role.ADMIN, Role.GESTOR); Roles(Role.ADMIN)                          |
| GET    | `/api/gestao/filiais`                                 | `saldos`               | Roles(Role.ADMIN, Role.GESTOR)                                             |
| POST   | `/api/gestao/transferencias`                          | `transferir`           | Roles(Role.ADMIN, Role.GESTOR)                                             |
| GET    | `/api/gestao/unidades`                                | `unidades`             | Roles(Role.ADMIN, Role.GESTOR); Roles(Role.ADMIN, Role.GESTOR, Role.CAIXA) |
| GET    | `/api/gestao/catalogo-filial/:id`                     | `catalogoFilial`       | Roles(Role.ADMIN, Role.GESTOR); Roles(Role.ADMIN, Role.GESTOR, Role.CAIXA) |
| POST   | `/api/gestao/importacao/previa`                       | `previa`               | Roles(Role.ADMIN, Role.GESTOR)                                             |
| POST   | `/api/gestao/importacao/confirmar`                    | `importar`             | Roles(Role.ADMIN, Role.GESTOR)                                             |
| GET    | `/api/gestao/financeiro`                              | `contas`               | Roles(Role.ADMIN, Role.GESTOR)                                             |
| GET    | `/api/gestao/financeiro/resumo`                       | `resumo`               | Roles(Role.ADMIN, Role.GESTOR)                                             |
| POST   | `/api/gestao/financeiro`                              | `criarConta`           | Roles(Role.ADMIN, Role.GESTOR)                                             |
| POST   | `/api/gestao/financeiro/:id/baixar`                   | `baixar`               | Roles(Role.ADMIN, Role.GESTOR)                                             |
| POST   | `/api/gestao/financeiro/:id/cancelar`                 | `cancelar`             | Roles(Role.ADMIN, Role.GESTOR)                                             |
| POST   | `/api/gestao/financeiro/:id/baixas/:baixaId/estornar` | `estornarBaixa`        | Roles(Role.ADMIN, Role.GESTOR)                                             |
| GET    | `/api/gestao/historico`                               | `historico`            | Roles(Role.ADMIN, Role.GESTOR); Roles(Role.ADMIN)                          |

## HealthController

Fonte: [apps/api/src/health/health.controller.ts](../apps/api/src/health/health.controller.ts).

| Método | Caminho                  | Operação no controller | Decorators de acesso explícitos |
| ------ | ------------------------ | ---------------------- | ------------------------------- |
| GET    | `/api/health`            | `check`                | Public()                        |
| GET    | `/api/health/deep`       | `checkDeep`            | Public()                        |
| GET    | `/api/health/version`    | `version_`             | Public()                        |
| GET    | `/api/health/migrations` | `migrations`           | Roles(Role.ADMIN)               |

## LgpdController

Fonte: [apps/api/src/lgpd/lgpd.controller.ts](../apps/api/src/lgpd/lgpd.controller.ts).

| Método | Caminho                            | Operação no controller | Decorators de acesso explícitos |
| ------ | ---------------------------------- | ---------------------- | ------------------------------- |
| GET    | `/api/lgpd/exportar`               | `exportar`             | Roles(Role.ADMIN)               |
| GET    | `/api/lgpd/exportar/cliente/:id`   | `exportarCliente`      | Roles(Role.ADMIN)               |
| POST   | `/api/lgpd/anonimizar/cliente/:id` | `anonimizar`           | Roles(Role.ADMIN)               |
| DELETE | `/api/lgpd/excluir-conta`          | `solicitarExclusao`    | Roles(Role.ADMIN)               |
| GET    | `/api/lgpd/status-exclusao`        | `statusExclusao`       | Roles(Role.ADMIN)               |
| DELETE | `/api/lgpd/cancelar-exclusao`      | `cancelarExclusao`     | Roles(Role.ADMIN)               |

## NotificacoesController

Fonte: [apps/api/src/notificacoes/notificacoes.controller.ts](../apps/api/src/notificacoes/notificacoes.controller.ts).

| Método | Caminho                     | Operação no controller | Decorators de acesso explícitos         |
| ------ | --------------------------- | ---------------------- | --------------------------------------- |
| GET    | `/api/notificacoes`         | `listar`               | Política global e verificações do fluxo |
| GET    | `/api/notificacoes/count`   | `naoLidas`             | Política global e verificações do fluxo |
| PATCH  | `/api/notificacoes/:id/ler` | `marcarLida`           | Política global e verificações do fluxo |

## OperacoesController

Fonte: [apps/api/src/operacoes/operacoes.controller.ts](../apps/api/src/operacoes/operacoes.controller.ts).

| Método | Caminho                                    | Operação no controller | Decorators de acesso explícitos |
| ------ | ------------------------------------------ | ---------------------- | ------------------------------- |
| GET    | `/api/operacoes/opcoes`                    | `opcoes`               | Roles(Role.ADMIN, Role.GESTOR)  |
| GET    | `/api/operacoes/tarefas`                   | `tarefas`              | Roles(Role.ADMIN, Role.GESTOR)  |
| POST   | `/api/operacoes/tarefas`                   | `criarTarefa`          | Roles(Role.ADMIN, Role.GESTOR)  |
| PUT    | `/api/operacoes/tarefas/:id`               | `editarTarefa`         | Roles(Role.ADMIN, Role.GESTOR)  |
| DELETE | `/api/operacoes/tarefas/:id`               | `excluirTarefa`        | Roles(Role.ADMIN, Role.GESTOR)  |
| GET    | `/api/operacoes/filiais`                   | `filiais`              | Roles(Role.ADMIN, Role.GESTOR)  |
| POST   | `/api/operacoes/filiais`                   | `criarFilial`          | Roles(Role.ADMIN, Role.GESTOR)  |
| PUT    | `/api/operacoes/filiais/:id`               | `editarFilial`         | Roles(Role.ADMIN, Role.GESTOR)  |
| GET    | `/api/operacoes/documentos`                | `documentos`           | Roles(Role.ADMIN, Role.GESTOR)  |
| GET    | `/api/operacoes/documentos/:id`            | `documento`            | Roles(Role.ADMIN, Role.GESTOR)  |
| POST   | `/api/operacoes/documentos`                | `criarDocumento`       | Roles(Role.ADMIN, Role.GESTOR)  |
| PUT    | `/api/operacoes/documentos/:id`            | `editarDocumento`      | Roles(Role.ADMIN, Role.GESTOR)  |
| DELETE | `/api/operacoes/documentos/:id`            | `excluirDocumento`     | Roles(Role.ADMIN, Role.GESTOR)  |
| GET    | `/api/operacoes/campanhas`                 | `campanhas`            | Roles(Role.ADMIN, Role.GESTOR)  |
| POST   | `/api/operacoes/campanhas`                 | `criarCampanha`        | Roles(Role.ADMIN, Role.GESTOR)  |
| PUT    | `/api/operacoes/campanhas/:id`             | `editarCampanha`       | Roles(Role.ADMIN, Role.GESTOR)  |
| PUT    | `/api/operacoes/consentimentos`            | `consentimento`        | Roles(Role.ADMIN, Role.GESTOR)  |
| GET    | `/api/operacoes/campanhas/:id/contatos`    | `contatos`             | Roles(Role.ADMIN, Role.GESTOR)  |
| GET    | `/api/operacoes/automacoes`                | `automacoes`           | Roles(Role.ADMIN, Role.GESTOR)  |
| POST   | `/api/operacoes/automacoes`                | `criarAutomacao`       | Roles(Role.ADMIN, Role.GESTOR)  |
| PUT    | `/api/operacoes/automacoes/:id`            | `editarAutomacao`      | Roles(Role.ADMIN, Role.GESTOR)  |
| POST   | `/api/operacoes/automacoes/processar`      | `processar`            | Roles(Role.ADMIN, Role.GESTOR)  |
| GET    | `/api/operacoes/recorrencias`              | `recorrencias`         | Roles(Role.ADMIN, Role.GESTOR)  |
| POST   | `/api/operacoes/recorrencias`              | `criarRecorrencia`     | Roles(Role.ADMIN, Role.GESTOR)  |
| POST   | `/api/operacoes/recorrencias/:id/cancelar` | `cancelar`             | Roles(Role.ADMIN, Role.GESTOR)  |

## PedidosCompraController

Fonte: [apps/api/src/pedidos-compra/pedidos-compra.controller.ts](../apps/api/src/pedidos-compra/pedidos-compra.controller.ts).

| Método | Caminho                            | Operação no controller | Decorators de acesso explícitos         |
| ------ | ---------------------------------- | ---------------------- | --------------------------------------- |
| GET    | `/api/pedidos-compra/sugestao`     | `sugestao`             | Política global e verificações do fluxo |
| GET    | `/api/pedidos-compra`              | `listar`               | Política global e verificações do fluxo |
| GET    | `/api/pedidos-compra/:id`          | `obter`                | Política global e verificações do fluxo |
| POST   | `/api/pedidos-compra`              | `criar`                | Política global e verificações do fluxo |
| PATCH  | `/api/pedidos-compra/:id`          | `atualizar`            | Política global e verificações do fluxo |
| PATCH  | `/api/pedidos-compra/:id/enviar`   | `enviar`               | Política global e verificações do fluxo |
| PATCH  | `/api/pedidos-compra/:id/receber`  | `receber`              | Política global e verificações do fluxo |
| PATCH  | `/api/pedidos-compra/:id/cancelar` | `cancelar`             | Política global e verificações do fluxo |

## ProdutosController

Fonte: [apps/api/src/produtos/produtos.controller.ts](../apps/api/src/produtos/produtos.controller.ts).

| Método | Caminho                    | Operação no controller | Decorators de acesso explícitos         |
| ------ | -------------------------- | ---------------------- | --------------------------------------- |
| GET    | `/api/produtos`            | `listar`               | Política global e verificações do fluxo |
| GET    | `/api/produtos/alerta`     | `listarEmAlerta`       | Política global e verificações do fluxo |
| GET    | `/api/produtos/categorias` | `categorias`           | Política global e verificações do fluxo |
| GET    | `/api/produtos/:id`        | `obter`                | Política global e verificações do fluxo |
| POST   | `/api/produtos`            | `criar`                | Política global e verificações do fluxo |
| PUT    | `/api/produtos/:id`        | `atualizar`            | Política global e verificações do fluxo |
| DELETE | `/api/produtos/:id`        | `desativar`            | Política global e verificações do fluxo |

## ProfissionaisController

Fonte: [apps/api/src/profissionais/profissionais.controller.ts](../apps/api/src/profissionais/profissionais.controller.ts).

| Método | Caminho                                  | Operação no controller | Decorators de acesso explícitos         |
| ------ | ---------------------------------------- | ---------------------- | --------------------------------------- |
| GET    | `/api/profissionais`                     | `listar`               | Política global e verificações do fluxo |
| GET    | `/api/profissionais/limites`             | `limites`              | Política global e verificações do fluxo |
| GET    | `/api/profissionais/:id`                 | `obter`                | Política global e verificações do fluxo |
| GET    | `/api/profissionais/:id/disponibilidade` | `disponibilidade`      | Política global e verificações do fluxo |
| POST   | `/api/profissionais`                     | `criar`                | Política global e verificações do fluxo |
| PUT    | `/api/profissionais/:id`                 | `atualizar`            | Política global e verificações do fluxo |
| DELETE | `/api/profissionais/:id`                 | `desativar`            | Política global e verificações do fluxo |

## RelatoriosController

Fonte: [apps/api/src/relatorios/relatorios.controller.ts](../apps/api/src/relatorios/relatorios.controller.ts).

| Método | Caminho                               | Operação no controller | Decorators de acesso explícitos         |
| ------ | ------------------------------------- | ---------------------- | --------------------------------------- |
| GET    | `/api/relatorios/insumos-por-servico` | `insumos`              | Política global e verificações do fluxo |
| GET    | `/api/relatorios/horarios-pico`       | `horariosPico`         | Política global e verificações do fluxo |
| GET    | `/api/relatorios/faturamento`         | `faturamento`          | Política global e verificações do fluxo |
| GET    | `/api/relatorios/resumo`              | `resumo`               | Política global e verificações do fluxo |
| GET    | `/api/relatorios/agenda`              | `agenda`               | Política global e verificações do fluxo |
| GET    | `/api/relatorios/profissionais`       | `profissionais`        | Política global e verificações do fluxo |
| GET    | `/api/relatorios/estoque`             | `estoque`              | Política global e verificações do fluxo |

## ServicosController

Fonte: [apps/api/src/servicos/servicos.controller.ts](../apps/api/src/servicos/servicos.controller.ts).

| Método | Caminho                                | Operação no controller | Decorators de acesso explícitos         |
| ------ | -------------------------------------- | ---------------------- | --------------------------------------- |
| GET    | `/api/servicos`                        | `listar`               | Política global e verificações do fluxo |
| GET    | `/api/servicos/:id`                    | `obter`                | Política global e verificações do fluxo |
| POST   | `/api/servicos`                        | `criar`                | Política global e verificações do fluxo |
| PUT    | `/api/servicos/:id`                    | `atualizar`            | Política global e verificações do fluxo |
| DELETE | `/api/servicos/:id`                    | `desativar`            | Política global e verificações do fluxo |
| GET    | `/api/servicos/:id/insumos`            | `listarInsumos`        | Roles(Role.ADMIN, Role.GESTOR)          |
| POST   | `/api/servicos/:id/insumos`            | `associarInsumo`       | Roles(Role.ADMIN, Role.GESTOR)          |
| DELETE | `/api/servicos/:id/insumos/:produtoId` | `removerInsumo`        | Roles(Role.ADMIN, Role.GESTOR)          |

## UsuariosController

Fonte: [apps/api/src/usuarios/usuarios.controller.ts](../apps/api/src/usuarios/usuarios.controller.ts).

| Método | Caminho                      | Operação no controller | Decorators de acesso explícitos         |
| ------ | ---------------------------- | ---------------------- | --------------------------------------- |
| GET    | `/api/usuarios`              | `listar`               | Roles(Role.ADMIN)                       |
| POST   | `/api/usuarios`              | `criar`                | Roles(Role.ADMIN)                       |
| POST   | `/api/usuarios/convidar`     | `convidar`             | Roles(Role.ADMIN)                       |
| PUT    | `/api/usuarios/:id`          | `atualizar`            | Roles(Role.ADMIN)                       |
| POST   | `/api/usuarios/trocar-senha` | `trocarSenha`          | Política global e verificações do fluxo |
| DELETE | `/api/usuarios/:id`          | `excluir`              | Roles(Role.ADMIN)                       |

## VendasController

Fonte: [apps/api/src/vendas/vendas.controller.ts](../apps/api/src/vendas/vendas.controller.ts).

| Método | Caminho                    | Operação no controller | Decorators de acesso explícitos         |
| ------ | -------------------------- | ---------------------- | --------------------------------------- |
| POST   | `/api/vendas`              | `criar`                | Política global e verificações do fluxo |
| POST   | `/api/vendas/:id/estornar` | `estornar`             | Roles(Role.ADMIN, Role.GESTOR)          |
| GET    | `/api/vendas`              | `listar`               | Política global e verificações do fluxo |
| GET    | `/api/vendas/:id`          | `obter`                | Política global e verificações do fluxo |

## WhatsAppController

Fonte: [apps/api/src/whatsapp/whatsapp.controller.ts](../apps/api/src/whatsapp/whatsapp.controller.ts).

| Método | Caminho                       | Operação no controller | Decorators de acesso explícitos |
| ------ | ----------------------------- | ---------------------- | ------------------------------- |
| GET    | `/api/whatsapp/status`        | `status`               | Roles('ADMIN')                  |
| POST   | `/api/whatsapp/test`          | `testSend`             | Roles('ADMIN')                  |
| POST   | `/api/whatsapp/reminder/test` | `testReminder`         | Roles('ADMIN')                  |

Total de declarações de rota nesta revisão: **195**.
