# Correções do teste geral — 28/09/2026

Os três defeitos funcionais confirmados no diagnóstico inicial foram corrigidos,
assim como os seis testes que falhavam, os 22 erros de lint e os 101 diagnósticos
de TypeScript. A revisão também corrigiu filtros de gráficos e preservação dos
dados do documento de transição. Este relatório registra a validação local do
snapshot `fe36114`, anterior à integração e publicação autorizadas posteriormente.
Os resultados abaixo pertencem a essa etapa; a versão de publicação incorpora
também os nove commits que já estavam na `main` remota.

## Comportamento corrigido

- **Acesso:** falhas e timeouts de sessão, perfil ou permissões encerram o
  carregamento e oferecem nova tentativa. Acesso parcial ou respostas de uma
  sessão anterior não concedem permissões. Renovação de token e retorno à aba
  revalidam o mesmo usuário sem desmontar formulários e perder drafts. Logout
  revoga o acesso imediatamente e bloqueia novo login até o SDK concluir a saída.
- **Orion Blog:** manutenção de um post compartilhado executa os hooks em ordem
  estável. A transição de conteúdo aplica `inert` pelo DOM, compatível com React
  18, e retira o foco de controles temporariamente indisponíveis.
- **Notificações:** menu limitado à viewport, safe areas, rolagem interna,
  textos longos completos e ações de pelo menos 44 px. Erro de carregamento tem
  nova tentativa; itens retidos não são marcados como lidos durante erro/loading.
- **Gráficos:** callbacks compatíveis com Recharts 3 aplicam os filtros de mês do
  NPS, natureza de chamado, data e analista do SD. Filtros de status mantêm a
  exclusão dos registros encerrados e de valores legados cancelados.
- **Transição:** patches preservam datas, flags de ambiente, acompanhamento e
  credenciais omitidas. `ProjectUpdate` representa atualizações de alguns
  estágios sem tornar opcionais os campos obrigatórios de cada estágio. O setter
  funcional do autosave recebe as alterações locais e os resultados de IA.
- **Contratos:** corrigidos campos de autoria/data de solicitações, normalização
  de virtualização, união de motores/ferramentas, payloads de conversão e Copilot,
  editor Tiptap, YAML, exportações e fixtures de testes. As regex de vídeos
  removem emojis inteiros e preservam outros caracteres Unicode.
- **Build:** layout autenticado carrega sob demanda; AJV fica separado do
  renderizador de formulários. A divisão foi verificada no bundle produzido.
  Dependências circulares entre chunks são erro fatal, e nenhum JavaScript pode
  ultrapassar 500 kB sem falhar a validação.

## Prevenção de regressões

Foram adicionados 71 cenários automatizados, incluindo falhas e recuperação de
Auth, troca de usuário, respostas atrasadas, renovação de sessão, logout lento,
manutenção, notificações, cliques em gráficos, autosave e preservação de estágios.

`npm run check` integra lint, tipos, testes, build/PWA, Chrome e worker. O
workflow [.github/workflows/quality.yml](../.github/workflows/quality.yml) está
preparado para pull requests e pushes em `main`. Ele usa configuração fictícia
do Supabase e não recebe credenciais de produção. Para impedir merge com falha,
o check deve ser exigido na proteção da branch após a publicação do workflow.
O fluxo de publicação passou a exigir também lint, tipos, testes e build na
própria Vercel, pelo `npm run build:release` declarado em `vercel.json`.

O script [check-browser-regressions.mjs](../scripts/check-browser-regressions.mjs)
valida geometria real em 320, 390 e 1440 px, recuperação de acesso, menu vazio e
conteúdo longo, manutenção e login offline. Usa sessões fictícias, intercepta
as APIs externas e encerra apenas os processos de preview/Chrome que iniciou.

## Validação final

| Verificação | Resultado |
| --- | --- |
| Frontend — `npm test` | 734 testes passaram; 134 arquivos; nenhuma falha. |
| Aplicação/Vite — `npm run typecheck` | Passou; analisa o frontend e a configuração do Vite. |
| Lint — `npm run lint` | Zero erros; 38 avisos preexistentes. |
| Worker — tipos e testes | Tipos passaram; 13 testes passaram; 1 smoke do Codex CLI real ignorado. |
| RLS — banco real | 7 invariantes passaram; somente consultas de leitura. |
| Build/PWA | Passou; 378 chunks, maior com 407,28 kB; 383 entradas no precache. |
| Chrome — desktop, mobile e PWA | 16 cenários passaram; nenhuma exceção JavaScript; login offline com service worker ativo e cache HTTP desabilitado. |

O [resumo da validação](../artifacts/qa-correcoes-2026-09-28/validacao.json),
o [relatório do Chrome](../artifacts/qa-correcoes-2026-09-28/cenarios-navegador.json)
e as capturas de tela estão preservados em
[`artifacts/qa-correcoes-2026-09-28/`](../artifacts/qa-correcoes-2026-09-28/).
Os logs completos de execução permanecem em `node_modules/.cache/qa-fixes/`.

## Revisão de RLS e limites

A leitura pública de `orion_update_settings` é parte do contrato das páginas
públicas de manutenção. O teste admite apenas a policy existente pelo nome exato
e valida também o conjunto de colunas, a projeção da RPC pública sem autoria,
a permissão exigida pela RPC de alteração e a ausência de escrita anônima.
O teste geral de escrita passou a verificar também policies destinadas a `anon`.
Nenhuma policy ou permissão do banco foi alterada para fazer o teste passar.

Os 38 avisos restantes tratam de organização para Fast Refresh e dependências
de hooks. Os efeitos revisados têm comportamento intencional, como preservar
drafts ao atualizar a consulta; as regras não foram desabilitadas. O frontend
mantém a configuração preexistente de strictness: esta correção garante que o
typecheck realmente verifica os arquivos, sem afirmar migração completa para
`strict: true`.

A verificação de Chrome usa dados controlados e não substitui integração com
produção ou teste em um celular com PWA instalado. O smoke do Codex CLI permanece
opcional; os testes de RLS são ignorados em ambientes sem `SUPABASE_DB_URL`,
incluindo o workflow com configuração fictícia. A [migration de changelog](../supabase/migrations/20260928170000_general_regression_fixes_changelog.sql)
foi preparada com notificações por recurso; sua aplicação deve seguir o fluxo
de migrations do projeto. `supabase db push` não foi executado.
