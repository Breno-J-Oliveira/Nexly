# Testar o Nexly localmente

Frontend: http://localhost:3002. API: http://localhost:3001/api/health.

Conta demo existente: `admin@nexly.com.br` / `nexly123`.

## Iniciar no Windows

Com dependências instaladas, `.env` local em ambos os apps, Prisma Client gerado e PostgreSQL/Redis ativos:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/start-local.ps1
```

O script confere que banco, cache e API apontam para localhost, compila shared/API e inicia os dois apps em background. Não aplica migrations, não executa seed e não altera produção. Portas ocupadas são preservadas. Logs ficam em `%TEMP%\nexly-local`; os PIDs aparecem no terminal e podem ser encerrados com `Stop-Process -Id <PID>`.

## Roteiro manual

1. Login, atualização da página, logout e novo login.
2. Cadastro: dados, negócio, acesso gratuito e revisão. Verificar validação e aceite; não há coleta de cartão.
3. Dashboard: navegação, busca de página, dados, estados de erro e tamanho mobile.
4. Agenda: criar atendimento, confirmar, concluir e conferir estoque dos insumos configurados.
5. PDV: vender produto, verificar total, saldo e histórico; tentar quantidade maior que o saldo.
6. Usar teclado nos formulários e modais: Tab, Shift+Tab, Escape e retorno de foco.

Os dados antigos do seed podem não gerar métricas no mês atual. Não foram substituídos; operações novas alimentam os indicadores.

## Validações automatizadas

```powershell
npm.cmd test --workspace @nexly/api -- --runInBand
node scripts/verify-local-security.cjs
npm.cmd run e2e -- e2e/smoke/auth-ui.spec.ts --workers=1
```

O teste de segurança cria duas empresas temporárias no banco local e remove somente suas fixtures. Nunca o execute apontando para produção. O E2E de baixa de estoque existente cria atendimento e consome insumos da conta demo; use uma cópia de teste se quiser preservar seus saldos.

## Escopo desta entrega

Inclui as primeiras correções de autenticação/autorização, escopo de queries, cadastro, PDV, dashboard e base visual. O plano completo continua em execução: RLS efetivo com role apropriada, consistência integral do atendimento, integrações reais e comparação de todas as telas ainda precisam de entregas próprias. A execução local não representa um deploy em produção.
