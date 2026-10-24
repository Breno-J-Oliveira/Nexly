# Plano de testes e critérios de aceite

## Objetivo e ambiente

Verificar se uma pessoa consegue operar o Nexly, se as regras preservam os registros e se cada empresa e perfil acessa somente os recursos permitidos. Jest verifica regras da API; Playwright percorre páginas e integrações locais. Fixtures reais usam banco de teste e limpeza ao final. Dublês de Google, Stripe e comunicação precisam estar identificados.

Não use banco de produção, credenciais live ou dados pessoais reais nas fixtures. Um teste aprovado prova o cenário e as condições executadas, sem garantir ausência de qualquer falha no sistema.

## Matriz GOT

A matriz organiza o **grupo**, a **operação** e o **teste esperado**, com identificadores para acompanhar revisão e evidência. Critérios descrevem comportamento esperado; não são resultados automaticamente aprovados.

| ID   | Grupo e operação          | Procedimento e resultado esperado                                                         |
| ---- | ------------------------- | ----------------------------------------------------------------------------------------- |
| CT01 | Cadastro e presets        | Percorrer cinco etapas; salvar módulos válidos e termos sem sobreposição de controles.    |
| CT02 | Validação                 | Enviar campos inválidos; erro associado ao campo e nenhuma gravação parcial indevida.     |
| CT03 | Login                     | Credenciais válidas abrem painel; inválidas não expõem dados ou senha.                    |
| CT04 | Sessão                    | Renovar token e repetir concorrência; preservar sessão válida e rejeitar reuso indevido.  |
| CT05 | Segundo fator             | Ativar TOTP; exigir desafio e impedir repetição de código consumido.                      |
| CT06 | Recuperação               | Sem provedor, informar indisponibilidade; com dublê, manter token cifrado e de uso único. |
| CT07 | Integridade criptográfica | Truncar tag AES-GCM para 4, 12 e 15 bytes; rejeitar antes da operação protegida.          |
| CT08 | Google                    | Validar token e vínculo; rejeitar declarações incorretas e associação sem prova local.    |
| CT09 | Isolamento                | Criar duas empresas; leitura e alteração de recurso alheio são recusadas.                 |
| CT10 | Perfis                    | Acessar rotas financeiras com recepcionista; não retornar dados financeiros.              |
| CT11 | Clientes                  | Criar, localizar, editar e consultar histórico sem perder contexto.                       |
| CT12 | Profissionais             | Atingir limite ativo do plano; nova ativação é recusada com retorno compreensível.        |
| CT13 | Agenda                    | Marcar horários sobrepostos para o mesmo profissional; impedir conflito.                  |
| CT14 | Fuso horário              | Usar instantes próximos à meia-noite; respeitar dia e expediente da empresa.              |
| CT15 | Atendimento               | Concluir serviço com insumos; registrar baixa e impedir duplicação por repetição.         |
| CT16 | Estoque                   | Executar operações concorrentes; preservar saldo e histórico de movimentos.               |
| CT17 | PDV                       | Finalizar venda e repetir solicitação; consistência entre itens, total e estoque.         |
| CT18 | Compras                   | Receber pedido; refletir entradas e valores segundo regras implementadas.                 |
| CT19 | Financeiro                | Filtrar período, liquidar parcialmente e consultar saldo sem dupla contagem.              |
| CT20 | Alertas                   | Excluir contas pagas/canceladas, incluir parciais e abrir período correto.                |
| CT21 | Comissões                 | Consultar histórico e alterações sem confundir cálculo com pagamento bancário.            |
| CT22 | Operação                  | Usar tarefas, filiais, documentos, recorrências e automações com permissão.               |
| CT23 | Importação                | Testar CSV, BOM, aspas, duplicados e estrutura inválida; rejeitar ambiguidades.           |
| CT24 | Exportação                | Respeitar empresa, permissão e cota; arquivo não é salvo na documentação pública.         |
| CT25 | Assinaturas               | No Sandbox, criar Checkout; mudança de plano depende de confirmação confiável.            |
| CT26 | Webhook                   | Repetir evento e assinatura inválida; idempotência e rejeição de adulteração.             |
| CT27 | Páginas públicas          | Logo e imagens carregam; suporte e cadastro têm destinos válidos.                         |
| CT28 | Carrosséis                | Percorrer 19 funcionalidades e cinco artigos por botões e teclado; sem mutações.          |
| CT29 | Responsividade            | Usar 320, 390 e 1440 px; sem colisão ou excesso de largura, inclusive no gráfico.         |
| CT30 | Recuperação de erro       | Simular falha de consulta; mostrar tentativa novamente sem derrubar a página.             |
| CT31 | Depoimentos               | Publicar somente relato real autorizado; não substituir falha por recomendação fictícia.  |
| CT32 | Backup                    | Cifrar dump e restaurar em banco descartável; conferir dados e salvaguardas.              |
| CT33 | PDV sob falha | Validar descontos, bloquear edição durante envio e repetir resposta perdida sem duplicar a venda. |
| CT34 | Catálogo e clientes do PDV | Distinguir falha de busca de lista vazia, recuperar consulta e encontrar cliente além dos 100 primeiros. |
| CT35 | Concorrência real | Disputar última unidade e mesmo horário; repetir venda e recebimento; conferir registros e saldos no PostgreSQL. |
| CT36 | Nomes extensos | Percorrer os 29 caminhos internos em 320 px e abrir detalhes; nomes sem espaços não ampliam a página. |
| CT37 | Consulta sem resposta | Manter conexão aberta sem resposta; sair do carregamento em até 20 segundos e recuperar a lista. |

## Como executar

```bash
npm test --workspace @nexly/api -- --runInBand dashboard
npm test --workspace @nexly/api -- --runInBand rotation-response recuperacao.service token.service
npm run typecheck:e2e
npx playwright test e2e/smoke/conversion.spec.ts e2e/smoke/dashboard-alerts.spec.ts --workers=1
npx playwright test e2e/smoke/pdv-resilience.spec.ts e2e/smoke/read-timeout.spec.ts e2e/smoke/transaction-stress.spec.ts e2e/smoke/system-traversal.spec.ts --workers=1
```

O CI fornece PostgreSQL e Redis de teste, prepara schema, seed, builds e Chromium. Localmente, prepare as mesmas dependências e as variáveis das fixtures. As proteções dos scripts devem confirmar banco local ou descartável antes de cenários que alteram dados.

Na bateria de 24/10, a concorrência foi exercitada contra uma API local e PostgreSQL descartável: 20 pedidos com a mesma chave criaram uma venda e uma saída de estoque; 12 disputas pela última unidade tiveram uma aprovação; 12 repetições de recebimento geraram uma baixa; oito pedidos para o mesmo horário criaram um agendamento. O acesso ao produto de outra empresa foi recusado. São testes de integridade sob concorrência limitada, não uma medição de capacidade máxima ou de múltiplas réplicas em produção.

Os dois cenários novos de PDV passaram após as correções, incluindo perda da resposta depois da gravação e busca entre 110 clientes. A passagem inicial pelas 29 rotas em 320 px encontrou excesso de largura em agenda, profissionais, serviços e PDV com nomes extensos. As correções e o cenário de recuperação de consulta fazem parte da nova bateria; sua execução final completa deve ser conferida no CI, sem confundir a compilação aprovada com aprovação dos testes de navegador.

## Registro de evidências

Registre commit, data, ambiente, comando, resultado e eventual falha. Falha deve ser corrigida ou permanecer identificada como pendência. Capturas, traces, exports e relatórios vão para `test-results` ou os diretórios ignorados do Playwright, sem publicação de conteúdo de clientes.

Na revisão de 21–22/10/2026, passaram 14 testes de dashboard, 34 de recuperação/rotação/token e 28 cenários de navegador selecionados após correções. Dez verificações adicionais das páginas públicas em produção, em desktop e celular, confirmaram imagens e navegação sem erro de JavaScript. Esses números descrevem execuções daquela revisão, sem representar o tamanho permanente de toda a suíte.

O CI completo registrou 101 de 102 cenários aprovados antes de corrigir um seletor antigo: a seção de primeiros passos passou a exigir expansão. O cenário comercial corrigido passou localmente. Em 23/10, foi conferido também o resultado do workflow E2E do commit `7b82af9`: concluído com sucesso. Os testes da API e Semgrep desse commit também passaram; o audit das ferramentas permaneceu com falha. Consulte o [CI atual](https://github.com/Breno-J-Oliveira/Nexly/actions/workflows/ci.yml) para resultados de versões posteriores.

## Critérios de liberação

Em 24/10/2026, foi conferido o [CI completo do commit fb5a66d](https://github.com/Breno-J-Oliveira/Nexly/actions/runs/40035495519): todos os jobs concluídos com sucesso, incluindo E2E, tipos, lint, API, containers e backup/restore. É uma evidência da versão anterior a esta revisão de cobrança; os testes da revisão atual devem ser registrados separadamente. O CI usa serviços de teste e não comprova saúde da API ou backup externo em produção.

Nesta revisão, a execução local com Node 24.22.1 aprovou 642 testes em 59 suítes da API. Após os ajustes finais de validação da fila, as quatro suítes afetadas foram repetidas: 66 testes aprovados. Também passaram typecheck API/web, lint API e da página de configurações, build da API, validação documental e regra contra SQL inseguro. Os novos casos de Stripe usam dublês, sem chamadas ou cobranças na conta real. Os testes de concorrência entre processos e transações reais devem ser complementados pela homologação do ambiente; as verificações unitárias não representam uma simulação completa de múltiplas instâncias.

Identidade visual consistente, jornadas afetadas verificadas, regras financeiras e de estoque preservadas, isolamento e permissões respeitados, migrações coerentes, segredos ausentes do diff, build e verificações relevantes aprovados. A liberação comercial também depende das configurações externas descritas em [Operação](OPERACAO.md).

## Homologação detalhada de assinaturas

| ID   | Operação                 | Procedimento e resultado esperado                                                           |
| ---- | ------------------------ | ------------------------------------------------------------------------------------------- |
| PG01 | Checkout aprovado        | No Sandbox, conferir plano, valor e ciclo; comprovar estado pela API e pelo Stripe.         |
| PG02 | Retorno forjado          | Abrir retorno de sucesso sem pagar; não conceder plano comercial.                           |
| PG03 | Cancelamento do checkout | Abandonar contratação; preservar ausência de assinatura paga.                               |
| PG04 | Cliques simultâneos      | Repetir contratação; reutilizar sessão aberta do mesmo plano e não duplicar assinatura.     |
| PG05 | Timeout                  | Simular interrupção após criação remota; recuperar tentativa com a mesma chave idempotente. |
| PG06 | Webhook adulterado       | Alterar corpo ou assinatura; rejeitar sem gravar evento ou plano.                           |
| PG07 | Evento repetido          | Reentregar evento válido; aplicar efeito uma única vez.                                     |
| PG08 | Evento antigo            | Enviar aviso antigo após cancelamento; consultar estado atual sem reativação indevida.      |
| PG09 | Ambiente incompatível    | Enviar evento de teste ao modo live; não alterar acesso comercial.                          |
| PG10 | Autorização              | Outro perfil ou empresa não administra vínculo de cobrança alheio.                          |
| PG11 | Oferta divergente        | Alterar preço, moeda, quantidade ou ciclo; rejeitar oferta não reconhecida.                 |
| PG12 | Fatura pendente          | Assinatura active com fatura não paga não concede acesso novo.                              |
| PG13 | Período vencido          | Fatura antiga paga não libera período já encerrado.                                         |
| PG14 | Cancelamento agendado    | Manter período pago válido e reconciliar FREE após encerramento confirmado.                 |
| PG15 | Aumento pendente         | Preservar plano anterior válido sem antecipar o novo antes do pagamento.                    |
| PG16 | Portal                   | Usar customer da empresa e origem fixa; conferir opções configuradas no provedor.           |
| PG17 | Cota e Redis             | Exceder dez chamadas por minuto; retornar 429; falha do Redis não autoriza operação.        |
| PG18 | Atualização manual       | Simular webhook ausente; ação autenticada recupera estado atual.                            |
| PG19 | Reconciliação agendada | Sem webhook, recuperar pagamento/cancelamento pela fila; em teste, não alterar plano live. |
| PG20 | Réplicas e retomada | Repetir varredura na mesma hora; mesma chave por empresa/ambiente; consultar mais de 100 vínculos e retomar após falha. |
| PG21 | Exclusão e cobrança | Recusar remoção com assinatura em andamento, checkout aberto, ambiente incorreto ou Stripe indisponível. |
| PG22 | Cancelamento do pedido | Revalidar pedido na transação; outro worker ou cancelamento pelo titular impede remoção duplicada/indevida. |

Os casos PG são critérios de homologação; esta edição documental não os marca como executados. Dublês de unidade não comprovam ativação da conta real, entrega externa do webhook ou recebimento bancário. Nunca usar credenciais de produção em teste local.
