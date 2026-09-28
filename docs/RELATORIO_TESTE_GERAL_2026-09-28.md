# Teste geral do Siplan Hub — 28/09/2026

> Este documento preserva o diagnóstico inicial. As correções e a validação posterior estão em [RELATORIO_CORRECOES_TESTE_GERAL_2026-09-28.md](RELATORIO_CORRECOES_TESTE_GERAL_2026-09-28.md).

Foram encontrados três problemas funcionais reproduzidos no navegador, seis testes automatizados falhando, 22 erros de lint e 101 erros de TypeScript. Este trabalho registra o diagnóstico; as correções de funcionalidades não foram aplicadas.

## Resultados das validações

| Validação | Resultado |
| --- | --- |
| Frontend — `npm test` | 657 testes passaram; 6 falharam. 127 arquivos passaram; 3 falharam. |
| Worker — `npm test`, em `vm-worker/` | 13 testes passaram; 1 foi ignorado; nenhuma falha. O teste ignorado executaria o Codex CLI real. |
| `npm run lint` | 22 erros e 118 avisos. |
| `npx tsc --noEmit` | Código de saída 0, mas a configuração da raiz não verifica os arquivos da aplicação. |
| Frontend — `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` | 101 erros em 54 arquivos: 56 erros no código da aplicação e 45 em testes. |
| Vite — `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.node.json` | Passou. |
| Worker — `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`, em `vm-worker/` | Passou. |
| `npm run build` | Passou após ajuste do diretório temporário. Dois chunks ultrapassam 500 kB. |
| PWA de produção | Manifesto e service worker gerados; 289 arquivos no precache. A tela de login reabriu offline e mostrou o aviso de falta de conexão. |

Os 101 diagnósticos estão em [diagnosticos-typescript.txt](../artifacts/qa-2026-09-28/diagnosticos-typescript.txt). Os 22 erros de lint estão em [diagnosticos-lint.txt](../artifacts/qa-2026-09-28/diagnosticos-lint.txt).

## Problemas funcionais confirmados

### 1. Falha ao consultar o perfil deixa a aplicação carregando indefinidamente

**Prioridade: alta.**

- Local: [AuthContext.tsx](../src/contexts/AuthContext.tsx), especialmente o ramo de erro de `fetchUserRole`, próximo à linha 240; [ProtectedRoute.tsx](../src/components/ProtectedRoute.tsx), próximo à linha 8.
- Reprodução: abrir `/projects` com uma sessão válida e simular uma resposta HTTP 503 na consulta a `profiles`.
- Resultado: depois de mais de 15 segundos, a página continua exibindo apenas `Carregando...`, sem opção de recuperação.
- Causa: o ramo de erro define `role = "user"`, mas não encerra o carregamento de permissões. `ProtectedRoute` continua bloqueado por `permissionsLoaded === false`.
- Correção indicada: finalizar o estado pendente também nos ramos de erro e apresentar erro recuperável, preservando a proteção de acesso.

[Evidência visual](../artifacts/qa-2026-09-28/perfil-carregamento.png).

### 2. Publicação compartilhada do Orion Blog quebra quando o blog entra em manutenção

**Prioridade: alta.**

- Local: [App.tsx do Orion Blog](../src/modules/orion-updates/App.tsx), função `SharedPostPage`, linhas 143–146.
- Reprodução: abrir `/atualizacoes/posts/<id>` e responder `orion_updates_get_settings` com `public_enabled = false`.
- Resultado: aparece a tela genérica de erro da aplicação. O console registra `Rendered fewer hooks than expected`.
- Causa: o retorno da tela de manutenção ocorre antes de um `useEffect`. Quando a consulta termina, a quantidade de hooks executados muda entre renderizações.
- Correção indicada: executar todos os hooks antes de qualquer retorno condicional. Este mesmo problema aparece no lint como `react-hooks/rules-of-hooks`.

[Evidência visual](../artifacts/qa-2026-09-28/orion-manutencao.png).

### 3. Menu de notificações fica cortado no celular

**Prioridade: média.**

- Local: [NotificationBell.tsx](../src/components/NotificationBell.tsx), próximo à linha 120.
- Reprodução: usar viewport de 320 px, fechar o convite de instalação do PWA e abrir o sino de notificações.
- Resultado medido: o menu começa em `x = 0`, possui `width = 420` e termina em `right = 420`; 100 px ficam fora da viewport. A captura visual confirma o corte.
- Causa: largura fixa `w-[420px]`, sem limite vinculado à viewport.
- Correção indicada: limitar a largura à área disponível e conferir também textos longos, ações e rolagem vertical com notificações reais.

O documento mantém `scrollWidth = 320`, portanto medir apenas a rolagem da página não detecta esse corte.

[Evidência visual](../artifacts/qa-2026-09-28/notificacoes-mobile.png).

## Falhas dos testes e sua interpretação

Os cinco testes de componentes que falharam foram executados novamente de forma isolada e apresentaram as mesmas falhas.

| Arquivo | Falhas | Diagnóstico |
| --- | --- | --- |
| `src/test/changelog-notifications.test.tsx` | 3 | Os testes usam `fireEvent.click` para abrir um dropdown Radix acionado por evento de ponteiro. O menu permanece fechado no teste. No navegador, o sino abriu o menu; o problema funcional confirmado nesse menu é a largura mobile. Rever a simulação de interação antes de interpretar essas falhas como indisponibilidade das notificações. |
| `src/test/cs-cx-engagement-permissions.test.tsx` | 1 | O teste tenta abrir “Nova solicitação” sem selecionar um cartório. O handler exige essa seleção e retorna com aviso. A preparação do teste está incompleta para o fluxo atual. |
| `src/test/cs-cx-engagement-permissions.test.tsx` | 1 | O teste espera classes antigas do grid de filtros. O componente utiliza outra composição responsiva. Atualizar a expectativa após validar o comportamento visual desejado. |
| `src/test/rls-invariants.test.ts` | 1 | O banco contém `orion_update_settings_public_select`, com leitura pública irrestrita. A tabela não consta nas exceções do teste. A migration `20260918100000_orion_updates_public_link_setting.sql` cria essa policy para as configurações públicas de manutenção do blog. Revisar a necessidade de acesso direto à tabela e conciliar a policy com o teste; a falha não demonstra, por si só, exposição de dados de projetos. |

O teste de RLS consultou o banco real em modo de leitura. A verificação de escrita anônima e as demais invariantes dessa suíte passaram. Nenhuma migration foi aplicada.

## Lacunas da checagem de tipos e lint

`tsconfig.json` declara `files: []` e referências para outras configurações. Executar somente `tsc --noEmit` nessa configuração não percorre o frontend. É necessário executar a configuração da aplicação e a do Vite explicitamente, ou adotar um comando que percorra corretamente as referências.

Há erros de tipos no Dashboard e nos relatórios, formulários de infraestrutura, transição operacional, Kanban, CS/CX, gráficos, exportações e editor de conhecimento. Os diagnósticos também incluem fixtures de testes incompletas e ausência de tipos globais do Vitest. `tsconfig.app.json` está com `strict: false`, apesar da convenção de TypeScript strict registrada no `AGENTS.md`.

O lint inclui cinco erros da cópia de projeto em `Nova pasta/orion-blog/` e um erro de um arquivo compilado em `vm-worker/dist/`. Os outros 16 são de arquivos em `src/`, incluindo um teste. O ignore atual de `dist` não exclui esse diretório compilado do worker. A regra de hooks do Orion Blog é um erro funcional confirmado; os demais diagnósticos precisam ser tratados conforme o arquivo e a regra.

## Cobertura no navegador

O Chrome headless abriu a aplicação local com sessões, permissões e respostas do Supabase simuladas. As chamadas HTTP externas desses testes foram interceptadas. Não foram criados, editados ou excluídos registros em produção.

- Navegação inicial de 68 URLs estáticas em 320 × 740 px, com listas vazias simuladas e permissão de administrador.
- Conferência desktop em 1440 × 900 px, incluindo Home, indicadores, projetos, relatórios, calendário, Meu Dia, Comercial, Conversão, CS/CX, SD e gestão do Orion Blog.
- Usuário anônimo redirecionado para login em Home, projetos, perfis de acesso, rotinas e logs de assistentes.
- Usuário autenticado sem permissões bloqueado em projetos, área administrativa e rotinas.
- Login, recuperação de senha, modal de contato, menu de notificações e publicação em manutenção.
- NPS inexistente exibindo “Link inválido”; roadmap inexistente exibindo “Link Inválido” após simular a resposta `null` prevista pela API.
- Build de produção servido localmente; registro do service worker e reabertura offline do login.

Não houve rolagem horizontal da página nos estados iniciais das 68 URLs mobile. Isso não elimina cortes em componentes sobrepostos, como o menu de notificações. Elementos decorativos, área de impressão fora da tela e controles intencionalmente roláveis não foram classificados automaticamente como erros.

A matriz resumida está em [cenarios-navegador.json](../artifacts/qa-2026-09-28/cenarios-navegador.json). Ela preserva também tentativas auxiliares: duas URLs desktop inexistentes, uma resposta simulada de roadmap com formato incorreto posteriormente corrigida e uma tentativa de emular `display-mode: standalone` que permaneceu `false`. Essas tentativas não foram usadas para concluir que há defeitos nessas rotas ou que a instalação standalone foi validada.

## Limitações do ambiente e da cobertura

- O sandbox bloqueou inicialmente o cache do npm, a consulta do usuário do Windows usada pelo `tsx` e a resolução do caminho temporário curto `BRUNO~1.FER`. A verificação de tipos da raiz foi repetida com cache temporário; os testes do worker e o navegador foram executados com a autorização automática do ambiente. O build passou usando diretório temporário dentro de `node_modules/.cache/`.
- A instalação física do PWA em Android/iOS e as áreas seguras desses dispositivos não foram testadas. O modo standalone não foi ativado pela emulação utilizada.
- Não foram executados fluxos completos de criação, edição, upload ou exclusão contra o backend real. Estados iniciais vazios e dados simulados não substituem a homologação com dados reais e perfis representativos.
- Os problemas registrados já estavam presentes antes deste trabalho. Não houve alteração no código funcional, commit, push ou deploy.

## Ordem sugerida para correção

1. Corrigir o carregamento de permissões após falha de perfil e o hook condicional do Orion Blog.
2. Corrigir a largura do menu de notificações e conferir seu conteúdo em 320 e 390 px.
3. Tornar a checagem de tipos efetiva e resolver os 56 erros do código da aplicação.
4. Corrigir os testes desatualizados, revisar a policy pública de configurações e tratar os erros de lint.
5. Reexecutar as validações afetadas e completar a homologação de CRUD e PWA em dispositivos reais.
