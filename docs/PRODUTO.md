# Produto e experiência de uso

O Nexly reúne agenda, atendimento, estoque e vendas para pequenos negócios. Uma empresa configura seus serviços, profissionais e materiais; ao concluir um atendimento, o sistema registra o consumo dos insumos vinculados. Assim, quem atende não precisa lançar novamente cada material utilizado.

O produto atende segmentos como salões, barbearias, clínicas, petshops e estúdios. Os presets são configurações iniciais de módulos e linguagem, ajustáveis em Meu Nexly. Escolher um preset não transforma o produto em prontuário médico nem habilita automaticamente integrações externas.

## Cadastro e primeiro acesso

O cadastro distribui as informações em cinco etapas, incluindo dados da conta e do negócio, escolha de recursos e aceite das condições. As dependências dos módulos são consideradas: a agenda, por exemplo, utiliza clientes, profissionais e serviços. A preferência de plano acompanha a navegação; uma escolha na interface não confirma pagamento nem concede plano pago.

Depois do acesso, o painel oferece indicadores, agenda do dia e pendências. Atalhos e primeiros passos ficam em uma seção expansível, para preservar espaço. Meu Nexly permite rever a configuração inicial e conhecer os recursos escolhidos.

## Funcionalidades

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

## Alertas do painel

O painel reúne produtos com estoque baixo, contas a pagar ou receber atrasadas, contas dos próximos sete dias e atendimentos de hoje aguardando confirmação. Contas abertas e parcialmente pagas entram na consulta; pagas e canceladas ficam fora. O fuso da empresa define o dia de referência. Links financeiros abrem o período correspondente; o estoque leva aos detalhes do próprio painel.

Os alertas financeiros dependem de permissão e módulo habilitado. Uma consulta com falha oferece atualização manual e não deve impedir a leitura do restante do painel. Sem conexão com a nova versão da API, a interface informa a indisponibilidade em vez de inventar pendências.

## Planos do Nexly

| Plano        | Mensalidade anunciada | Profissionais ativos                  |
| ------------ | --------------------- | ------------------------------------- |
| Gratuito     | R$ 0                  | 1                                     |
| Essencial    | R$ 49                 | 2                                     |
| Profissional | R$ 99                 | 10                                    |
| Empresarial  | R$ 199                | Sem limite comercial de profissionais |

Os limites estão em [plans.ts](../packages/shared/src/plans.ts); o catálogo de cobrança está no backend. O Stripe cobra a assinatura do Nexly. O registro de uma venda no PDV não transfere automaticamente dinheiro entre o cliente e o negócio.

## Páginas públicas

A landing apresenta a marca, capturas do produto com dados demonstrativos, segmentos, integração entre módulos e dez perguntas frequentes. Funcionalidades apresenta 19 explicações navegáveis; o blog organiza os artigos em destaque, pesquisa e categorias. Os carrosséis aceitam teclado e não alternam conteúdo automaticamente. Preços, login, cadastro, suporte, termos e privacidade compartilham a navegação pública.

Depoimentos públicos dependem de relato real e autorização de publicação. O sistema não deve apresentar pessoas ou resultados fictícios como recomendação. O canal de suporte autorizado é **breno.emailsenai@gmail.com**.

## Identidade visual e acessibilidade

A marca usa a Inter, superfícies escuras e índigo nos destaques. A base é o [protótipo do Nexly no Figma](https://www.figma.com/design/nZXYARpSTmoeK3Gg7P0apb/Nexly?node-id=0-1). A evolução preserva a identidade, com hierarquia mais clara, espaços entre controles, imagens de demonstração e animações compatíveis com preferência por movimento reduzido.

Labels associados aos campos, mensagens de erro, foco, navegação por teclado, modais e ausência de overflow integram a revisão. Essas medidas não equivalem a certificação formal de acessibilidade.
