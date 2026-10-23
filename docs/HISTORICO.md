# Histórico das entregas documentadas

## Outubro de 2026

O produto evoluiu da agenda conectada ao estoque para um conjunto modular com financeiro, comissões, fidelidade, fornecedores, compras e recursos operacionais. Foram adicionados fluxos de personalização, trabalho em equipe, tarefas persistidas, sessões, segundo fator, login Google e assinaturas do Nexly. Configuração externa e disponibilidade em produção precisam ser verificadas separadamente.

## Revisão de 21 e 22 de outubro

| Commit    | Entrega                                                                                       |
| --------- | --------------------------------------------------------------------------------------------- |
| `6899bb7` | Revisão da experiência pública preservando a identidade visual.                               |
| `e94da00` | Painel geral mais enxuto, com indicadores e detalhes operacionais.                            |
| `8379488` | Imagens demonstrativas, segmentos com ícones, FAQ ampliada, carrosséis e ajustes no cadastro. |
| `b15943b` | Alertas operacionais por empresa e permissão, com links ao período financeiro.                |
| `be47a65` | Exigência explícita de tags AES-GCM completas e testes de truncamento.                        |
| `7b82af9` | Teste comercial adaptado à expansão dos primeiros passos no painel.                           |

O frontend foi verificado em produção nessa revisão. A nova rota de alertas foi validada localmente; sua publicação na API não estava confirmada no último teste de 22/10. O Railway relatou pausa de deploys e incidente de segurança, acompanhados por fontes oficiais. Isso é uma pendência operacional datada, não uma conclusão permanente sobre o serviço.

## Documentação de 23 de outubro

Documentação reorganizada em guias públicos com referências de API e banco extraídas do código. README atualizado para refletir tecnologias, módulos, execução e limitações reais. Relatórios de trabalho, prompts HTML, logs, caches e capturas antigas foram retirados da pasta documental. Artefatos de testes passam a utilizar `test-results`. Os documentos acadêmicos acompanham a revisão técnica, preservando a identificação do trabalho e a orientação de normalização adotada.

O histórico completo de implementação permanece no Git. Este arquivo reúne marcos de produto; não substitui changelog operacional de incidentes nem diário de execução.

A revisão documental passou no verificador de referências e links, formatação, análise estática direcionada dos scripts e TypeScript dos testes. Os 14 testes de `e2e/unit` passaram. Os documentos Word foram renderizados e revisados, incluindo conferência das 60 referências dos sumários. A geração dos inventários e sua conferência foram disponibilizadas como comandos npm; a conferência passou a integrar o CI.

## Recuperação da documentação integral — 23/10/2026

A estrutura acadêmica anterior foi recuperada, mantendo capítulos, figuras e glossário. Os apêndices de dados e API foram atualizados a partir do código, e o conteúdo de assinaturas, recebimento, segurança e operação foi ampliado. O plano GOT original foi recuperado com critérios complementares de pagamentos. As evidências antigas mantêm sua data; revisão documental não equivale a nova homologação do sistema.
