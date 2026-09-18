# Entrega para a equipe integradora

## O que está sendo entregue

Código-fonte do blog completo, mantendo React/TypeScript, Node.js/Fastify/TypeScript e PostgreSQL. Não é um plugin específico de outro framework nem uma biblioteca React que precisa ser importada pelo hospedeiro. A forma preparada de acoplamento é um **módulo web independente, na mesma origem do sistema principal**, publicado, por exemplo, em `https://sistema.example.com/blog/inicio`.

O sistema principal continua livre para usar outra linguagem. Encaminha `/blog/` ao frontend/proxy do blog; o proxy encaminha `/blog/api/v1/` para a API. O backend do blog valida os administradores pelo adaptador descrito em [host-integration.md](host-integration.md). A stack e o layout existentes não foram substituídos.

## Conteúdo do pacote

| Caminho | Responsabilidade |
| --- | --- |
| `apps/web` | Interface do leitor e Gestão, imagens de identidade e configuração de build |
| `apps/api` | API, validação, autorização, uploads e acesso ao banco |
| `database/migrations` | Estrutura oficial do banco, aplicada em ordem |
| `deploy` | Dockerfiles, Compose, nginx e exemplo de variáveis de produção |
| `docs` | Contrato de integração, implantação e entrega |
| `scripts` | Testes e exportador |
| `package-lock.json` | Versões de dependências para `npm ci` |
| `RELEASE_MANIFEST.json` | Lista dos arquivos do ZIP, tamanhos e hashes SHA-256 |

Não acompanha: credenciais, `.env` reais, dependências instaladas, builds locais, logs, screenshots de testes, histórico Git, protótipos antigos, publicações ou dados de leitores. Os ícones/logos de identidade fazem parte do código; imagens importadas nas publicações estão no banco e **não** acompanham o ZIP.

## Gerar uma nova entrega

Na raiz do projeto, com Node.js 24:

```sh
npm ci
npm run typecheck
npm run build
npm run test:export
npm run export:project
```

O último comando cria `exports/orion-blog-VERSAO-HASH.zip` e o arquivo `.zip.sha256`. Entregue ambos por canal privado ou publique o código revisado em um repositório privado. O mesmo conteúdo produz o mesmo hash; uma mudança produz outro nome, sem sobrescrever a entrega anterior. Não é necessário instalar um compactador para gerar o ZIP. O teste de extração usa PowerShell no Windows ou `unzip` no Linux/macOS.

Para conferir o SHA-256 recebido: `Get-FileHash arquivo.zip -Algorithm SHA256` no PowerShell, ou `sha256sum arquivo.zip` no Linux. Compare com o `.sha256` enviado por canal confiável. O hash detecta alterações; não é uma assinatura de autoria.

O exportador usa uma lista de permissão e bloqueia cópia de segredos conhecidos dos `.env` locais. Ainda é necessário revisar o conteúdo antes de compartilhar: um exportador não substitui auditoria de segredos/licenças. Novos diretórios e novos assets devem ser incluídos explicitamente em `scripts/export-project.mjs`. Revise também `.dockerignore` ao alterar o contexto de build.

## O que a equipe do sistema principal deve fazer

1. Confirmar o endereço público e o subcaminho (`/blog/` é o exemplo, não uma obrigação).
2. Implementar **no servidor** `apps/api/src/auth/host-adapter.ts`, validando a sessão e a permissão real de administrador. Sem isso, a Gestão fica bloqueada por projeto.
3. Provisionar PostgreSQL, segredos exclusivos e credenciais separadas para migração e operação.
4. Configurar o proxy HTTPS, o encaminhamento seguro da sessão e os IPs confiáveis dos proxies.
5. Seguir [deployment.md](deployment.md), executar as migrações e homologar antes de disponibilizar aos clientes.
6. Definir backup/restauração, monitoramento, retenção dos dados e responsáveis por atualizações de segurança.

Não há integração real com o hospedeiro dentro deste pacote: ela depende do contrato de autenticação do outro projeto. Nunca substitua esse contrato por `isAdmin` enviado pelo navegador, uma variável VITE, uma query string ou um header sem validação confiável.

## Dados existentes e limites

O pacote instala a estrutura do blog; não transfere o conteúdo atual. Se for necessário levar publicações, capas, sugestões e métricas, faça uma migração de dados separada, com backup protegido e autorização de acesso. Não envie dumps junto com o código. `ca_imagens` guarda os uploads; inclua-a nos backups e confira a política de retenção de sugestões/motivos.

Uma instalação compartilha os dados entre seus administradores autorizados. Isolamento por cartório/tenant não está implementado. Não use a identidade do administrador como promessa de segregação de dados entre clientes.

O ambiente local existente não é convertido automaticamente para produção. Nenhuma credencial real é modificada, e o exportador não executa migrações, abre portas nem publica o projeto.
