# Gestão acoplada ao sistema principal

O blog não precisa de outro provedor de autenticação, formulário de login ou senha no modo integrado. O sistema principal continua responsável por autenticar o usuário, determinar se ele é administrador e revogar sua sessão. O blog valida essa decisão no **backend em cada requisição administrativa**.

## Modos

| Configuração da API | Origem da permissão | Tela `/gestao` sem permissão |
| --- | --- | --- |
| `ADMIN_AUTH_MODE=local` (padrão) | Login administrativo existente | Login próprio do blog |
| `ADMIN_AUTH_MODE=host` | Adaptador da sessão do sistema principal | Acesso restrito, sem login próprio |

O padrão local preserva o uso independente enquanto o outro projeto não estiver disponível. Não existe modo público, parâmetro de URL ou chave no navegador que libere a Gestão.

## Acoplamento

1. Aplique `npm run db:migrate` (inclui `007_host_admin_identity`). Não execute o seed de administrador no modo integrado; ele não cria contas nesse modo.
2. Implemente `apps/api/src/auth/host-adapter.ts` usando a validação real de sessão/permissões do sistema principal.
3. Configure `ADMIN_AUTH_MODE=host`, `APP_ORIGIN` com a origem exata do frontend e um `COOKIE_SECRET` forte, privado e estável. `ADMIN_EMAIL` e `ADMIN_PASSWORD_HASH` não são necessários no modo host. Reinicie a API.
4. Publique frontend, API do blog e aplicação principal na mesma origem. A entrega suporta `/` ou um prefixo como `/blog/`: nesse exemplo, o proxy encaminha `/blog/api/v1/` para `/api/v1/` interno. Configure frontend/API com o mesmo prefixo conforme [deployment.md](deployment.md). A sessão do sistema principal precisa chegar à API do blog. Mantenha HTTPS e as proteções de cookie do hospedeiro.

Sem adaptação, a função retorna `null`: leitores continuam usando o blog, mas ninguém entra na Gestão. Isso é intencional; não há conta administrativa fictícia ou liberação de desenvolvimento.

### Contrato do adaptador

```ts
type HostIdentity = {
  subject: string;   // ID imutável, único e não vazio, até 200 caracteres
  email: string;     // E-mail validado, até 254 caracteres
  isAdmin: boolean;  // Permissão atual verificada no backend
  sessionId: string; // Identificador da sessão validada, até 512 caracteres
};
type HostIdentityResolver = (request: FastifyRequest) => Promise<HostIdentity | null>;
```

- Valide a sessão no mecanismo oficial do hospedeiro (serviço interno, repositório de sessões ou middleware autenticado). Verifique validade, expiração, usuário ativo, permissão administrativa e, quando aplicável, tenant e audiência.
- `subject` deve identificar o mesmo usuário mesmo quando seu e-mail mudar. Em ambientes com várias origens/tenants, use um identificador com namespace, por exemplo `sistema:tenant:usuario`. Este blog compartilha publicações entre seus administradores; o namespace **não implementa segregação de conteúdo por tenant**.
- `sessionId` deve mudar a cada login e não deve ser inventado a partir apenas do ID do usuário. Pode ser o hash de um identificador real de sessão; não precisa expor a credencial original.
- Retorne `null` para sessão ausente/expirada/revogada. Um usuário comum pode retornar `isAdmin: false`. Se a verificação ficar indisponível, lance um erro: o acesso será negado, sem fallback para login local.
- Nunca use diretamente `isAdmin`, e-mail, ID ou papéis vindos de query strings, localStorage, `postMessage` ou headers do navegador. Um proxy só pode informar identidade com canal autenticado, bloqueio de acesso direto à API e remoção de headers externos; esse protocolo não é implementado aqui.
- Não use o token CSRF como credencial de autenticação. Não acrescente uma lista fixa de administradores no frontend.

A API registra o adaptador como `app.decorate('resolveBlogHostIdentity', resolveHostIdentity)` em `server.ts`. Se as rotas forem montadas dentro do backend Fastify do sistema maior, registre o resolver no escopo ancestral **antes** das rotas. Cookies, `APP_ORIGIN`, tratamento de erros e proteções existentes ainda são necessários. Em backends de outra tecnologia, a equipe deverá implementar uma consulta autenticada entre servidores; o blog não pressupõe framework ou protocolo externo.

## Alternância Gestão / leitor

- O frontend consulta `GET /api/v1/admin/access`, com cookies e sem cache. Somente a resposta autenticada da API habilita o botão **Acessar Gestão**.
- Dentro da Gestão, **Visualização do leitor** retorna à página/filtros de leitura anteriores; na ausência deles, retorna a `/inicio`. Esse botão não encerra a sessão do sistema principal. Fica desabilitado durante a criação/edição para evitar perda acidental do formulário.
- Usuários comuns não veem o botão e não acessam dados administrativos por URL ou chamada direta à API.
- No modo host, não há campos de e-mail/senha nem botão **Sair** da conta do blog. Os endpoints de login/logout local recusam a operação. A saída da conta pertence ao sistema principal.
- O acesso é revalidado ao carregar o blog, ao voltar à janela/guia e após uma resposta administrativa de acesso negado. O hospedeiro pode sinalizar login, logout ou troca de usuário com `window.dispatchEvent(new Event('orion:access-changed'))`; o evento apenas solicita nova consulta ao backend, nunca concede acesso.
- Alterar ou esconder elementos no navegador não altera as permissões da API. Se houver falha na consulta, o botão desaparece e a Gestão permanece bloqueada.

## Autoria, imagens e proteção de escrita

A migração acrescenta `host_subject`/`host_email` em `ca_admins`, com índice único para o subject. Um registro técnico é criado no primeiro acesso autorizado para manter as chaves estrangeiras de autoria, imagens e auditoria. Ele não possui senha utilizável e não pode autenticar pelo login local. Identidades não são unificadas por coincidência de e-mail; um administrador local com o mesmo e-mail continua separado. Nenhuma sessão do hospedeiro é salva em `ca_admin_sessoes`.

O adaptador é consultado a cada requisição (apenas uma vez dentro da mesma requisição). Portanto, retirar a permissão no hospedeiro impede a próxima operação, mesmo com a Gestão já aberta. O indicador interno `ativo=false` também pode bloquear o registro técnico; o acoplamento nunca o reativa automaticamente.

O endpoint de acesso fornece um token anti-CSRF vinculado ao subject e à sessão atual por HMAC. Escritas exigem esse token e `Origin` igual a `APP_ORIGIN`, além de nova validação do hospedeiro. Uma troca de sessão invalida o token anterior. Uploads e prévias privadas continuam passando pela mesma autorização. O frontend não armazena tokens de autenticação; o token CSRF fica somente em memória.

## Validação e limites do escopo

`npm run test:host-integration` usa um hospedeiro simulado **apenas no teste**, banco PostgreSQL em schema temporário e navegador headless. Cobre ausência de adaptador, usuários comuns, identidade adulterada, autorização por requisição, CSRF/origem, revogação, autoria, imagens, alternância de tela, ausência de login adicional, falhas e responsividade.

A integração real ainda exige implementar o adaptador e validar o encaminhamento da sessão com a equipe do sistema principal. Os `.env` locais existentes não são alterados para ativar o modo host. A configuração de produção fornecida usa host explicitamente. Incorporação em iframe de outra origem, SSO entre domínios e isolamento de dados por tenant continuam exigindo requisitos próprios. Subcaminhos de implantação estão preparados; veja o [guia de implantação](deployment.md).
