# Pagamentos e assinaturas do Nexly

## Objetivo e conceitos

Esta integração cobra pelo uso do próprio Nexly. A empresa contrata um plano e paga uma mensalidade recorrente pelo Stripe. O PDV registra as vendas do negócio aos seus clientes; registrar uma venda não inicia uma cobrança no Stripe nem faz repasse bancário ao estabelecimento. Não há fluxo de marketplace ou divisão de pagamentos nesta integração.

Checkout é a página de contratação hospedada pelo Stripe. Customer é o cadastro de cobrança associado à empresa. Subscription é a assinatura recorrente; Invoice é a fatura de um período. Webhook é uma notificação enviada pelo provedor ao backend. Reconciliação é a consulta ao estado atual do Stripe para atualizar os registros locais. Payout é o envio do saldo disponível da conta Stripe à conta bancária do responsável.

## Catálogo e limites comerciais

| Plano        | Código     | Mensalidade em reais | Profissionais ativos                  |
| ------------ | ---------- | -------------------- | ------------------------------------- |
| Gratuito     | FREE       | R$ 0                 | 1                                     |
| Essencial    | BASIC      | R$ 49                | 2                                     |
| Profissional | PRO        | R$ 99                | 10                                    |
| Empresarial  | ENTERPRISE | R$ 199               | Sem limite comercial de profissionais |

O [catálogo do backend](../apps/api/src/assinaturas/catalogo.ts) define os preços aprovados e mantém identificadores separados para teste e produção. Os [limites compartilhados](../packages/shared/src/plans.ts) definem as cotas de profissionais ativos. Ausência de limite comercial de profissionais não significa ausência de limites de infraestrutura, uso ou segurança.

O catálogo implementado é mensal, em BRL. O checkout não configura período de teste gratuito, cobrança anual, cupom ou cálculo automático de impostos. Não anunciar essas condições como disponíveis sem implementação e configuração correspondentes. O plano gratuito é uma modalidade de acesso, não uma assinatura Stripe de valor zero.

## Contratação passo a passo

1. O administrador autenticado abre a página de assinatura e escolhe um plano pago.
2. O frontend envia apenas o código do plano para a API. Preço, moeda, empresa e endereço de retorno são definidos ou conferidos no servidor.
3. A API consulta o preço no Stripe e exige oferta ativa, ambiente correto, valor exato em centavos, moeda BRL e recorrência mensal de um mês.
4. A empresa recebe um vínculo de cobrança. O servidor verifica assinaturas existentes antes de abrir uma contratação e utiliza trava transacional para serializar operações concorrentes.
5. O Stripe recebe os dados de pagamento em sua própria página. O Nexly recebe a URL da sessão, sem precisar armazenar o número completo do cartão.
6. Após a tentativa, o comprador retorna a `/assinatura`. O parâmetro `retorno=sucesso` é apenas navegação, sem autoridade para liberar recursos pagos.
7. O webhook assinado ou a atualização autenticada consulta a assinatura atual no Stripe. Somente as condições comerciais confirmadas permitem atualizar o plano de produção.

Se houver uma sessão aberta para o mesmo plano, ela é reutilizada. Ao escolher outro plano, uma sessão aberta anterior é expirada antes da nova. Uma sessão já concluída gera aviso para aguardar confirmação. Assinatura em andamento encaminha o usuário ao gerenciamento, evitando uma segunda contratação independente.

## Quando o acesso pago é liberado

O serviço exige assinatura `active`, ausência de pausa de cobrança, período ainda vigente e fatura atual `paid`. A oferta precisa corresponder a um único item, com quantidade um, e a um preço reconhecido no catálogo. Uma atualização pendente possui uma exceção restrita para preservar o plano anterior já pago e ainda vigente; isso não libera o aumento antes do pagamento.

| Situação consultada no Stripe                               | Regra aplicada pelo Nexly                                                  |
| ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| Active, fatura paga e período vigente                       | Reconcilia o plano contratado.                                             |
| Cancelamento agendado, mantendo as condições pagas          | Mantém o plano até o encerramento confirmado e informa a data.             |
| Trialing, incomplete, past_due, unpaid ou paused            | O estado isolado não concede plano pago; a regra exige as condições acima. |
| Fatura não paga ou período vencido                          | A reconciliação não mantém o plano pago.                                   |
| Assinatura cancelada ou ausente após vínculo anterior       | Reconcilia para FREE.                                                      |
| Mais de uma assinatura em andamento ou paginação incompleta | Interrompe a reconciliação por conflito, exigindo revisão.                 |
| Preço, quantidade ou ambiente incompatível                  | Rejeita a alteração, sem conceder acesso pelo evento.                      |

No ambiente test, a assinatura de teste é registrada, mas não altera `Empresa.plano` de produção. A gravação do plano comercial da empresa ocorre somente no modo live. Assim, homologar um pagamento fictício não equivale a comprar acesso comercial.

O estado local depende de webhooks entregues ou de atualização autenticada bem-sucedida. Este módulo não possui um agendamento próprio de reconciliação periódica de todas as assinaturas. Monitorar falhas de entrega é necessário: indisponibilidade prolongada pode deixar o estado local desatualizado. A documentação descreve a regra ao reconciliar, sem prometer expiração automática independente desses mecanismos.

## Renovação, troca e cancelamento

A renovação recorrente é processada pelo Stripe. O Nexly acompanha eventos de assinatura e fatura e consulta o estado atual antes de alterar o acesso. Falha de pagamento não deve ser tratada como renovação concluída.

O botão de gerenciamento cria uma sessão do Customer Portal para o customer da empresa autenticada. A configuração do portal é selecionada por ambiente no catálogo. Alteração de plano, forma de pagamento, faturas e cancelamento dependem das opções efetivamente habilitadas nessa configuração do Stripe.

Upgrade, downgrade, cobrança proporcional e momento de cancelamento precisam ser conferidos no portal e homologados com a configuração real da conta. O backend não cria aqui uma regra universal de proporcionalidade nem garante crédito, estorno ou carência. A [documentação oficial do portal](https://docs.stripe.com/customer-management) explica as opções do provedor. Reembolsos e disputas exigem tratamento operacional no Stripe; não existe endpoint próprio de reembolso neste controller.

Uma redução de plano diminui a cota comercial. Não excluir dados, profissionais ou histórico para simular o ajuste: conferir a cota apresentada e a regra de criação/reativação antes de aceitar novos profissionais. O contato de suporte é **breno.emailsenai@gmail.com**.

## Configuração dos ambientes

| Variável no backend        | Uso                                                       |
| -------------------------- | --------------------------------------------------------- |
| STRIPE_ENABLED             | Deve ser true para ativação explícita.                    |
| STRIPE_MODE                | test ou live; outro valor não ativa o gateway.            |
| STRIPE_RESTRICTED_KEY      | Chave restrita do ambiente de teste.                      |
| STRIPE_WEBHOOK_SECRET      | Segredo do endpoint ou listener de teste.                 |
| STRIPE_LIVE_RESTRICTED_KEY | Chave restrita de produção, com prefixo rk_live_.         |
| STRIPE_LIVE_WEBHOOK_SECRET | Segredo do endpoint de produção.                          |
| STRIPE_RETURN_ORIGIN       | Origem confiável usada nos retornos de Checkout e Portal. |

As variáveis são verificadas ao instanciar o gateway; reinicie ou publique a API após alterá-las. Nunca use prefixo NEXT_PUBLIC para credenciais do Stripe. Não envie valores ao Git, a logs, prints ou chamados. A configuração incompleta deixa o gateway indisponível; isso explica botões bloqueados sem significar necessariamente defeito visual.

Teste permite chave de teste e HTTP apenas em localhost. Prefira chave restrita, ainda que o validador também aceite chave secreta de teste. Produção exige `NODE_ENV=production`, modo live, chave restrita live e origem HTTPS remota, sem usuário ou senha na URL. Uma chave live em localhost não deve ser utilizada para contornar essas proteções.

As operações atuais exigem consulta a Prices, criação de Customers, consulta de Subscriptions, criação/consulta/expiração de Checkout Sessions e criação de sessões do Billing Portal. Configure uma chave restrita que permita essas chamadas e valide no Sandbox. A nomenclatura exata dos escopos pode variar no painel; não conceder acesso total para resolver um erro sem identificar a chamada negada. A verificação criptográfica do webhook usa seu segredo próprio.

IDs públicos de preços e de configuração do portal não são chaves secretas, mas pertencem ao catálogo aprovado. Ao trocar de conta Stripe ou recriar a oferta, atualize os identificadores correspondentes e homologue novamente. O botão não cria um novo catálogo automaticamente.

## Webhook, segurança e repetição

Cadastre no ambiente correspondente um endpoint HTTPS da API em `/api/assinaturas/webhook`. A URL é da API publicada, não do frontend Vercel. O handler precisa receber os bytes originais do corpo e o cabeçalho `stripe-signature`; transformar o JSON antes da validação invalida a assinatura.

O serviço reconhece eventos `customer.subscription.*`, além de `invoice.paid`, `invoice.payment_failed`, `checkout.session.completed`, `checkout.session.async_payment_succeeded` e `checkout.session.async_payment_failed`. Na configuração do destino, selecione os eventos de assinatura relevantes e esses eventos de fatura e checkout. Eventos não tratados são confirmados sem alterar o plano.

Após validar a assinatura, o servidor rejeita ambiente incompatível e eventos de conta conectada. O customer é localizado no vínculo persistido da empresa; metadata enviada pelo comprador não escolhe o beneficiário. Eventos para customer sem vínculo compatível são ignorados.

A tabela `EventoStripe` registra os eventos processados na mesma transação da reconciliação. A trava da linha da assinatura e a chave idempotente persistida do checkout protegem tentativas concorrentes e recuperação após timeout. Um evento antigo consulta o estado atual do Stripe; não restaura cegamente o plano descrito no payload antigo. Essa estratégia complementa as recomendações oficiais sobre [assinaturas de webhooks](https://docs.stripe.com/webhooks/signature).

## API e permissões

| Método e rota                          | Acesso e finalidade                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| GET /api/assinaturas                   | ADMIN autenticado: disponibilidade, modo, plano, estado, período e catálogo resumido. |
| POST /api/assinaturas/checkout         | ADMIN: recebe plano BASIC, PRO ou ENTERPRISE e retorna a URL do checkout.             |
| POST /api/assinaturas/portal           | ADMIN: retorna URL temporária para gerenciar a assinatura vinculada.                  |
| POST /api/assinaturas/atualizar-status | ADMIN: consulta o estado atual do provedor e retorna a situação reconciliada.         |
| POST /api/assinaturas/webhook          | Sem sessão de usuário; exige assinatura Stripe válida sobre o corpo original.         |

Checkout, portal e atualização compartilham cota distribuída de dez operações por minuto por empresa. Indisponibilidade do Redis impede a validação da operação; exceder a cota resulta em 429. Nunca aceitar ID de outra empresa enviado pelo navegador para definir o vínculo. O [controller](../apps/api/src/assinaturas/assinaturas.controller.ts), o [serviço](../apps/api/src/assinaturas/assinaturas.service.ts) e o [gateway](../apps/api/src/assinaturas/stripe.gateway.ts) são as referências executáveis.

## Como o responsável recebe o dinheiro

O pagamento de uma mensalidade é processado na conta Stripe configurada para o Nexly. O responsável precisa concluir a ativação comercial e as verificações solicitadas pelo provedor, cadastrar uma conta bancária elegível e acompanhar o saldo e os repasses no Dashboard Stripe.

Há diferença entre pagamento aprovado, saldo pendente, saldo disponível e repasse ao banco. O prazo de disponibilização e a frequência dos repasses dependem do país, meio de pagamento, configuração e verificações da conta. Não prometer saque imediato ou prazo fixo ao cliente. A [orientação oficial de recebimentos](https://docs.stripe.com/payouts) e a página de [saldo e liquidação](https://docs.stripe.com/payments/balances) explicam essa distinção.

Consulte no painel o detalhamento do pagamento, as taxas aplicáveis, eventuais reembolsos ou disputas e o status do repasse. Compare o valor líquido com o extrato bancário e os relatórios da conta. Uma assinatura ativa no Nexly não comprova que o repasse bancário já foi concluído. Sandbox não movimenta dinheiro real; dados bancários e documentos pessoais não pertencem à documentação pública.

Emissão fiscal e regras tributárias exigem definição com o responsável contábil. Esta integração não configura Stripe Tax automaticamente nem transforma uma fatura Stripe em comprovação de emissão de nota fiscal brasileira.

## Homologação e resolução de problemas

Em ambiente isolado de teste, valide contratação, retorno cancelado, repetição de clique, timeout, webhook adulterado, evento repetido, evento antigo, pagamento pendente, renovação, cancelamento e troca de plano. Confira o estado no Stripe, na API e na interface; não use apenas o texto exibido na tela como evidência. A [matriz de testes](TESTES.md) detalha os critérios e identifica testes com dublês.

| Sintoma                                           | O que conferir                                                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Botão indisponível                                | ADMIN, configuração válida, modo, origem, reinício da API e eventual vínculo de outro ambiente.       |
| Checkout recusa oferta                            | Preço ativo, catálogo correto da conta, BRL, valor e recorrência mensal.                              |
| Retornou com sucesso, plano não mudou             | Ambiente, pagamento/fatura, entrega do webhook e atualização autenticada.                             |
| 400 no webhook                                    | Segredo do destino, assinatura, corpo bruto e ambiente do evento.                                     |
| 409 na contratação                                | Assinatura em andamento, sessão concluída, vínculo incompatível ou conflito que requer reconciliação. |
| 429 ou indisponibilidade temporária               | Cota por empresa, Redis e conectividade com o Stripe.                                                 |
| Cliente pagou, dinheiro ainda não chegou ao banco | Saldo disponível, dados bancários, pendências da conta e estado do payout no Stripe.                  |

Para suporte, registre data, commit, ambiente, rota, código HTTP e identificadores estritamente necessários em canal privado. Não registrar cartões, chaves ou URLs temporárias de gerenciamento. Nenhuma cobrança real, reembolso ou alteração bancária foi executada para produzir este guia.
