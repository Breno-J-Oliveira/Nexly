<a id="topo"></a>

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="apps/web/public/logo.svg">
  <img src="apps/web/public/logo-ink.svg" alt="Marca Nexly" width="104">
</picture>

# Nexly

### Gestão conectada para pequenos negócios

**Agenda, clientes, serviços, estoque, vendas e financeiro em uma única plataforma.**

Um SaaS multiempresa para organizar o atendimento e acompanhar o negócio — do primeiro agendamento ao consumo de materiais e ao registro da venda.

<p>
  <a href="https://nexly-web.vercel.app"><img src="https://img.shields.io/badge/ACESSAR_O_NEXLY-6366F1?style=for-the-badge&logo=vercel&logoColor=white" alt="Acessar o site do Nexly"></a>
  <a href="#documentacao"><img src="https://img.shields.io/badge/DOCUMENTAÇÃO-111116?style=for-the-badge&logo=readthedocs&logoColor=white" alt="Abrir a área de documentação"></a>
  <a href="https://www.figma.com/design/nZXYARpSTmoeK3Gg7P0apb/Nexly?node-id=0-1"><img src="https://img.shields.io/badge/PROTÓTIPO_FIGMA-F24E1E?style=for-the-badge&logo=figma&logoColor=white" alt="Abrir o projeto no Figma"></a>
  <a href="https://app.clickup.com/1600370000006731/v/f/1600370000039761/1600370000035041"><img src="https://img.shields.io/badge/KANBAN_NO_CLICKUP-7B68EE?style=for-the-badge&logo=clickup&logoColor=white" alt="Abrir o quadro Kanban do projeto no ClickUp"></a>
  <a href="#instalacao"><img src="https://img.shields.io/badge/RODAR_LOCALMENTE-181717?style=for-the-badge&logo=gnubash&logoColor=white" alt="Ver a instalação local"></a>
</p>

<p>
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js 16">
  <img src="https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/NestJS-12-E0234E?style=flat-square&logo=nestjs&logoColor=white" alt="NestJS 12">
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma&logoColor=white" alt="Prisma 5">
  <img src="https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis">
</p>

<p>
  <a href="https://github.com/Breno-J-Oliveira/Nexly/actions/workflows/ci.yml"><img src="https://github.com/Breno-J-Oliveira/Nexly/actions/workflows/ci.yml/badge.svg?branch=main" alt="Estado atual do workflow CI na main"></a>
  <img src="https://img.shields.io/badge/versão_do_pacote-0.1.0-6366F1?style=flat-square" alt="Versão dos pacotes 0.1.0">
  <img src="https://img.shields.io/badge/arquitetura-multiempresa-334155?style=flat-square" alt="Arquitetura multiempresa">
  <img src="https://img.shields.io/badge/interface-PT--BR-15803D?style=flat-square" alt="Interface em português brasileiro">
</p>

<a href="docs/Screenshots/nexly-painel_geral.png"><img src="apps/web/public/images/product/dashboard-atual.webp" alt="Painel atual do Nexly com indicadores, agenda do dia e alertas de estoque" width="100%"></a>

<sub>Aplicação atual com dados de demonstração. Valores ilustrativos não representam resultados de clientes.</sub>

**NexusTech · Técnico em Desenvolvimento de Sistemas · SENAI “A. Jacob Lafer” · 2026**

</div>

---

## Navegação

| Conhecer o produto                     | Explorar a implementação                | Executar e acompanhar                    |
| -------------------------------------- | --------------------------------------- | ---------------------------------------- |
| [Visão geral](#visao-geral)            | [Arquitetura](#arquitetura)             | [Instalação local](#instalacao)          |
| [Jornadas de uso](#jornadas)           | [Stack tecnológica](#stack)             | [Variáveis de ambiente](#ambiente)       |
| [Funcionalidades](#funcionalidades)    | [Banco, MER e DER](#dados)              | [Comandos úteis](#comandos)              |
| [Tour visual e galeria](#galeria)      | [API REST](#api)                        | [Testes e evidências](#testes)           |
| [Site e páginas públicas](#site)       | [Autenticação e permissões](#acesso)    | [CI, publicação e operação](#operacao)   |
| [Figma e identidade visual](#figma)    | [Segurança e privacidade](#seguranca)   | [Diagnóstico de problemas](#diagnostico) |
| [Planos e assinaturas](#planos)        | [Integrações e NexusAuth](#integracoes) | [Documentação](#documentacao)            |
| [Equipe e contexto acadêmico](#equipe) | [Estrutura do repositório](#estrutura)  | [Roadmap e contribuições](#roadmap)      |

**Primeira visita?** Comece pela visão geral e pelo tour visual. **Vai desenvolver?** Leia arquitetura, instalação e API. **Vai avaliar a entrega?** Consulte os documentos acadêmicos e as evidências.

---

<a id="visao-geral"></a>

## 1. Visão geral

O **Nexly** é uma aplicação web de gestão para pequenos negócios que trabalham com atendimentos, serviços e venda de produtos. Reúne informações que normalmente ficam separadas em agendas, planilhas e anotações: clientes, profissionais, horários, estoque, vendas e contas.

**SaaS** significa que o produto é oferecido como um serviço acessado pelo navegador. **Multiempresa**, ou _multi-tenant_, significa que várias empresas utilizam a mesma aplicação, com seus registros e acessos delimitados pelo contexto de cada negócio.

### Para quem foi pensado

| Segmento                               | Exemplos de uso                                          |
| -------------------------------------- | -------------------------------------------------------- |
| Salões de beleza                       | Profissionais, serviços, horários e consumo de produtos. |
| Barbearias                             | Agenda, venda de produtos e consulta de comissões.       |
| Petshops                               | Relacionamento com clientes, atendimentos e produtos.    |
| Estúdios e profissionais autônomos     | Contatos e rotina de atendimento centralizados.          |
| Negócios de estética e outros serviços | Seleção de módulos e linguagem conforme a operação.      |

Os segmentos orientam a configuração inicial. Escolher um preset não transforma o Nexly em prontuário clínico, sistema fiscal ou solução especializada para uma atividade regulada.

### Qual problema ele resolve

| Na rotina do negócio                      | No Nexly                                       |
| ----------------------------------------- | ---------------------------------------------- |
| Horários e contatos espalhados            | Agenda integrada aos cadastros.                |
| Material consumido sem histórico          | Serviços associados a insumos e movimentações. |
| Estoque desconectado das vendas           | PDV, produtos e saldo relacionados pela API.   |
| Dificuldade para acompanhar pendências    | Indicadores e alertas do negócio.              |
| Funções que a empresa não utiliza         | Escolha de módulos e personalização inicial.   |
| Acessos sem distinção de responsabilidade | Perfis e permissões verificados no backend.    |

### O que cada público encontra

- **Administração:** indicadores, agenda, estoque, vendas, contas e configuração da empresa.
- **Equipe:** recursos de atendimento e caixa liberados conforme o papel e os módulos.
- **Clientes do estabelecimento:** agendamento público quando configurado.
- **Desenvolvimento:** monorepositório TypeScript, API NestJS, schema Prisma, migrações e testes.

[Voltar ao topo](#topo)

---

<a id="jornadas"></a>

## 2. Diferencial e jornadas de uso

### Do atendimento ao estoque

O diferencial central é a ligação entre **serviços e insumos**. Um serviço pode consumir quantidades definidas de um ou mais produtos. Ao concluir o atendimento, o sistema processa esse consumo e mantém o histórico correspondente.

```mermaid
flowchart LR
    A[Cliente cadastrado] --> B[Agendamento]
    S[Serviço e profissional] --> B
    P[Produtos e insumos] --> S
    B --> C[Conclusão do atendimento]
    C --> D[Consumo de materiais]
    D --> E[Movimentação de estoque]
    E --> F[Saldo e alertas]
```

**Exemplo:** um serviço de coloração utiliza uma unidade de tinta cadastrada como insumo. Depois de concluir o agendamento, a saída é registrada no estoque. Repetir uma solicitação não deve consumir novamente o mesmo material. Uma falta prevista pode gerar pendência de consumo; erros internos inesperados devem reverter a transação.

| Jornada              | Passos                                                                               | Resultado que pode ser conferido                           |
| -------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Primeiro atendimento | Configurar negócio → cadastrar cliente, profissional e serviço → agendar → concluir. | Atendimento registrado e consumo dos insumos configurados. |
| Venda no balcão      | Cadastrar produto → montar carrinho → informar cliente e pagamento → finalizar.      | Venda, itens e movimentação de estoque persistidos.        |
| Reposição            | Cadastrar fornecedor → criar pedido → enviar → receber.                              | Estado do pedido e entrada dos produtos.                   |

O PDV registra a forma de pagamento informada. Esse registro não realiza, por si só, uma transferência Pix nem uma cobrança em uma adquirente.

[Voltar ao topo](#topo)

---

<a id="funcionalidades"></a>

## 3. Funcionalidades

As áreas abaixo têm implementação no repositório. O acesso depende das permissões, da configuração da empresa e, quando aplicável, de integrações externas.

### Atendimento e relacionamento

| Área                   | O que oferece                                                                 |
| ---------------------- | ----------------------------------------------------------------------------- |
| **Painel geral**       | Indicadores, agenda do dia, estoque e pendências financeiras conforme acesso. |
| **Agenda**             | Criação, confirmação, conclusão, cancelamento, disponibilidade e conflitos.   |
| **Clientes**           | Contatos, busca, observações, métricas e histórico.                           |
| **Profissionais**      | Equipe, especialidades, disponibilidade e limites ativos por plano.           |
| **Serviços**           | Preço, duração e associação de insumos.                                       |
| **Agendamento online** | Link público por empresa, serviços e horários disponíveis.                    |
| **Fidelidade**         | Pontos, ranking e acompanhamento do relacionamento.                           |
| **Comissões**          | Valores e histórico de cálculo; o repasse ao profissional é externo.          |

### Vendas, estoque e financeiro

| Área                       | O que oferece                                                    |
| -------------------------- | ---------------------------------------------------------------- |
| **Produtos**               | Cadastro, SKU, categoria, preço e informações de estoque.        |
| **Estoque**                | Entradas, saídas, reposição, validade e pendências de consumo.   |
| **PDV**                    | Carrinho, cliente, desconto, pagamento e finalização.            |
| **Vendas**                 | Histórico, itens, filtros e estorno conforme regras e permissão. |
| **Fornecedores e compras** | Fornecedores, pedidos, rascunhos e recebimento.                  |
| **Financeiro**             | Receitas, despesas, vencimentos, baixas e pagamentos parciais.   |
| **Estoque por unidade**    | Saldos e transferências entre a central e as filiais.            |
| **Relatórios**             | Vendas, caixa, agenda, profissionais e materiais.                |
| **Cupons**                 | Condições de desconto nos fluxos permitidos.                     |

### Gestão e operação

| Área                          | O que oferece                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| **Filiais**                   | Unidades e associação das operações correspondentes.                               |
| **Tarefas**                   | Prioridade, responsável, prazo e unidade.                                          |
| **Recorrências**              | Séries de atendimentos e ocorrências futuras.                                      |
| **Automação**                 | Geração de tarefas recorrentes com controle de duplicidade.                        |
| **Documentos**                | Conteúdo operacional, versões e impressão/PDF; sem assinatura digital incorporada. |
| **Marketing**                 | Campanhas e contatos autorizados para abordagem manual por WhatsApp.               |
| **Importação**                | Preparação e conferência de CSV nos fluxos disponíveis.                            |
| **Histórico de alterações**   | Eventos de auditoria conforme permissão.                                           |
| **Saúde e rotinas**           | Dependências, trabalhos e registros de verificação.                                |
| **Usuários e conta**          | Equipe, convites, sessões, senha, segundo fator e Google configurável.             |
| **Meu Nexly e configurações** | Módulos, preset, perfil, horários e notificações.                                  |

As dependências entre módulos são consideradas na configuração. A agenda, por exemplo, utiliza clientes, profissionais e serviços. Referência: [`workspace.ts`](packages/shared/src/workspace.ts).

[Voltar ao topo](#topo)

---

<a id="galeria"></a>

## 4. Tour visual da aplicação

As imagens vieram das **32 capturas atuais fornecidas pelo autor**, em [`docs/Screenshots`](docs/Screenshots). O painel aparece na capa; as demais telas estão nas galerias abaixo. Clique em uma imagem para abrir o original.

Algumas capturas mostram listas vazias, valores estimados ou informações indisponíveis, conforme o estado fotografado. São exemplos da interface com massa de demonstração, não provas de resultados de clientes.

### Agenda e ponto de venda

<a href="docs/Screenshots/nexly-agenda.png"><img src="apps/web/public/images/product/agenda-atual.webp" alt="Agenda atual do Nexly com visualização semanal" width="100%"></a>

_Agenda: horários, profissionais e estados dos atendimentos em uma mesma tela._

<a href="docs/Screenshots/nexly-pdv.png"><img src="apps/web/public/images/product/pdv-atual.webp" alt="Ponto de venda atual com catálogo e carrinho" width="100%"></a>

_PDV: escolha de produtos, montagem do carrinho e registro da venda._

<details>
<summary><strong>Atendimento, catálogo e operação · 8 telas</strong></summary>

<table>
<tr>
<td width="50%" valign="top"><h4>Agenda</h4>
<a href="docs/Screenshots/nexly-agenda.png"><img src="docs/Screenshots/nexly-agenda.png" alt="Tela atual do Nexly: Agenda" width="100%"></a>
</td>
<td width="50%" valign="top"><h4>Clientes</h4>
<a href="docs/Screenshots/nexly-clientes.png"><img src="docs/Screenshots/nexly-clientes.png" alt="Tela atual do Nexly: Clientes" width="100%"></a>
</td>
</tr>
<tr>
<td width="50%" valign="top"><h4>Profissionais</h4>
<a href="docs/Screenshots/nexly-profissionais.png"><img src="docs/Screenshots/nexly-profissionais.png" alt="Tela atual do Nexly: Profissionais" width="100%"></a>
</td>
<td width="50%" valign="top"><h4>Serviços</h4>
<a href="docs/Screenshots/nexly-servi%C3%A7os.png"><img src="docs/Screenshots/nexly-servi%C3%A7os.png" alt="Tela atual do Nexly: Serviços" width="100%"></a>
</td>
</tr>
<tr>
<td width="50%" valign="top"><h4>Produtos</h4>
<a href="docs/Screenshots/nexly-produtos.png"><img src="docs/Screenshots/nexly-produtos.png" alt="Tela atual do Nexly: Produtos" width="100%"></a>
</td>
<td width="50%" valign="top"><h4>Estoque</h4>
<a href="docs/Screenshots/nexly-estoque.png"><img src="docs/Screenshots/nexly-estoque.png" alt="Tela atual do Nexly: Estoque" width="100%"></a>
</td>
</tr>
<tr>
<td width="50%" valign="top"><h4>Ponto de venda</h4>
<a href="docs/Screenshots/nexly-pdv.png"><img src="docs/Screenshots/nexly-pdv.png" alt="Tela atual do Nexly: Ponto de venda" width="100%"></a>
</td>
<td width="50%" valign="top"><h4>Vendas</h4>
<a href="docs/Screenshots/nexly-vends.png"><img src="docs/Screenshots/nexly-vends.png" alt="Tela atual do Nexly: Vendas" width="100%"></a>
</td>
</tr>
</table>

</details>

<details>
<summary><strong>Financeiro, relacionamento e unidades · 7 telas</strong></summary>

<table>
<tr>
<td width="50%" valign="top"><h4>Financeiro</h4>
<a href="docs/Screenshots/nexly-financeiro.png"><img src="docs/Screenshots/nexly-financeiro.png" alt="Tela atual do Nexly: Financeiro" width="100%"></a>
</td>
<td width="50%" valign="top"><h4>Relatórios</h4>
<a href="docs/Screenshots/nexly-relatorios.png"><img src="docs/Screenshots/nexly-relatorios.png" alt="Tela atual do Nexly: Relatórios" width="100%"></a>
</td>
</tr>
<tr>
<td width="50%" valign="top"><h4>Comissões</h4>
<a href="docs/Screenshots/nexly-comissoes.png"><img src="docs/Screenshots/nexly-comissoes.png" alt="Tela atual do Nexly: Comissões" width="100%"></a>
</td>
<td width="50%" valign="top"><h4>Fidelidade</h4>
<a href="docs/Screenshots/nexly-fidelidade.png"><img src="docs/Screenshots/nexly-fidelidade.png" alt="Tela atual do Nexly: Fidelidade" width="100%"></a>
</td>
</tr>
<tr>
<td width="50%" valign="top"><h4>Pedidos de compra</h4>
<a href="docs/Screenshots/nexly-pedidos_de_compra.png"><img src="docs/Screenshots/nexly-pedidos_de_compra.png" alt="Tela atual do Nexly: Pedidos de compra" width="100%"></a>
</td>
<td width="50%" valign="top"><h4>Estoque por unidade</h4>
<a href="docs/Screenshots/nexly-estoque_por_unidade.png"><img src="docs/Screenshots/nexly-estoque_por_unidade.png" alt="Tela atual do Nexly: Estoque por unidade" width="100%"></a>
</td>
</tr>
<tr>
<td width="50%" valign="top"><h4>Filiais</h4>
<a href="docs/Screenshots/nexly-filiais.png"><img src="docs/Screenshots/nexly-filiais.png" alt="Tela atual do Nexly: Filiais" width="100%"></a>
</td>
</tr>
</table>

</details>

<details>
<summary><strong>Gestão e configuração do negócio · 11 telas</strong></summary>

<table>
<tr>
<td width="50%" valign="top"><h4>Automação</h4>
<a href="docs/Screenshots/nexly-automa%C3%A7%C3%A3o.png"><img src="docs/Screenshots/nexly-automa%C3%A7%C3%A3o.png" alt="Tela atual do Nexly: Automação" width="100%"></a>
</td>
<td width="50%" valign="top"><h4>Configurações</h4>
<a href="docs/Screenshots/nexly-configura%C3%A7%C3%B5es.png"><img src="docs/Screenshots/nexly-configura%C3%A7%C3%B5es.png" alt="Tela atual do Nexly: Configurações" width="100%"></a>
</td>
</tr>
<tr>
<td width="50%" valign="top"><h4>Documentos</h4>
<a href="docs/Screenshots/nexly-documentos.png"><img src="docs/Screenshots/nexly-documentos.png" alt="Tela atual do Nexly: Documentos" width="100%"></a>
</td>
<td width="50%" valign="top"><h4>Importação de cadastros</h4>
<a href="docs/Screenshots/nexly-importar_cadastro.png"><img src="docs/Screenshots/nexly-importar_cadastro.png" alt="Tela atual do Nexly: Importação de cadastros" width="100%"></a>
</td>
</tr>
<tr>
<td width="50%" valign="top"><h4>Histórico de alterações</h4>
<a href="docs/Screenshots/nexly-historico_de_alteracoes.png"><img src="docs/Screenshots/nexly-historico_de_alteracoes.png" alt="Tela atual do Nexly: Histórico de alterações" width="100%"></a>
</td>
<td width="50%" valign="top"><h4>Marketing</h4>
<a href="docs/Screenshots/nexly-marketing.png"><img src="docs/Screenshots/nexly-marketing.png" alt="Tela atual do Nexly: Marketing" width="100%"></a>
</td>
</tr>
<tr>
<td width="50%" valign="top"><h4>Minha conta</h4>
<a href="docs/Screenshots/nexly-minha_conta.png"><img src="docs/Screenshots/nexly-minha_conta.png" alt="Tela atual do Nexly: Minha conta" width="100%"></a>
</td>
<td width="50%" valign="top"><h4>Recorrência</h4>
<a href="docs/Screenshots/nexly-recorrencia.png"><img src="docs/Screenshots/nexly-recorrencia.png" alt="Tela atual do Nexly: Recorrência" width="100%"></a>
</td>
</tr>
<tr>
<td width="50%" valign="top"><h4>Saúde e rotinas</h4>
<a href="docs/Screenshots/nexly-saude_e_rotinas.png"><img src="docs/Screenshots/nexly-saude_e_rotinas.png" alt="Tela atual do Nexly: Saúde e rotinas" width="100%"></a>
</td>
<td width="50%" valign="top"><h4>Tarefas</h4>
<a href="docs/Screenshots/nexly-tarefas.png"><img src="docs/Screenshots/nexly-tarefas.png" alt="Tela atual do Nexly: Tarefas" width="100%"></a>
</td>
</tr>
<tr>
<td width="50%" valign="top"><h4>Usuários</h4>
<a href="docs/Screenshots/nexly-usuarios.png"><img src="docs/Screenshots/nexly-usuarios.png" alt="Tela atual do Nexly: Usuários" width="100%"></a>
</td>
</tr>
</table>

</details>

<details>
<summary><strong>Site institucional e acesso · 5 telas</strong></summary>

<table>
<tr>
<td width="50%" valign="top"><h4>Página inicial</h4>
<a href="docs/Screenshots/nexly-pagina_inicial.png"><img src="docs/Screenshots/nexly-pagina_inicial.png" alt="Tela atual do Nexly: Página inicial" width="100%"></a>
</td>
<td width="50%" valign="top"><h4>Funcionalidades</h4>
<a href="docs/Screenshots/nexly-funcionalidades.png"><img src="docs/Screenshots/nexly-funcionalidades.png" alt="Tela atual do Nexly: Funcionalidades" width="100%"></a>
</td>
</tr>
<tr>
<td width="50%" valign="top"><h4>Planos e preços</h4>
<a href="docs/Screenshots/nexly-preco.png"><img src="docs/Screenshots/nexly-preco.png" alt="Tela atual do Nexly: Planos e preços" width="100%"></a>
</td>
<td width="50%" valign="top"><h4>Blog</h4>
<a href="docs/Screenshots/nexly-blog.png"><img src="docs/Screenshots/nexly-blog.png" alt="Tela atual do Nexly: Blog" width="100%"></a>
</td>
</tr>
<tr>
<td width="50%" valign="top"><h4>Login e cadastro</h4>
<a href="docs/Screenshots/nexly-login_e_cadastro.png"><img src="docs/Screenshots/nexly-login_e_cadastro.png" alt="Tela atual do Nexly: Login e cadastro" width="100%"></a>
</td>
</tr>
</table>

</details>

[Voltar ao topo](#topo)

---

<a id="site"></a>

## 5. Site e experiência pública

<div align="center">

<a href="https://nexly-web.vercel.app"><img src="https://img.shields.io/badge/ABRIR_A_PLATAFORMA-6366F1?style=for-the-badge&logo=vercel&logoColor=white" alt="Abrir a plataforma"></a>
<a href="https://nexly-web.vercel.app/funcionalidades"><img src="https://img.shields.io/badge/FUNCIONALIDADES-181717?style=for-the-badge" alt="Explorar funcionalidades"></a>
<a href="https://nexly-web.vercel.app/precos"><img src="https://img.shields.io/badge/CONHECER_OS_PLANOS-181717?style=for-the-badge" alt="Conhecer os planos"></a>

</div>

| Página                                                                                                  | Finalidade                                        |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| [Início](https://nexly-web.vercel.app)                                                                  | Produto, segmentos e conexão entre os módulos.    |
| [Funcionalidades](https://nexly-web.vercel.app/funcionalidades)                                         | Recursos e seus passos de uso.                    |
| [Preços](https://nexly-web.vercel.app/precos)                                                           | Planos e limites de profissionais.                |
| [Blog](https://nexly-web.vercel.app/blog)                                                               | Artigos, categorias e conteúdos de gestão.        |
| [Entrar](https://nexly-web.vercel.app/login)                                                            | Acesso a uma conta existente.                     |
| [Criar conta](https://nexly-web.vercel.app/cadastro)                                                    | Configuração de conta e negócio em quatro etapas. |
| [Suporte](https://nexly-web.vercel.app/suporte)                                                         | Orientações e contato de atendimento.             |
| [Termos](https://nexly-web.vercel.app/termos) e [privacidade](https://nexly-web.vercel.app/privacidade) | Informações publicadas sobre uso e dados.         |

O cadastro considera conta e empresa, segmento, recursos e aceite das condições. A configuração pode ser revista em Meu Nexly. Web e API são publicadas separadamente; o link do site não comprova disponibilidade contínua de todas as dependências.

[Voltar ao topo](#topo)

---

<a id="figma"></a>

## 6. Figma e identidade visual

<div align="center">

<a href="https://www.figma.com/design/nZXYARpSTmoeK3Gg7P0apb/Nexly?node-id=0-1"><img src="https://img.shields.io/badge/ABRIR_O_PROJETO_FIGMA-F24E1E?style=for-the-badge&logo=figma&logoColor=white" alt="Abrir o design no Figma"></a>
<a href="capturas/video_figma.mp4"><img src="https://img.shields.io/badge/VÍDEO_DO_PROTÓTIPO-181717?style=for-the-badge&logo=files&logoColor=white" alt="Abrir o vídeo histórico do protótipo"></a>

</div>

A prototipação orientou a navegação, os componentes e a identidade visual. A aplicação utiliza **Inter**, superfícies escuras e índigo nos destaques, com adaptações para computador e celular.

| Elemento                | Referência                                                       |
| ----------------------- | ---------------------------------------------------------------- |
| Tipografia da interface | Inter.                                                           |
| Fundo principal         | `#060608`.                                                       |
| Superfícies             | `#111116` e `#18181F`.                                           |
| Texto principal         | `#FAFAFA`.                                                       |
| Destaques e ações       | `#6366F1`.                                                       |
| Composição              | Navegação lateral no desktop e componentes adaptados ao celular. |

<details>
<summary><strong>Ver as referências históricas de prototipação</strong></summary>

Estas imagens foram preservadas como registro da etapa de design. Podem apresentar nomes, valores e estruturas anteriores. As capturas atuais estão no tour visual.

<table>
  <tr>
    <td width="50%"><a href="capturas/captura1.png"><img src="capturas/captura1.png" alt="Referência histórica da apresentação inicial" width="100%"></a><p align="center">Apresentação inicial do protótipo</p></td>
    <td width="50%"><a href="capturas/capturas2.png"><img src="capturas/capturas2.png" alt="Referência histórica das funcionalidades" width="100%"></a><p align="center">Funcionalidades no protótipo</p></td>
  </tr>
  <tr>
    <td width="50%"><a href="capturas/capturas3.png"><img src="capturas/capturas3.png" alt="Referência histórica dos planos, com valores anteriores" width="100%"></a><p align="center">Estudo de planos — valores históricos</p></td>
    <td width="50%"><a href="capturas/capturas4.png"><img src="capturas/capturas4.png" alt="Referência histórica do painel" width="100%"></a><p align="center">Estudo do painel</p></td>
  </tr>
</table>

</details>

A manutenção considera rótulos, foco, teclado, carregamento, mensagens de erro e preferência por movimento reduzido. Essas práticas não equivalem a certificação formal de acessibilidade.

[Voltar ao topo](#topo)

---

<a id="planos"></a>

## 7. Planos e assinaturas

Os valores abaixo correspondem ao catálogo documentado nesta revisão. O pacote compartilhado define os limites de profissionais e o backend mantém as regras de cobrança.

| Plano            | Código       | Mensalidade | Profissionais ativos por empresa |
| ---------------- | ------------ | ----------- | -------------------------------- |
| **Gratuito**     | `FREE`       | **R$ 0**    | 1                                |
| **Essencial**    | `BASIC`      | **R$ 49**   | 2                                |
| **Profissional** | `PRO`        | **R$ 99**   | 10                               |
| **Empresarial**  | `ENTERPRISE` | **R$ 199**  | 100                              |

A cota é compartilhada entre unidades. Profissionais cadastrados são distintos de contas de login e acessos simultâneos. Selecionar um plano na interface não confirma pagamento nem concede acesso pago.

```mermaid
sequenceDiagram
    participant U as Administrador
    participant W as Web Nexly
    participant A as API Nexly
    participant S as Stripe
    U->>W: Escolhe um plano
    W->>A: Solicita checkout
    A->>S: Valida preço e cria ou reutiliza sessão
    S-->>W: Endereço do Checkout
    W-->>U: Abre a página de pagamento
    S->>A: Envia webhook assinado
    A->>S: Consulta o estado atual
    A->>A: Reconcilia vínculo e plano
    U->>W: Consulta a situação
```

- O Stripe processa a **assinatura do Nexly**; vendas dos estabelecimentos no PDV têm outro propósito.
- Checkout e Customer Portal dependem do ambiente e do perfil autorizado.
- O retorno do checkout não comprova pagamento: webhook e reconciliação consultam o provedor.
- Há reconciliação agendada por empresa e ambiente, com fila persistida e deduplicação.
- `test` registra homologação sem alterar o plano comercial de produção. A mudança comercial ocorre no fluxo `live` com as condições exigidas.

[Limites compartilhados](packages/shared/src/plans.ts) · [Guia de pagamentos](docs/PAGAMENTOS.md) · [Módulo de assinaturas](apps/api/src/assinaturas)

[Voltar ao topo](#topo)

---

<a id="arquitetura"></a>

## 8. Arquitetura e caminho dos dados

O **monorepositório** reúne interface, API e pacotes compartilhados. npm Workspaces gerencia os pacotes; Turborepo organiza as tarefas.

```mermaid
flowchart TB
    U[Pessoa no navegador] --> W[Web — Next.js e React]
