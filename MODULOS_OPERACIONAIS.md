# Módulos operacionais

Em **Meu Nexly**, o administrador ativa os recursos. Administradores e gestores podem operar os seis módulos; os demais papéis continuam com suas permissões existentes. Desativar um módulo oculta seu acesso e preserva dados. Desativar Automação também suspende a geração de novas tarefas.

| Recurso | Como usar | Alcance desta versão |
|---|---|---|
| Marketing | Registre a autorização do cliente e sua origem/data; crie uma campanha ativa e prepare os contatos | Abre WhatsApp para revisão/envio manual. Aceita `{nome}`. Nenhum disparo automático, integração de e-mail ou confirmação de entrega |
| Tarefas | Crie uma atividade, informe prazo, prioridade, responsável e filial; atualize a situação | Filtros por situação/filial, edição e exclusão com confirmação |
| Recorrências | Escolha cliente, profissional, serviço, início, intervalo e quantidade; confira a prévia | De 2 a 24 agendamentos, criação atômica e conflitos bloqueados. Cancelar futuros preserva concluídos e histórico |
| Automação | Configure uma tarefa periódica, o responsável e a primeira execução | A API verifica a cada minuto. Após indisponibilidade, gera uma tarefa e avança o ciclo; não acumula todas as atrasadas. Pode pausar na edição |
| Filiais | Cadastre nome, endereço e telefone; vincule tarefas ao local | Unidades operacionais da mesma empresa, com inativação. Agenda, financeiro e estoque são compartilhados; não há isolamento contábil ou estoque por filial |
| Documentos | Escreva um texto, categoria e título; edite ou visualize para imprimir/PDF | Texto com versão e proteção contra edição obsoleta. PDF pelo navegador, inclusive várias páginas. Sem upload, assinatura digital ou histórico completo de versões |

As séries usam intervalos exatos de dias de 24 horas; a prévia mostra datas no horário do navegador. Mudanças de fuso/horário de verão podem alterar o horário local. Automações usam o instante escolhido e o mesmo intervalo de 24 horas.

A lista usa páginas de 50 registros. A busca de clientes retorna até 100 por vez; cadastros auxiliares de equipe, profissionais, serviços e filiais ativas retornam até 200.

## Dados e segurança

Referências são validadas na empresa autenticada. Consentimento de marketing exige booleano explícito e evidência; revogação remove o cliente das próximas preparações. Desativação/anonimização de clientes impede sua inclusão. Links de WhatsApp já abertos ou copiados não podem ser recolhidos.

Reservas individuais, públicas e séries compartilham trava transacional por profissional. Automações têm atualização condicional e chave única por ocorrência para evitar duplicidade entre réplicas. Documentos são renderizados como texto, sem executar HTML inserido.

As novas tabelas recebem RLS nas migrations, além do escopo de empresa na aplicação. Como na arquitetura existente, o proprietário do banco pode contornar RLS; use credenciais restritas fora da API e não exponha conexão privilegiada ao navegador.

## Deploy e validação

Migrations aditivas: `20261014230000_operational_modules` e `20261014231000_operational_rls`. Não ativam automaticamente recursos em empresas existentes. Os comandos de deploy da API já executam `prisma migrate deploy` antes da inicialização. Publique a API antes de disponibilizar o frontend atualizado.

Verificação local de integração (recusa bancos remotos):

```sh
node scripts/verify-operations.cjs
```

O teste cria duas empresas descartáveis, testa permissões/isolamento, consentimento, versões, filtros, conflitos e concorrência; espera até 75 segundos pelo scheduler real e remove suas fixtures. O navegador é coberto por `e2e/smoke/operations.spec.ts`.

## Arquivos principais e verificação

- Backend: `apps/api/src/operacoes/`, schema e duas migrations em `apps/api/prisma/`, trava compartilhada da agenda, escopo de empresa, auditoria e exportação/anonimização LGPD.
- Interface: `apps/web/src/components/operations/`, seis páginas do dashboard, menu, ícones, seletor de módulos e estilos de impressão.
- Contrato: `packages/shared/src/workspace.ts`; validação: `scripts/verify-operations.cjs`, testes da API e `e2e/smoke/operations.spec.ts`.

Validação local desta entrega: 219 testes da API, 56 verificações de integração e 10 testes de navegador aprovados. Builds API/web e schema Prisma válidos. Nenhum erro de lint; o frontend mantém 11 avisos anteriores à entrega. Componentes novos sem avisos. Deploy de produção não verificado.
