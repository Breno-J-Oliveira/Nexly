# Console administrativo do Nexly

Abra `/admin` com uma conta da equipe interna. O acesso exige uma concessão no
console e 2FA. A conta que administra um estabelecimento continua usando o painel
da própria empresa.

Para criar o primeiro proprietário, aplique as migrações, configure
`DATABASE_URL` para o ambiente desejado e execute o comando com o identificador
de um administrador ativo da empresa interna que já ativou o 2FA.

```sh
node apps/api/prisma/bootstrap-platform-owner.cjs --usuario <UUID>
```

## 40 melhorias do console

### Visão geral e empresas

1. Janela de 7, 14 ou 30 dias no gráfico de cadastros.
2. Comparação entre dias completos com variação absoluta e percentual.
3. Identificação do dia com mais cadastros.
4. Estado específico para períodos sem cadastros.
5. Exportação CSV da série diária em UTC.
6. Participação percentual de cada plano.
7. Atalho por plano para a lista de empresas filtrada.
8. Atalho para assinaturas que exigem atenção.
9. Horário da leitura das métricas e atualização manual.
10. Filtro de status da assinatura aplicado na API.
11. Ordenação global por antiguidade ou nome, nas duas direções.
12. Ação para limpar filtros de empresas.
13. Exportação da página de empresas com proteção contra fórmulas no CSV.
14. Faixa de resultados com recuperação quando o total muda.

### Equipe interna

15. Status efetivo de acesso, incluindo 2FA pendente e conta desativada.
16. Contadores de vínculos, acessos liberados e 2FA pendente.
17. Busca de membros por nome ou e-mail, com normalização de acentos.
18. Filtro de membros por papel.
19. Filtro de status com limpeza e contador de resultados.
20. Guia de entrada na equipe com atalho para Usuários.
21. Descrição das permissões de cada papel.
22. Indicação do 2FA no seletor de candidatos.
23. Confirmação de pausa e restauração, preservando o papel.
24. Prevenção concorrente de vínculos duplicados.
25. Exibição das datas de concessão e atualização do vínculo.

### Campanhas de assinatura

26. Busca exata por código em todas as páginas do provedor.
27. Filtro de status na página carregada.
28. Identificação de cupons expirados, esgotados e desativados.
29. Link com plano sugerido ao cliente.
30. Atalhos de percentual no formulário.
31. Atalhos de validade em dias, com opção para remover o prazo.
32. Estimativa da primeira cobrança para cada plano.
33. Barra de utilização para campanhas com limite.

### Operação da plataforma

34. Seção de operação restrita ao proprietário e à equipe de operações.
35. Consulta de PostgreSQL e Redis com tempo de resposta.
36. Indicador do ambiente e da configuração de cobrança.
37. Fila com totais de pendências, tarefas prontas, execução e falhas.
38. Agrupamento das falhas por tipo de tarefa, com dados agregados.
39. Versão, commit, tempo em execução e cópia do diagnóstico.
40. Links diretos para as seções, com navegação pelo histórico do navegador.

O diagnóstico do Stripe informa se o ambiente foi configurado. A validação de
cupons e pagamentos usa o provedor e deve ser ensaiada no Sandbox antes da
ativação comercial. [Configuração de pagamentos](PAGAMENTOS.md).

## Minha operação

Em `/admin#workspace`, o proprietário que também administra a empresa vinculada
pode acompanhar tarefas, prazos vencidos, contatos ativos e agendamentos dos
próximos sete dias no fuso da empresa. A aba permite criar tarefas e abrir os
módulos habilitados, como agenda, financeiro, estoque, documentos e usuários.
Os registros pertencem à empresa da conta autenticada.

### Dados de demonstração

Com a mesma `DATABASE_URL` usada no cadastro do proprietário, gere a prévia e
confira a empresa que receberá os dados. A opção `--aplicar` grava os registros.

```sh
node apps/api/prisma/seed-platform-workspace.cjs --usuario <UUID>
node apps/api/prisma/seed-platform-workspace.cjs --usuario <UUID> --aplicar
```

A carga inclui quatro tarefas e três contatos fictícios marcados com `[DEMO]`.
A reaplicação preserva registros e ajustes existentes. Os exemplos não enviam
mensagens ou geram cobranças.
