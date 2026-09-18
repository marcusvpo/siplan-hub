# Central de Atualizações Orion

O projeto `orion-blog` foi incorporado ao Siplan Hub como o módulo nativo **Atualizações Orion**. A interface do blog foi preservada, mas autenticação, autorização, navegação, dados e imagens agora usam a infraestrutura do Hub.

## Rotas

- `/atualizacoes`: visão geral do módulo.
- `/atualizacoes/inicio`: central de leitura.
- `/atualizacoes/oriontn`, `/atualizacoes/orionpro` e `/atualizacoes/orionreg`: filtros navegáveis por produto.
- `/atualizacoes/posts/:id/:slug`: link estável para uma publicação.
- `/atualizacoes/gestao`: criação, edição, publicação, acompanhamento e sugestões.

A Home e a barra lateral usam `src/constants/menuItems.ts` como fonte central. As rotas são protegidas em `src/App.tsx` e o módulo ocupa a área de conteúdo responsiva do `MainLayout`.

## Permissões

| Recurso | Ações | Finalidade |
| --- | --- | --- |
| `menu_atualizacoes` | `view` | Exibir e acessar o módulo |
| `orion_updates` | `view` | Consultar publicações e usar leitura, reação, compartilhamento e sugestões |
| `orion_updates_management` | `view`, `create`, `edit`, `delete` | Administrar versões e publicações |

A migration concede leitura aos perfis existentes, preservando o acesso do blog de origem, e concede a gestão ao perfil `admin`. A tela `/admin/roles` pode alterar essas permissões posteriormente. Os handlers do frontend e as funções/RLS do banco aplicam as ações individualmente.

## Persistência

A migration `20260917180000_orion_updates_module.sql` cria:

- catálogo de produtos e versões;
- publicações, mídia e auditoria;
- leituras, reações e compartilhamentos por usuário autenticado;
- sugestões dos leitores;
- funções RPC para leitura, gestão e analytics;
- bucket `orion-updates` para imagens WebP otimizadas no navegador;
- policies RLS baseadas em `has_permission(...)`;
- notificação de changelog do novo módulo.

As funções de gestão são `SECURITY DEFINER`, revogadas de `PUBLIC` e liberadas somente para `authenticated`. Cada função valida a permissão necessária antes de acessar ou alterar dados. As tabelas continuam protegidas por RLS para acessos diretos.

## Adaptações do projeto original

- O servidor Fastify e o PostgreSQL próprios não são executados dentro do Hub.
- `src/hooks/useOrionUpdatesData.ts` concentra o acesso ao Supabase.
- A sessão do Siplan Hub substitui o login administrativo separado.
- O tema claro/escuro usa o provider global do Hub.
- Os estilos estão contidos por `.orion-blog-module`, inclusive diálogos renderizados em portal.
- Imagens inseridas no editor são validadas, limitadas, convertidas para WebP e armazenadas com UUID.
- O conteúdo HTML é sanitizado antes de salvar e antes de renderizar.
- Leituras e reações são vinculadas ao usuário autenticado, em vez de um identificador anônimo do navegador.

## Implantação e validação

Não execute `supabase db push` enquanto o histórico remoto do projeto não estiver reparado. Aplique a migration pelo fluxo documentado do repositório. Depois, valide um perfil leitor e um perfil gestor, inclusive em 320 px e no PWA instalado.

Comandos locais recomendados:

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```
