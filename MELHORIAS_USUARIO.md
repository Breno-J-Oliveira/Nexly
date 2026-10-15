# Próximas 20 melhorias de experiência

As recomendações reais, presets e seleção persistida de recursos têm implementação própria nesta entrega. Esta lista organiza mais vinte evoluções propostas; os itens abaixo ainda não estão implementados.

| # | Melhoria | Resultado esperado | Prioridade |
|---|---|---|---|
| 1 | Checklist inicial por profissão | Guiar os primeiros cadastros até o primeiro atendimento | Alta |
| 2 | Cadastro de pessoa física com CPF/CNPJ opcionais por perfil | Facilitar a entrada de profissionais autônomos | Alta |
| 3 | Rascunho seguro do cadastro sem armazenar senhas | Retomar etapas sem perder dados | Alta |
| 4 | Terminologia configurável: cliente, paciente, tutor | Adaptar a linguagem da interface | Alta |
| 5 | Cadastro de animais vinculado ao tutor | Atender a rotina real de clínicas e petshops | Alta |
| 6 | Agenda com sessões recorrentes | Reduzir trabalho em consultas semanais | Alta |
| 7 | Reagendamento por arrastar com confirmação | Ajustar horários com segurança | Média |
| 8 | Lista de espera com preenchimento de vagas | Aproveitar cancelamentos | Média |
| 9 | Assistente de importação CSV com prévia | Migrar contatos sem duplicações silenciosas | Alta |
| 10 | Busca global em clientes, produtos e atendimentos | Encontrar registros sem navegar por vários módulos | Alta |
| 11 | Preferências pessoais de tabela e filtros | Preservar a forma de trabalho de cada pessoa | Média |
| 12 | Favoritos e atalhos pessoais | Acessar as rotinas mais usadas | Média |
| 13 | Histórico de alterações acessível no registro | Entender quem mudou dados e quando | Alta |
| 14 | Desfazer operações reversíveis | Recuperar-se de erros sem suporte | Média |
| 15 | Mensagens de erro com solução sugerida | Explicar como resolver conflitos, saldo e permissões | Alta |
| 16 | Notificações com preferências e horários de silêncio | Reduzir interrupções desnecessárias | Média |
| 17 | Painel de próximos atendimentos e pendências por papel | Dar foco ao trabalho diário | Alta |
| 18 | Central de ajuda contextual com exemplos curtos | Aprender funções durante o uso | Média |
| 19 | Visualização antecipada de mudanças nos módulos | Mostrar dependências antes de confirmar a configuração | Média |
| 20 | Modo de demonstração com dados fictícios isolados | Explorar funções sem alterar o negócio real | Alta |

Os presets organizam os módulos de gestão disponíveis. Funcionalidades clínicas, prontuário, prescrição ou tratamento de dados de saúde exigem projeto e controles específicos; o preset de psicologia ou veterinária não cria essas funcionalidades.

## Recomendações reais

O convite aparece após sete dias de conta e três dias distintos de uso. O usuário pode adiar por trinta dias, desativar o convite ou retirar a recomendação em Meu Nexly. Todas as notas são aceitas; o consentimento para publicação começa desmarcado.

Somente comentários de contas ativas, com consentimento e status aprovado, aparecem na landing. Alterações no texto voltam à revisão. Sem recomendações publicadas, a página mostra um estado vazio honesto.

A revisão é operacional, fora do painel de administradores das empresas:

```sh
node scripts/moderar-depoimentos.cjs listar
node scripts/moderar-depoimentos.cjs aprovar ID UPDATED_AT
node scripts/moderar-depoimentos.cjs rejeitar ID UPDATED_AT
```

Use o `updatedAt` da listagem como versão: uma alteração posterior impede aprovar um texto diferente daquele revisado. Execute no ambiente correto, com acesso de operador ao banco. Revise autenticidade, dados sensíveis e conteúdo abusivo, sem selecionar apenas avaliações positivas. O script não expõe e-mail, telefone ou dados internos na publicação.

## Deploy

A migration `20261014220000_workspace_recommendations` é aditiva, preserva os dados e mantém todos os módulos ativos para empresas existentes. Railway/Nixpacks e a imagem Docker aplicam migrations antes de iniciar a API. O banco de produção não foi acessado por esta implementação local. Verifique o deploy da API antes de promover o frontend.
