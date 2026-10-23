# Documentação do Nexly

Esta documentação descreve o código disponível no repositório em 23 de outubro de 2026. Ela distingue implementação, configuração externa e evidência de testes. Uma integração implementada pode permanecer desativada no ambiente publicado.

| Para entender                            | Leia                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| O produto, seus módulos e planos         | [Produto](PRODUTO.md)                                                       |
| As tecnologias e o funcionamento interno | [Arquitetura](ARQUITETURA.md)                                               |
| Como instalar e desenvolver              | [Desenvolvimento](DESENVOLVIMENTO.md)                                       |
| Deploy, integrações, backup e incidentes | [Operação](OPERACAO.md)                                                     |
| Autenticação, permissões e isolamento    | [Segurança](SEGURANCA.md)                                                   |
| Plano de testes, critérios e evidências  | [Testes](TESTES.md)                                                         |
| Rotas implementadas na API               | [Referência da API](REFERENCIA_API.md)                                      |
| Entidades e relações persistidas         | [Modelo de dados](MODELO_DADOS.md)                                          |
| O que mudou nas últimas entregas         | [Histórico](HISTORICO.md)                                                   |
| Documentação acadêmica em Word           | [Documentação completa](documentacao/Nexly_Documentação.docx) |
| Plano acadêmico e matriz GOT em Word     | [Plano de testes](documentacao/Nexly_Plano_de_Testes_e_GOT_ABNT.docx)       |

O código e as migrações são a referência executável. As referências de API e banco acompanham esta revisão, sem substituir os DTOs, as permissões e o schema. Os documentos Word apresentam o sistema para leitores sem formação em programação; os guias Markdown facilitam manutenção e revisão pelo GitHub.

Os documentos acadêmicos seguem a orientação do manual SENAI-SP fornecido para o trabalho: A4, Arial 12, margens superior/esquerda de 3 cm e inferior/direita de 2 cm, corpo em espaço 1,5 e recuo inicial de 1,25 cm. O plano usa paisagem no corpo para leitura da matriz. Atualize os campos de sumário e confira a paginação no Word antes de imprimir. Banca, assinaturas e ficha catalográfica dependem da escola; não foram fabricadas. Esta preparação não constitui certificação de conformidade com todas as revisões das normas ABNT.

A edição integral foi recuperada e ampliada em 23/10/2026, preservando a estrutura acadêmica anterior e atualizando os apêndices e a integração de pagamentos. A paginação final é conferida por renderização; pode variar ao atualizar campos em outro editor.

Logs, dados exportados, capturas de testes, dumps, chaves, prompts e rascunhos não fazem parte da documentação pública. Os testes gravam seus artefatos em `test-results`, que permanece ignorada pelo Git.

O CI executa `npm run docs:check` para detectar referências desatualizadas e links locais quebrados. Ao alterar controllers ou schema, execute `npm run docs:generate` e revise os guias afetados antes de publicar.

## Assinaturas e recebimento

Leia o [guia completo de pagamentos](PAGAMENTOS.md) para catálogo, contratação, estados, webhooks, segurança, recebimento e homologação. Os documentos Word mantêm a explicação completa, além dos inventários atuais de API e dados.

A edição integral foi conferida em LibreOffice com 126 páginas na documentação principal e 46 no plano de testes. O texto principal preserva 11 figuras, inclui o capítulo de pagamentos e os inventários de 41 modelos e 195 rotas. Os números descrevem esta renderização, não uma contagem garantida em todos os editores.
