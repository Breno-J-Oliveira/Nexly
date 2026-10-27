# Produto e experiência de uso

O Nexly reúne agenda, atendimento, estoque e vendas para pequenos negócios. Uma empresa configura seus serviços, profissionais e materiais; ao concluir um atendimento, o sistema registra o consumo dos insumos vinculados. Assim, quem atende não precisa lançar novamente cada material utilizado.

O produto atende segmentos como salões, barbearias, clínicas, petshops e estúdios. Os presets são configurações iniciais de módulos e linguagem, ajustáveis em Meu Nexly. Escolher um preset não transforma o produto em prontuário médico nem habilita automaticamente integrações externas.

## Cadastro e primeiro acesso

O cadastro distribui as informações em quatro etapas, incluindo dados da conta e do negócio, escolha de recursos e aceite das condições. As dependências dos módulos são consideradas: a agenda, por exemplo, utiliza clientes, profissionais e serviços. A preferência de plano acompanha a navegação; uma escolha na interface não confirma pagamento nem concede plano pago.

Depois do acesso, o painel oferece indicadores, agenda do dia e pendências. Atalhos e primeiros passos ficam em uma seção expansível, para preservar espaço. Meu Nexly permite rever a configuração inicial e conhecer os recursos escolhidos.

O segmento escolhido nos cartões da landing prepara o cadastro e pode ser alterado antes da criação da conta. A seleção de módulos oferece uma prévia com exemplos, passos e capturas quando disponíveis, sem modificar os recursos escolhidos. A conta começa gratuita; não há uma etapa separada para selecionar a única opção gratuita.

## Funcionalidades

Nas configurações, Perfil do Negócio, Horários e Notificações indicam separadamente as alterações não salvas. Trocar de seção mantém a edição em memória; salvar uma seção não remove as pendências das outras. Os campos ficam bloqueados durante o envio e uma falha permite tentar novamente sem redigitar. As preferências de notificações são gravadas juntas em uma única requisição.

Ao sair por um link interno, a pessoa confirma o descarte. Recarregar ou fechar a aba usa o aviso nativo do navegador, quando suportado. Essa proteção não intercepta o botão Voltar do navegador nem toda navegação programática; não há recuperação de rascunhos após fechar a sessão, e esses dados não são gravados em armazenamento local.

O primeiro acesso ao link público de agendamento cria um endereço por empresa. Se várias pessoas o solicitarem ao mesmo tempo, a API reutiliza o endereço que foi salvo primeiro, preservando os links já compartilhados.

| Área               | O que a pessoa pode fazer                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| Agenda             | Marcar, confirmar, concluir e cancelar atendimentos; consultar profissionais e conflitos de horário. |
| Clientes           | Organizar contatos, histórico e observações; adaptar a nomenclatura ao segmento.                     |
| Profissionais      | Cadastrar equipe e especialidades, respeitando o limite de profissionais ativos do plano.            |
| Serviços           | Definir preço, duração e insumos consumidos em cada atendimento.                                     |
| Estoque            | Consultar produtos, registrar movimentos e acompanhar reposição e validade.                          |
| PDV e vendas       | Montar carrinho, registrar venda e formas de pagamento, consultar itens e histórico.                 |
| Financeiro         | Acompanhar receitas, despesas, vencimentos e recebimentos com filtros por período.                   |
| Relatórios         | Consultar indicadores de vendas, atendimentos e consumo de materiais conforme permissão.             |
| Comissões          | Acompanhar comissões e seu histórico, sem confundir comissão calculada com repasse bancário.         |
| Fidelidade         | Organizar pontos e relacionamento com clientes.                                                      |
| Marketing          | Preparar campanhas e contatos autorizados para abordagem manual pelo WhatsApp.                       |
| Tarefas            | Distribuir atividades com responsável, prazo, prioridade e unidade.                                  |
| Filiais            | Organizar unidades do negócio e filtros relacionados.                                                |
| Documentos         | Preparar e consultar documentos operacionais, com impressão quando disponível.                       |
| Recorrências       | Organizar registros recorrentes e sua execução.                                                      |
| Automações         | Configurar regras disponíveis e acompanhar seu processamento.                                        |
| Agendamento online | Disponibilizar horários públicos, validar disponibilidade e lidar com conflitos.                     |
| Equipe e conta     | Administrar acessos, convites, permissões, sessões e autenticação em duas etapas.                    |

O catálogo compartilhado está em [workspace.ts](../packages/shared/src/workspace.ts). Disponibilidade de um módulo, permissão do usuário e estado da integração são verificações distintas; esconder um item no menu não substitui autorização na API.

## Atendimento conectado ao estoque

1. Cadastre o produto e seu estoque.
2. Vincule ao serviço a quantidade consumida por atendimento.
3. Agende o serviço para um profissional disponível.
4. Conclua o atendimento.
5. Consulte o movimento registrado e o histórico da operação.

As regras de concorrência e transação devem preservar consistência quando duas operações usam o mesmo produto. Uma tentativa recusada precisa devolver erro compreensível, sem confirmar uma baixa que não aconteceu.

## Operação do PDV e recuperação de consultas

O PDV diferencia catálogo carregando, busca sem resultados e falha de conexão, com novas tentativas na própria tela. A busca de clientes consulta o cadastro completo e preserva a pessoa selecionada ao trocar o filtro. O atalho `/` foca a busca de produtos sem interferir na digitação de outros campos.

Descontos negativos, acima do total ou acima de 100% impedem a finalização e mostram uma orientação junto ao campo. Durante o envio, o carrinho e as condições da venda ficam bloqueados. Se a resposta se perder, a repetição da mesma venda reutiliza sua chave de operação para evitar duplicação. Essa proteção não significa que atualizar ou fechar a página recupere um carrinho não salvo.

Consultas comuns à API têm prazo de 20 segundos; downloads, 60 segundos, salvo prazo específico da operação. A interface permite tentar novamente após falha. Gravações não são repetidas automaticamente.

## Alertas do painel

O painel reúne produtos com estoque baixo, contas a pagar ou receber atrasadas, contas dos próximos sete dias e atendimentos de hoje aguardando confirmação. Contas abertas e parcialmente pagas entram na consulta; pagas e canceladas ficam fora. O fuso da empresa define o dia de referência. Links financeiros abrem o período correspondente; o estoque leva aos detalhes do próprio painel.

Os alertas financeiros dependem de permissão e módulo habilitado. Uma consulta com falha oferece atualização manual e não deve impedir a leitura do restante do painel. Sem conexão com a nova versão da API, a interface informa a indisponibilidade em vez de inventar pendências.

## Planos do Nexly

| Plano        | Mensalidade anunciada | Profissionais ativos                  |
| ------------ | --------------------- | ------------------------------------- |
| Gratuito     | R$ 0                  | 1                                     |
| Essencial    | R$ 49                 | 2                                     |
| Profissional | R$ 99                 | 10                                    |
| Empresarial  | R$ 199                | 100 profissionais ativos |

Os limites estão em [plans.ts](../packages/shared/src/plans.ts); o catálogo de cobrança está no backend. O Stripe cobra a assinatura do Nexly. O registro de uma venda no PDV não transfere automaticamente dinheiro entre o cliente e o negócio.

O teto Empresarial é de 100 profissionais ativos por empresa, compartilhado entre suas unidades. A API verifica a cota dentro da transação, inclusive em cadastros simultâneos. Cadastros legados acima do teto são preservados e impedem novas inclusões até liberar vagas. Essa cota se refere aos profissionais cadastrados, não à quantidade de logins simultâneos nem a uma garantia de capacidade da infraestrutura.

## Páginas públicas

A landing apresenta a marca, capturas do produto com dados demonstrativos, segmentos, integração entre módulos e dez perguntas frequentes. Funcionalidades apresenta 19 explicações navegáveis; o blog organiza os artigos em destaque, pesquisa e categorias. Os carrosséis aceitam teclado e não alternam conteúdo automaticamente. Preços, login, cadastro, suporte, termos e privacidade compartilham a navegação pública.

Depoimentos públicos dependem de relato real e autorização de publicação. O sistema não deve apresentar pessoas ou resultados fictícios como recomendação. O canal de suporte autorizado é **breno.emailsenai@gmail.com**.

## Identidade visual e acessibilidade

A marca usa a Inter, superfícies escuras e índigo nos destaques. A base é o [protótipo do Nexly no Figma](https://www.figma.com/design/nZXYARpSTmoeK3Gg7P0apb/Nexly?node-id=0-1). A evolução preserva a identidade, com hierarquia mais clara, espaços entre controles, imagens de demonstração e animações compatíveis com preferência por movimento reduzido.

Labels associados aos campos, mensagens de erro, foco, navegação por teclado, modais e ausência de overflow integram a revisão. Essas medidas não equivalem a certificação formal de acessibilidade.

## Jornada da assinatura

O administrador contrata pelo Stripe Checkout e gerencia o vínculo no Customer Portal configurado. A assinatura do Nexly é distinta das vendas registradas no PDV. A modalidade implementada é mensal, sem configuração de teste gratuito, anuidade ou impostos automáticos. Regras de confirmação, limites e cancelamento estão em [Pagamentos](PAGAMENTOS.md).

## Evolução comercial aprovada — 25/10/2026

As propostas abaixo foram autorizadas como direção de evolução. Planejado não significa disponível; integrações externas dependem de configuração e homologação. Cada entrega deve preservar permissões, isolamento de empresas, histórico e identidade visual, com evidência registrada em [Testes](TESTES.md).

| Nº | Evolução | Situação |
| --- | --- | --- |
| 1 | Apresentação inicial orientada a uma tarefa real | Planejado |
| 2 | Demonstração interativa isolada sem cadastro | Planejado |
| 3 | Jornadas por segmento | Parcial: seleção da landing prepara o cadastro; páginas específicas pendentes |
| 4 | Comparador de planos por necessidade | Planejado |
| 5 | Casos reais de clientes | Depende de pilotos e autorização dos relatos |
| 6 | Vídeos curtos com legendas | Planejado |
| 7 | Blog conectado a tarefas e modelos úteis | Planejado |
| 8 | Acabamento visual e acessibilidade contínuos | Em evolução; não representa certificação |
| 9 | Cadastro mais curto | Implementado em quatro etapas; dados obrigatórios preservados |
| 10 | Prévia dos módulos escolhidos | Implementado: exemplos e capturas, sem alterar a seleção |
| 11 | Configuração guiada até o primeiro atendimento | Planejado sobre o guia existente |
| 12 | Retomar configurações interrompidas | Planejado, sem armazenar senhas ou tokens |
| 13 | Estados vazios com próximo passo específico | Planejado sobre os componentes existentes |
| 14 | Ajuda contextual durante a tarefa | Planejado |
| 15 | Painel adequado ao papel do usuário | Planejado sobre as permissões existentes |
| 16 | Mapeamento de colunas na importação | Planejado |
| 17 | Busca global de registros e ações | Planejado sobre a busca de páginas existente |
| 18 | Filtros salvos e favoritos | Planejado |
| 19 | Cadastro rápido sem abandonar a tarefa | Planejado |
| 20 | Aviso de alterações não salvas | Parcial: configurações indicam seções pendentes e protegem links/recarregamento; expansão e histórico do navegador pendentes |
| 21 | Notificações com ações de resolução | Planejado |
| 22 | Preferências e resumo de notificações | Planejado; envio depende do provedor |
| 23 | Ações em lote com prévia | Planejado |
| 24 | Uso rápido no celular e instalação web | Planejado; não prometer gravações offline |
| 25 | Lista de espera e encaixes | Planejado |
| 26 | Confirmação e reagendamento pelo cliente | Planejado |
| 27 | Intervalos e preparação entre atendimentos | Planejado |
| 28 | Reserva de salas e equipamentos | Planejado |
| 29 | Sugestão de retorno | Planejado |
| 30 | Pacotes de sessões e serviços | Planejado |
| 31 | Portal do cliente do estabelecimento | Planejado |
| 32 | Campos próprios por segmento | Planejado; não equivale a prontuário clínico |
| 33 | Salvar e suspender carrinhos | Planejado; preservar idempotência e revalidar estoque |
| 34 | Pagamento dividido no PDV | Planejado; registro financeiro, sem repasse bancário automático |
| 35 | Devolução parcial de itens | Planejado sobre o estorno existente |
| 36 | Abertura e fechamento de caixa | Planejado |
| 37 | Clareza e consistência financeira | Parcial: rótulos do fluxo de caixa e explicação de custo histórico corrigidos |
| 38 | Datas consistentes com o fuso da empresa | Planejado para todos os relatórios e exportações |
| 39 | Consumo fracionado e unidades de medida | Planejado; exige evolução do modelo de dados |
| 40 | Múltiplos lotes por produto | Planejado; exige evolução do modelo de dados |
| 41 | Sugestão de reposição por consumo | Planejado |
| 42 | Recuperação de acesso operacional | Depende de provedor e remetente; envio continua desativado |
| 43 | Backup externo restaurável | Depende de armazenamento e secrets; validação externa pendente |
| 44 | Suporte com histórico de atendimento | Planejado |
| 45 | Métricas de ativação e feedback contextual | Planejado com coleta mínima e finalidade definida |

A primeira entrega prioriza o teto comercial, redução do cadastro, prévia dos recursos e clareza financeira. A sequência prioriza preservação do trabalho (12, 20 e 33), primeira configuração (11 e 13), operação da agenda (25–29) e evolução financeira/estoque (34–41), mantendo a validação das dependências externas 42 e 43 como requisito para liberação comercial.
