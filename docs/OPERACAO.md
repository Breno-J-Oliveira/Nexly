# Operação e integrações

## Ambientes e publicação

O frontend publicado é <https://nexly-web.vercel.app>. A implantação configurada utiliza Vercel para web, Railway para API, Supabase para PostgreSQL e Redis como serviço complementar. A conexão do frontend com a API deve usar o endereço efetivo do ambiente; variáveis de compilação do Next.js precisam estar corretas antes do build.

1. Confira branch, commit e ambiente de destino.
2. Execute as verificações relevantes e revise as alterações de schema.
3. Garanta backup e estratégia de recuperação antes de migração relevante.
4. Publique a API, confira migrações, saúde e rotas da nova versão.
5. Publique o frontend e percorra os fluxos afetados.

`railway.json` configura build e inicialização da API. O script de produção aplica as migrações antes de iniciar. Um deploy marcado como Active comprova que uma versão está executando; compare o commit para identificar qual. Uma rota nova respondendo 404 pode indicar versão anterior ou endereço incorreto. Para rota protegida, 401 sem credencial confirma a barreira de autenticação, mas não valida a regra completa.

Confira `/api/health` e `/api/health/deep`. Endpoints de diagnóstico adicionais seguem as proteções definidas no controller. Evite publicar resultados de diagnóstico que revelem configuração ou credenciais.

## Incidentes de hospedagem

Se a plataforma informar pausa de deploys, confira o [status oficial do Railway](https://status.railway.com/). Excluir serviços ou deploys não resolve uma pausa imposta pela infraestrutura. Preserve a instância funcional e evite enfileirar repetidamente a mesma versão.

Em 21/10/2026, o Railway publicou um [comunicado de possível acesso indevido a variáveis de ambiente](https://blog.railway.com/p/security-disclosure-wednesday-october-21st). O provedor recomendou substituição das credenciais armazenadas. Isso não comprova impacto específico no Nexly. A situação atual deve ser verificada no provedor; esta documentação não declara o incidente resolvido nem as chaves do Nexly já substituídas.

Para responder, inventarie nomes de segredos configurados, identifique cada provedor, prepare credenciais novas com menor privilégio, atualize os consumidores e valide o funcionamento. Aplique a revogação conforme a urgência e a possibilidade de exposição. Quando a publicação estiver bloqueada, considere explicitamente o risco de manter a credencial e o impacto de indisponibilidade; não suponha que salvar uma variável atualize um container em execução. Nunca copie os valores para esta documentação.

## Google

Configure um cliente OAuth Web e suas origens JavaScript autorizadas, como `http://localhost:3002` e o domínio público efetivamente utilizado. A API usa `GOOGLE_CLIENT_ID`; vazio desativa o provedor conforme configuração. O fluxo atual utiliza Google Identity Services e valida ID token no backend; não requer inventar um callback OAuth de outro projeto.

Conta nova continua o cadastro do negócio. Conta existente utiliza o fluxo de vinculação protegido. Testes automatizados com dublês não substituem a autorização real do proprietário no provedor. Consulte o [guia oficial de validação](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

## Assinaturas Stripe

O Stripe recebe o pagamento dos planos do Nexly. A API cria Checkout e Portal; o webhook e a reconciliação confirmam o estado comercial. A página de retorno não comprova, por si só, uma assinatura paga.

| Configuração                                                | Finalidade                                               |
| ----------------------------------------------------------- | -------------------------------------------------------- |
| `STRIPE_ENABLED`                                            | Habilita a integração quando a configuração está válida. |
| `STRIPE_MODE`                                               | Separa teste e produção.                                 |
| `STRIPE_RESTRICTED_KEY` e `STRIPE_WEBHOOK_SECRET`           | Credenciais do ambiente de teste.                        |
| `STRIPE_LIVE_RESTRICTED_KEY` e `STRIPE_LIVE_WEBHOOK_SECRET` | Credenciais de produção, somente no backend.             |
| `STRIPE_RETURN_ORIGIN`                                      | Origem de retorno permitida; HTTPS em produção.          |

Cadastre o endpoint `/api/assinaturas/webhook` no ambiente correspondente e atribua somente as permissões necessárias à integração. Os IDs e preços esperados estão no catálogo do backend. Não reutilize chaves live no localhost para contornar o bloqueio de ambiente. Confirme contratação, webhook, troca e cancelamento no Sandbox antes de operação comercial; teste real envolve autorização e cobrança efetiva.

O recebimento bancário depende da conta Stripe ativada, dados bancários e verificações do responsável. Dados pessoais e financeiros do titular não pertencem ao repositório.

## E-mail e WhatsApp

O envio de e-mails permanece desativado por decisão do responsável até configurar provedor e remetente. Para Resend, são necessários `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM`, `PUBLIC_APP_URL` e `EMAIL_QUEUE_KEY`. A chave da fila tem 32 bytes representados em 64 caracteres hexadecimais e deve ser gerada com fonte criptográfica. Não trocar a chave sem avaliar mensagens pendentes cifradas com a anterior.

Recuperação de senha deve informar indisponibilidade quando o envio não foi configurado. Não prometer que o e-mail chegou antes de confirmação aplicável. WhatsApp inicia desativado no exemplo; provedores opcionais exigem configuração e homologação. Preparar contato manual em marketing não significa envio automático ativo.

## Backup e recuperação

O projeto fornece `scripts/backup-db.sh`, `scripts/restore-test.sh` e workflow agendado. O backup usa `pg_dump`, cifra o arquivo com GPG/AES-256 e pode enviá-lo a armazenamento compatível com S3. Restauração de teste é separada da produção e possui proteção de nome de banco.

Configure no GitHub os secrets exigidos pelo workflow: URL de backup, senha de cifra e acesso ao armazenamento. Use bucket privado, retenção definida e acesso restrito. Os agendamentos estão no próprio [backup.yml](../.github/workflows/backup.yml). Existência do script não comprova que o backup externo de produção esteja ativo ou que a restauração mais recente tenha sido bem-sucedida.

Valide recuperação em banco descartável, registre data e resultado sem dados pessoais e confirme que os registros restaurados são consistentes. Não execute restauração sobre o banco publicado como teste.

Em 25/10/2026, a [verificação agendada](https://github.com/Breno-J-Oliveira/Nexly/actions/runs/40192752840) falhou por ausência de `BACKUP_S3_BUCKET`; o job semanal de restauração também falhou. Configure o armazenamento e os demais secrets exigidos e execute backup, verificação e restauração em banco de teste antes de considerar o backup operacional. O sucesso dos testes de scripts no CI não substitui essa validação externa.

## Suporte e prontidão comercial

Contato público autorizado: **breno.emailsenai@gmail.com**. Antes de abrir o serviço, confirme atendimento desse canal, identificação do responsável, condições comerciais, termos, privacidade, testes de recebimento e cancelamento, backup restaurável e acompanhamento de um piloto. Pendências externas devem ser acompanhadas operacionalmente; não marcar como concluídas apenas porque há uma tela implementada.

## Detalhamento de cobrança

O [guia de pagamentos](PAGAMENTOS.md) detalha configuração test/live, permissões, eventos, reconciliação, renovação, troca, cancelamento, recebimento e diagnóstico. A atualização de variáveis exige reinício ou nova publicação da API. Monitore webhooks e a fila `ASSINATURA_RECONCILIAR`: a conferência horária ajuda a recuperar eventos perdidos, mas depende das integrações disponíveis.

## Liberação comercial — revisão de 24/10/2026

A tela enviada pelo responsável confirmou `Your trial has expired` e `Service offline` no Railway. Esse bloqueio é da conta, não prova incidente geral nem erro no código atual. A decisão foi manter a API no Railway com plano pago; a ativação ainda precisa ser confirmada. Excluir deploys não renova o período de teste.

Antes de vender, concluir esta sequência com evidências do ambiente publicado:

| Etapa | Evidência necessária | Responsável pela ação externa |
| --- | --- | --- |
| Publicação da API | Último commit da main Active; `/api/health/deep` com HTTP 200 e banco/Redis saudáveis; `/api/health/version` com Node corrigido e commit esperado | Titular ativa o plano; manutenção confere deploy e logs |
| Credenciais | Substituição das credenciais expostas ao Railway, atualização de todos os consumidores e revogação das anteriores; rotação de chaves de cifra exige preservar dados existentes | Titular nas contas dos provedores |
| Conta de usuário | Cadastro, login por senha/Google, logout, renovação, dois fatores e acesso por perfis testados no domínio publicado | Manutenção e conta de piloto |
| Recuperação de acesso | Provedor de e-mail e remetente verificados; entrega real e redefinição de senha testadas | Titular configura remetente; envio permanece desativado até isso |
| Assinaturas | Checkout, webhook, renovação recusada/recuperada, troca e cancelamento homologados no Sandbox; preços e portal live conferidos separadamente | Manutenção e titular no Stripe |
| Recebimento | Conta Stripe habilitada, verificações e destino bancário corretos | Titular no Stripe; testes automatizados não comprovam repasse |
| Backup | Backup externo recente cifrado e restauração comprovada em banco descartável | Titular fornece armazenamento; manutenção executa verificação |
| Condições comerciais | Identificação pública do responsável, termos, privacidade, cancelamento, suporte e obrigações fiscais definidos e revisados | Titular e profissionais responsáveis |
| Piloto | Uma empresa percorre agenda → atendimento → estoque, PDV → financeiro, equipe/permissões e exportação; divergências registradas e resolvidas | Titular seleciona negócio piloto |

O endpoint de versão inclui `commit` quando o Railway fornece `RAILWAY_GIT_COMMIT_SHA` válido; caso contrário retorna `null`. Isso evita confundir deploy antigo com o código recém-publicado. Uma revisão automatizada aprovada não declara a operação comercial liberada enquanto estas dependências estiverem pendentes. A documentação acadêmica em Word permanece sob controle do autor e não foi alterada nesta revisão.
