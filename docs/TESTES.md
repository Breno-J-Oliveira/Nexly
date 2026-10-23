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

## Como executar

```bash
npm test --workspace @nexly/api -- --runInBand dashboard
npm test --workspace @nexly/api -- --runInBand rotation-response recuperacao.service token.service
npm run typecheck:e2e
npx playwright test e2e/smoke/conversion.spec.ts e2e/smoke/dashboard-alerts.spec.ts --workers=1
```

O CI fornece PostgreSQL e Redis de teste, prepara schema, seed, builds e Chromium. Localmente, prepare as mesmas dependências e as variáveis das fixtures. As proteções dos scripts devem confirmar banco local ou descartável antes de cenários que alteram dados.

## Registro de evidências

Registre commit, data, ambiente, comando, resultado e eventual falha. Falha deve ser corrigida ou permanecer identificada como pendência. Capturas, traces, exports e relatórios vão para `test-results` ou os diretórios ignorados do Playwright, sem publicação de conteúdo de clientes.

Na revisão de 21–22/10/2026, passaram 14 testes de dashboard, 34 de recuperação/rotação/token e 28 cenários de navegador selecionados após correções. Dez verificações adicionais das páginas públicas em produção, em desktop e celular, confirmaram imagens e navegação sem erro de JavaScript. Esses números descrevem execuções daquela revisão, sem representar o tamanho permanente de toda a suíte.

O CI completo registrou 101 de 102 cenários aprovados antes de corrigir um seletor antigo: a seção de primeiros passos passou a exigir expansão. O cenário comercial corrigido passou localmente. Em 23/10, foi conferido também o resultado do workflow E2E do commit `7b82af9`: concluído com sucesso. Os testes da API e Semgrep desse commit também passaram; o audit das ferramentas permaneceu com falha. Consulte o [CI atual](https://github.com/Breno-J-Oliveira/Nexly/actions/workflows/ci.yml) para resultados de versões posteriores.

## Critérios de liberação

Identidade visual consistente, jornadas afetadas verificadas, regras financeiras e de estoque preservadas, isolamento e permissões respeitados, migrações coerentes, segredos ausentes do diff, build e verificações relevantes aprovados. A liberação comercial também depende das configurações externas descritas em [Operação](OPERACAO.md).
