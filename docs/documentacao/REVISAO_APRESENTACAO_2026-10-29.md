# Revisão local para apresentação do Nexly

Data: 29/10/2026. Ambiente: Windows, Node.js 24.22.1, aplicação local nas portas 3002 e 3001, PostgreSQL e Redis locais. Pasta recebida sem metadados Git; não foi atribuído hash de commit.

O login demonstrativo e o painel funcionaram no navegador. O diagnóstico `/api/health/deep` confirmou API, banco e Redis saudáveis após a retomada. Os resultados abaixo sustentam os cenários executados, sem garantir ausência de outros defeitos nem homologação do ambiente publicado.

## Correções realizadas

- `scripts/check-local-env.cjs` agora reutiliza `check-node-version.cjs`. Antes, o iniciador aceitava versões que instalação e build rejeitavam, incluindo Node 24.15.0 e versões principais fora da faixa suportada.
- `e2e/unit/local-runtime.spec.ts` registra a regressão. O teste de rejeição falhou antes da correção; os dois cenários passaram depois, incluindo aceitação de versões suportadas e rejeição das incompatíveis.
- README corrigido de 39 para 41 modelos Prisma e de Node 24.15.0 para a faixa `>=24.22.1 <25`.
- `.gitignore` recebeu exceção para o nome real do Word principal e para os documentos desta revisão. Isso permite versioná-los em um checkout Git, sem efetuar publicação automática.
- Criado `scripts/audit-documentation.py` para inventariar texto, tabelas e imagens incorporadas nos arquivos Word, sem alterá-los.

## Resultados dos testes

- API: **655 testes aprovados em 60 suítes**, em 183,506 segundos. Comando executado: `node node_modules/jest/bin/jest.js --config apps/api/jest.config.js --runInBand`. Resultado confirmado na saída da execução. O log foi criado inicialmente no diretório de resultados que o Playwright limpa; o resumo foi preservado na conversa e aqui, sem recriar um log original inexistente.
- Regras comerciais com banco real: **44 verificações aprovadas** por `node scripts/verify-commercial.cjs`. Incluem transferências, idempotência, perfis, isolamento entre empresas, validação, paginação e recuperação de senha com envio desativado. As fixtures são próprias e locais.
- Campanha selecionada de navegador e utilitários: **22 de 23 testes aprovados**. O cenário restante foi interrompido por `ENOSPC` ao salvar screenshot. O registro inicial permanece em `output/investor-review/browser-tests.log` e `browser-results.json`.
- Repetição do cenário interrompido: **1 aprovado em 2,0 minutos**. `system-traversal.spec.ts` percorre os módulos em 320 px, com nomes longos, confere largura, diálogos, relatórios, erros JavaScript e respostas de API 5xx. Registro: `output/investor-review/traversal-retest.log`; capturas em `test-results/manual/`.
- Regressão do iniciador: **2 testes aprovados** após a correção, em 4,4 segundos. Registros: `output/investor-review/runtime-before.log` e `runtime-after.log`.
- Verificações TypeScript da API, web e E2E executadas sem erros nesta revisão. O verificador documental confirmou rotas e modelos sincronizados.

Os totais de API, verificações comerciais, navegador e regressão são grupos diferentes; não devem ser somados como uma única suíte. A campanha de navegador selecionou PDV, configurações não salvas, baixa de estoque, concorrência, varredura de telas e testes de utilitários. Não foi executado todo o diretório de testes de navegador.

## Documentação e imagens

O Word principal contém 484 parágrafos de corpo, cinco tabelas e 13 imagens incorporadas. O plano de testes contém 236 parágrafos de corpo, 16 tabelas e nenhuma imagem incorporada. As contagens de parágrafos excluem os parágrafos internos das tabelas.

Foram identificadas divergências sobre o limite Empresarial, reconciliação periódica de assinaturas, quantidade de etapas do cadastro, resultados antigos e caminhos de evidências inexistentes nesta cópia. O checklist detalha cada uma e relaciona as figuras por legenda e nome interno da imagem.

O inventário e as folhas de contato estão em `output/investor-review/documentacao/`. Os arquivos Word originais e as imagens de divulgação não foram substituídos. A troca por capturas atuais, atualização de campos e inspeção do PDF continuam como tarefas explícitas no checklist.

Não foi possível renderizar o documento completo porque LibreOffice não está instalado. Portanto, a paginação e a conformidade visual do PDF final não foram validadas. A revisão realizada cobre texto, tabelas, referências locais e inspeção das imagens extraídas.

## Limites para a apresentação

Usar a demonstração local já validada. Publicação em nuvem, Google real, entrega de e-mail/WhatsApp, cobrança e recebimento Stripe e restauração de backup externo exigem evidências próprias. As integrações de comunicação e cobrança permanecem desativadas no ambiente local.

A máquina ficou sem espaço na primeira campanha. Após a liberação feita pelo usuário, havia aproximadamente 3,5 GB livres e o cenário interrompido passou. Não houve remoção de arquivos pessoais. A revisão automática bloqueou a tentativa de remover uma cópia adicional de Chromium; a ação não foi executada.

Consulte `CHECKLIST_FINALIZACAO.md` para preparar imagens, Word, PDF, evidências e roteiro da apresentação.
