# Segurança e privacidade

O Nexly utiliza controles complementares na API, no navegador e na persistência. A presença desses controles não significa imunidade a falhas nem certificação de conformidade. Revisão de código, configuração do ambiente e monitoramento continuam necessários.

## Autenticação e sessões

Senhas são verificadas com Argon2id. O backend assina access tokens com RSA e algoritmo RS256. A renovação utiliza refresh tokens e sessões persistidas, com rotação e tratamento de reutilização. O cookie de renovação é protegido por atributos definidos conforme ambiente e domínio.

Autenticação TOTP oferece segundo fator e códigos de recuperação. Segredos e tokens que precisam ser recuperados utilizam criptografia apropriada ao fluxo. As respostas cifradas de rotação e a fila de recuperação exigem tags AES-GCM de 16 bytes; testes rejeitam tags válidas truncadas. Não se deve registrar senhas, tokens, segredos TOTP ou chaves de provedores em logs e auditoria.

O login Google verifica assinatura, emissor, destinatário e validade do ID token. A vinculação a uma conta existente exige prova da conta local e segundo fator quando aplicável; coincidência de e-mail não autoriza associação silenciosa. Apple não deve ser anunciado como integrado sem implementação e configuração correspondentes.

## Autorização e empresas

As permissões compartilhadas definem ADMIN, GESTOR, RECEPCIONISTA, PROFISSIONAL e CAIXA. A API é a autoridade de acesso; menu oculto não é uma barreira de segurança. Rotas e serviços também precisam verificar vínculos dos recursos solicitados com a empresa autenticada.

A extensão Prisma aplica escopo de empresa aos modelos e operações cobertos. Tabelas filhas utilizam relações com o registro principal. Caminhos públicos e trabalhos sem contexto precisam de filtros explícitos. Não aceite `empresaId` enviado pelo navegador como identidade confiável.

O projeto inclui políticas e migrações de proteção do PostgreSQL. RLS depende da política aplicada, do contexto de conexão e dos privilégios efetivos. Em instalações antigas, não execute indiscriminadamente `seed-rls.sql`: ele contém criação de políticas e pode conflitar com migrações já executadas. Inspecione o estado e use [test-database-privacy.cjs](../scripts/test-database-privacy.cjs) em ambiente de teste autorizado.

## Fronteiras da API e navegador

| Controle     | Aplicação                                                                                          |
| ------------ | -------------------------------------------------------------------------------------------------- |
| Validação    | DTOs e schemas restringem formato, conteúdo e limites das entradas.                                |
| Consultas    | Prisma e parâmetros evitam montar SQL com entrada do usuário; lint restringe chamadas inseguras.   |
| Cotas        | Redis coordena limites distribuídos de autenticação e operações sensíveis.                         |
| Origem       | CORS e verificações de origem restringem chamadas de navegador e fluxos sensíveis.                 |
| Cabeçalhos   | Helmet, CSP, HSTS e políticas do navegador reduzem exposição conforme ambiente.                    |
| Auditoria    | Registra ações e diferenças com redação de campos sensíveis.                                       |
| Serialização | Remove campos de credenciais das respostas cobertas pelo interceptor.                              |
| Exportação   | Permissão, empresa e cotas limitam extração de dados.                                              |
| Stripe       | Assinatura do webhook, modo do ambiente, idempotência e reconciliação protegem a mudança de plano. |

## Privacidade e dados pessoais

O sistema oferece caminhos relacionados a exportação e solicitação de tratamento de dados. E-mails automáticos dependem de provedor ativo. Atendimento ao titular, base legal, retenção e obrigações do responsável pelo serviço exigem decisões operacionais e jurídicas; a implementação isolada não comprova conformidade integral com a LGPD.

Capturas públicas desta revisão usam respostas fictícias e são identificadas como demonstração. Nenhum teste deve publicar um depoimento inventado ou exportação de dados reais como material de marketing.

## Segredos e resposta a incidentes

Mantenha segredos no ambiente do backend ou no gerenciador da plataforma. Variáveis `NEXT_PUBLIC_*` são públicas no frontend. Não envie chaves ao chat, issues, commits ou documentos. Registre somente nomes de variáveis, finalidade e procedimento de troca.

Se um segredo tiver sido exposto, removê-lo do arquivo atual não o revoga. Substitua-o no provedor, atualize os consumidores, verifique o funcionamento e revogue a credencial anterior segundo a urgência do incidente. Tokens de sessão e chaves de assinatura exigem avaliar invalidação de acessos e continuidade do serviço. O procedimento operacional está em [Operação](OPERACAO.md).

## Verificações e limitações

O workflow de segurança executa gitleaks, audit de dependências e Semgrep. ZAP exige alvo informado e autorização de teste; não declarar que foi executado quando o job foi pulado. Auditar dependências de produção e ferramentas de desenvolvimento são verificações diferentes.

Na verificação de 22/10/2026, a auditoria de produção retornou zero vulnerabilidades. O CI de ferramentas apontou `braces`, transitivo do conjunto Tailwind/ESLint, com [aviso sem versão corrigida naquela consulta](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). O resultado é datado e pode mudar. Não foi aplicado `audit fix --force` nem reduzida a exigência do workflow para esconder o alerta.

## Segurança de cobrança

Webhooks exigem assinatura sobre o corpo original. A API rejeita ambiente incompatível e conta conectada, confere o catálogo e resolve a empresa pelo customer persistido. O retorno do navegador não comprova pagamento. Operações de administração exigem ADMIN e usam cota distribuída. Credenciais ficam no backend. Consulte [Pagamentos](PAGAMENTOS.md) para as condições de acesso, idempotência e limites operacionais.

## Atualização de segurança do Node.js em outubro de 2026

O [aviso oficial de 21/10/2026](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases) inclui a CVE-2026-111497, que permite corrupção de memória ao descomprimir determinados dados Brotli. A configuração do Nexly exige Node.js `>=24.22.1 <25`; `.nvmrc`, CI e imagens Docker usam `24.22.1`. Os containers separados do NexusAuth usam a versão corrigida `22.23.4`.

No Railway/Nixpacks, `scripts/install-node-runtime.sh` instala o binário oficial para x64 ou arm64 e verifica um SHA-256 fixado antes de utilizá-lo. `scripts/check-node-version.cjs` rejeita versões fora da faixa permitida na instalação e no build. Como a Vercel controla o patch do runtime dentro de `24.x`, confirme também a versão do ambiente publicado; a validação do build não substitui essa conferência.

Os parsers HTTP da API rejeitam corpos comprimidos com status 415 (`inflate: false`), incluindo importação, JSON, formulário e webhook Stripe. Corpos sem compressão continuam aceitos, com os limites anteriores e preservação dos bytes originais do webhook. Essa proteção não substitui atualizar o runtime, pois outras bibliotecas também podem descomprimir respostas externas.

Um alerta de versão não comprova invasão. Preserve e revise logs do servidor e do Stripe, reconstrua e publique o ambiente corrigido e trate possíveis credenciais expostas. A substituição das chaves precisa ocorrer nos painéis dos provedores, seguida da atualização dos consumidores e revogação das antigas. Não registre valores de chaves nos arquivos ou no chat. Atualizar este repositório não comprova que a hospedagem foi corrigida ou que as credenciais já foram substituídas.

Na consulta de 23/10/2026, a auditoria apontou avisos altos no Zod 3.25.76 ([GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)) e no body-parser 2.3.0 ([GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828)). As dependências foram atualizadas para Zod 4.6.7 e body-parser 2.4.0. Os formulários utilizam `@hookform/resolvers` 5.9.2, compatível com Zod 4, e o login foi adaptado à nova opção de mensagens de erro. O bloqueio de corpos comprimidos também mitiga o caminho descrito no aviso do body-parser.

Após essas atualizações, `npm audit --omit=dev` retornou zero vulnerabilidades em 23/10/2026. A auditoria completa ainda apontou três avisos moderados no conjunto de build do Tailwind 3 (Tailwind, postcss-nested e postcss-selector-parser), cuja correção sugerida exige migração principal para Tailwind 4. Não foi aplicada essa migração visual nem ocultado o resultado. Esses números são datados, referem-se ao monorepo e não substituem a verificação da hospedagem, dos serviços independentes ou de avisos futuros.
