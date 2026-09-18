# Implantação e acoplamento

## Arquitetura preparada

Use o blog como aplicação independente atrás do proxy do sistema principal, na mesma origem HTTPS. Exemplo:

```text
https://sistema.example.com/blog/inicio
  → proxy HTTPS do hospedeiro (preserva /blog/)
  → web do blog :8080
      /blog/*        → React (fallback SPA)
      /blog/api/v1/* → API :3333/api/v1/* → PostgreSQL com TLS
```

API e PostgreSQL não devem ter portas públicas. A API não deve ficar acessível diretamente por clientes, contornando a validação do proxy/hospedeiro. Não é necessário rodar o frontend do sistema principal em React.

## Configurações

| Variável | Onde | Uso |
| --- | --- | --- |
| `VITE_BLOG_BASE_PATH` | Build do frontend | `/` ou subcaminho como `/blog/`; nunca contém segredos |
| `BLOG_BASE_PATH` | API/Compose | Mesmo prefixo público; cookies e build Docker do frontend |
| `APP_ORIGIN` | API | Origem exata, ex.: `https://sistema.example.com`, sem `/blog/` ou barra final |
| `ADMIN_AUTH_MODE` | API | `host` na entrega integrada; `local` apenas se houver intenção de usar login próprio |
| `COOKIE_SECRET` | API | Segredo aleatório de pelo menos 32 caracteres, exclusivo da instalação |
| `DATABASE_URL` | API | Conexão PostgreSQL do usuário de runtime |
| `MIGRATION_DATABASE_URL` | Compose, serviço migrate | Conexão do proprietário da estrutura, não repassada à API web |
| `TRUST_PROXY_CIDRS` | API | IPs/CIDRs exatos dos proxies confiáveis, separados por vírgula; vazio = não confiar |
| `API_PROXY_TARGET` | Vite, desenvolvimento | Endereço interno da API; não é configuração pública de produção |

O prefixo aceita segmentos com letras, números, `_` e `-`. No Compose, comece e termine com `/`. Alterou o prefixo? Refaça o build do frontend e atualize a API/proxy juntos. O app não aceita uma URL arbitrária de API externa no navegador: a implantação preparada usa mesma origem.

Rotas, filtros, voltar/avançar, links compartilháveis, ícones, capas e imagens do editor usam o prefixo. No banco, referências de imagens permanecem canônicas em `/api/v1/...`, sem prender publicações a um domínio ou subcaminho. Se mudar o endereço de uma instalação já publicada, mantenha redirecionamentos dos links antigos no proxy do hospedeiro.

## Banco e credenciais

Use um banco PostgreSQL dedicado ao blog (o Compose de desenvolvimento usa PostgreSQL 16). O serviço de banco deve exigir TLS e possuir certificado confiável. Em produção, a API valida certificados; não use `NODE_TLS_REJECT_UNAUTHORIZED=0` nem opções de URL que desativem essa validação. Certificados privados podem ser confiados via `NODE_EXTRA_CA_CERTS`, com o arquivo de CA montado somente para leitura na API e no migrador.

Crie um proprietário para migrações e outro usuário para a aplicação. O usuário da aplicação não deve ser superusuário, proprietário das tabelas, nem ter `CREATEDB`, `CREATEROLE` ou `BYPASSRLS`. O DBA deve conceder conexão, uso do schema, `SELECT/INSERT/UPDATE/DELETE` nas tabelas funcionais `ca_*` e uso das sequências necessárias. Não conceda escrita em `ca_migrations` ao runtime. Conceda permissões dos novos objetos após cada migração; restrinja a criação no schema e os acessos ao banco por rede. RLS não é ativada automaticamente: não há acesso direto do navegador ao PostgreSQL, nem isolamento multi-tenant.

As migrações oficiais estão em `database/migrations`. Execute uma instância do migrador por vez. Antes de atualizar uma instalação com dados, faça backup e teste a restauração. Migrações não têm rollback destrutivo automático; reverter apenas uma imagem não desfaz mudanças de schema. O arquivo antigo `central-atualizacoes-schema.sql` não é usado nem acompanha a entrega.

## Opção A — Docker Compose

Requer Docker com Compose, acesso ao registro das imagens e PostgreSQL já provisionado. Os comandos abaixo partem da raiz do projeto extraído.

1. Implemente e homologue o adaptador do hospedeiro conforme [host-integration.md](host-integration.md).
2. Copie `deploy/.env.example` para `deploy/.env` e preencha os valores reais somente no destino. Proteja esse arquivo. O Compose não altera `apps/api/.env`.
3. Gere um segredo novo no destino: `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`. Não o coloque no código, em VITE, em argumentos de build nem em logs.
4. Construa as imagens, migre e suba os serviços:

```sh
docker compose --env-file deploy/.env -f deploy/compose.production.yml build
docker compose --env-file deploy/.env -f deploy/compose.production.yml --profile tools run --rm migrate
docker compose --env-file deploy/.env -f deploy/compose.production.yml up -d api web
```

Os Dockerfiles mantêm apenas dependências de produção na API e arquivos estáticos no web. Ambos executam sem root. O sistema de arquivos é somente leitura, com temporários separados. O serviço `migrate` não é iniciado por `up` normal, e a API não executa migrações automaticamente. O modo de autenticação do Compose é explicitamente `host`.

O web expõe apenas `127.0.0.1:8080` do servidor. Configure o proxy HTTPS externo para encaminhar `/blog/` a esse endereço **preservando o prefixo, os cookies autorizados, Origin e Host**. Se o proxy externo estiver em outro container/host, ajuste a rede privada; `127.0.0.1` nesse container não aponta para o servidor do blog. Não exponha a porta sem TLS como atalho.

O proxy externo deve sobrescrever headers de encaminhamento recebidos do cliente. Cadastre em `TRUST_PROXY_CIDRS` somente os saltos confiáveis, inclusive o web interno; use endereços estáveis/rede dedicada sob seu controle e não redes compartilhadas com usuários. Sem essa configuração, vários leitores atrás do mesmo proxy podem compartilhar os limites por IP. Não use `true`, `0.0.0.0/0` ou um header arbitrário de administrador. Caso o adaptador precise de protocolo/origem encaminhados, ajuste o proxy com a equipe do hospedeiro: a segurança de cookies do blog vem de `NODE_ENV=production`, e a origem esperada vem de `APP_ORIGIN`, não de headers livres.

Após homologar, fixe os digests das imagens base e identifique suas imagens de entrega com `RELEASE_TAG`, seguindo o processo da infraestrutura. Atualize-os regularmente. O Compose fornecido é uma base de implantação de instância única, não um orquestrador de alta disponibilidade.

## Opção B — Sem Docker

Use Node.js 24 e npm 11. Após extrair:

```sh
npm ci
npm run build
```

Antes do build, defina `VITE_BLOG_BASE_PATH` no ambiente ou em `apps/web/.env` (copiado do exemplo). O backend usa variáveis do processo ou `apps/api/.env`; no servidor real use `NODE_ENV=production`, `ADMIN_AUTH_MODE=host`, origem HTTPS, banco TLS, segredo e prefixo corretos.

Com a credencial de migração temporariamente em `DATABASE_URL`, execute `npm run db:migrate:prod`. No processo de operação, use apenas a credencial de runtime e execute `npm start`, supervisionado pelo serviço do sistema operacional. Não use `npm run dev` ou `vite preview` para servir produção.

Sirva `apps/web/dist` com um servidor estático e adapte `deploy/nginx.conf.template` ou seu equivalente. Gere o exemplo nginx com `VITE_BLOG_BASE_PATH` definido e `node deploy/render-nginx.mjs`; substitua o upstream `api:3333` pelo endereço privado da sua API. Ajuste o caminho físico `/srv/orion`, replique o fallback SPA, mantenha arquivos estáticos ausentes como 404, preserve `/api` para o backend e não armazene respostas administrativas no cache.

O template fornece CSP, bloqueio de recursos executáveis externos, proteção contra MIME sniffing e restrição de frames à mesma origem. Scripts não precisam de `unsafe-inline`; estilos inline são permitidos porque o editor/layout os utilizam. HTTPS, certificado e HSTS são responsabilidade do proxy externo. Não remova proteções apenas para fazer um iframe de outra origem funcionar: esse cenário requer avaliação própria.

## Homologação antes da publicação

- Abrir `/blog/`, `/blog/inicio`, filtros e link direto de publicação; atualizar a página em cada rota.
- Verificar logo, imagens de conteúdo/capa, zoom, temas, desktop/mobile e histórico do navegador.
- Confirmar que leitores não veem o botão Gestão, e chamadas diretas à API administrativa são recusadas.
- Com um administrador real, alternar Gestão/leitor, criar/editar, enviar imagem, conferir métricas e sugestões. Revogar a permissão no hospedeiro e testar novamente.
- Confirmar CSRF/origem, cookies Secure/HttpOnly, rate limit por visitante/IP real e ausência de segredos nas respostas/logs.
- Testar backup/restauração, monitoração e indisponibilidade do banco. `/health` da API e `/healthz` do web são verificações de processo, não testes de disponibilidade do PostgreSQL.
- Testar `npm run typecheck`, `npm run build`, `npm run test:base-path`, `npm run test:host-integration` e `npm run test:export` em homologação. Testes com banco precisam de permissão para criar schemas temporários; não dê essa permissão ao runtime de produção.

Os testes de navegador usam Edge por padrão. Para Chromium do Playwright: `npx playwright install chromium` e `TEST_BROWSER_CHANNEL=chromium` no ambiente. O teste de subcaminhos não usa dados reais; as suítes de integração com banco usam schemas isolados. Não execute testes de desenvolvimento sobre produção.

Para verificar também os containers sem conectar ao banco, construa as imagens de teste e rode:

```sh
docker build -f deploy/Dockerfile.api -t orion-blog-api:export-check .
docker build -f deploy/Dockerfile.web --build-arg BLOG_BASE_PATH=/blog/ -t orion-blog-web:export-check .
npm run test:deployment
```

Esse teste cria uma rede e dois containers temporários, publica apenas uma porta aleatória no loopback e os remove no final. Confere proxy, fallback, assets, CSP, cookies, Sharp, presença de migrações e Gestão negada sem adaptador. Não valida a conexão com o PostgreSQL de produção, nem o contrato real do hospedeiro.

## Referências de infraestrutura

O prefixo do frontend usa o [base path do Vite](https://vite.dev/guide/build.html#public-base-path). Os arquivos de containers seguem a separação descrita em [Compose em produção](https://docs.docker.com/compose/how-tos/production/) e a imagem [nginx unprivileged](https://github.com/nginx/docker-nginx-unprivileged). Configure a confiança em proxies conforme a [referência do Fastify](https://fastify.dev/docs/latest/Reference/Server/#trustproxy).
