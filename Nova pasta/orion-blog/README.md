# Central de Atualizações Orion

Blog público de atualizações dos produtos Orion, com área administrativa protegida.

## Entrega e acoplamento

Para entregar este projeto a outra equipe, comece pelo [guia de entrega](docs/delivery.md). Inclui configuração de produção, Docker opcional, migrações e contrato de autorização do hospedeiro, mantendo as tecnologias existentes.

- [Implantação em `/` ou `/blog/`](docs/deployment.md)
- [Integração de administradores no backend](docs/host-integration.md)
- `npm run export:project`: gera código-fonte limpo em `exports/`, com manifesto e SHA-256, sem `.env` reais ou dados do banco.

O pacote não libera a Gestão sem autorização: no modo `host`, é necessário implementar o adaptador do outro sistema. Nenhum dado ou serviço é publicado automaticamente.

## Stack

- React + TypeScript (`apps/web`)
- Node.js + Fastify + TypeScript (`apps/api`)
- PostgreSQL (`database/migrations`)

## Desenvolvimento

Requisitos: Node.js 24, npm 11 e PostgreSQL (o Compose local usa a versão 16).

1. Instale as dependências com `npm ci` e inicie o PostgreSQL de desenvolvimento com `docker compose up -d postgres`.
2. Copie `apps/api/.env.example` para `apps/api/.env`.
3. Configure `DATABASE_URL`, `APP_ORIGIN` e `COOKIE_SECRET`.
4. Gere o hash de senha com `npm run admin:hash -- "uma-senha-com-12-caracteres"` e coloque o resultado em `ADMIN_PASSWORD_HASH`.
5. Opcional: copie `apps/web/.env.example` para `apps/web/.env`. Para testar um prefixo, configure `VITE_BLOG_BASE_PATH=/blog/` nesse arquivo e `BLOG_BASE_PATH=/blog/` na API.
6. Execute `npm run db:migrate` e `npm run db:seed`.
7. Execute `npm run dev`.

O blog público começa em `/inicio` (a raiz `/` redireciona para essa home). O cabeçalho reúne a identidade do blog, a ilustração do cartório e a frase “Mais perto das novidades. Mais perto do seu cartório.” A página começa pelos filtros, seguidos de até três atalhos destacados para as novidades públicas mais recentes de todos os sistemas, sem listar versões nem abrir publicações completas. O cartão inteiro é clicável e a novidade mais recente recebe destaque adicional. A seleção usa `tipo=novidade&limit=3&ordem=recentes`, por data de publicação decrescente e ID como desempate, sem priorizar destaques. Rascunhos, arquivados, agendamentos futuros e sistemas inativos não aparecem.

Ao abrir uma novidade da home, o endereço segue o formato `/oriontn/novidades?publicacao=123`, com o conteúdo já aberto e os filtros correspondentes aplicados. O ID preserva o atalho após edições; a URL se ajusta ao sistema e tipo atuais da publicação. Atualizar a página ou usar Voltar/Avançar mantém o contexto. O botão `Limpar filtros e voltar ao início` retorna à recepção.

Os filtros possuem URLs compartilháveis, combinando o sistema e o tipo:

- `/oriontn/novidades`
- `/orionpro/melhorias`
- `/orionreg/correcoes`
- `/avisos` (todos os sistemas)

Também é possível compartilhar somente o sistema, como em `/oriontn`, ou somente o tipo. A área administrativa fica em `/gestao`. Somente administradores confirmados pela API veem **Acessar Gestão** na visão do leitor e **Visualização do leitor** na Gestão.
Esconder o caminho não é uma medida de segurança: todas as rotas administrativas exigem autorização válida no servidor.

## Integração com o sistema principal

`ADMIN_AUTH_MODE=local` preserva o login independente atual. Com `ADMIN_AUTH_MODE=host`, o blog não apresenta outro login: a sessão e a permissão administrativa vêm do sistema principal, por um adaptador exclusivamente no backend. Sem integração válida, o acesso permanece bloqueado. A alternância para a visão do leitor não encerra a sessão do hospedeiro.

O ponto de acoplamento está em `apps/api/src/auth/host-adapter.ts`. Aplique a migração `007_host_admin_identity` para manter autoria, imagens e auditoria sem criar uma senha para o usuário externo. Consulte o [guia de integração](docs/host-integration.md) para configuração, contrato, segurança e limites. `npm run test:host-integration` verifica o fluxo com hospedeiro simulado e banco isolado.

## Fluxo de versões e posts

O fluxo obrigatório é **Sistema → Versão → Post**. Na Gestão, cadastre uma versão em `Nova versão`, escolhendo OrionTN, OrionPRO ou OrionREG. Um código pode se repetir entre sistemas, mas é único dentro de cada sistema. Ao criar ou editar um post, o seletor de versões mostra somente as versões do sistema escolhido; a API também verifica esse vínculo.

O post tem título, subtítulo, palavra-chave (slug), conteúdo formatado, versão, status, sistema e tipo. Os quatro tipos são Novidades, Melhorias, Correções e Avisos (identificadores internos no singular). O conteúdo aceita texto e imagens: Ctrl+V, menu do mouse → Colar, arrastar arquivo ou botão Inserir imagem. Use PNG, JPEG ou WebP estático, até 5 MB/20 megapixels e no máximo 30 imagens por post. A API valida, remove metadados e recodifica as imagens em WebP, armazenadas no PostgreSQL; inclua essas tabelas nos backups. Uploads não associados a posts expiram após 7 dias e são limpos no próximo upload.

Em `Agendar publicação`, escolha a data e hora no calendário. O navegador converte seu horário local para UTC; o PostgreSQL armazena `TIMESTAMPTZ`. Todas as consultas públicas verificam o horário no servidor, disponibilizando agendados vencidos como publicados, sem depender de um processo temporizador. `Publicar` ou `Publicar agora` disponibiliza imediatamente; `Rascunho` retira a visibilidade pública. Imagens de rascunhos e agendados futuros também exigem sessão administrativa.

No modo público, quando há posts para os filtros selecionados, são exibidas as versões dos sistemas selecionados, inclusive as versões ainda sem posts desse tipo. Ao abrir uma versão, são exibidos somente os posts públicos que correspondem aos filtros. Quando o sistema/tipo não possui posts, ou a versão aberta está vazia, a página mostra “Ops, ainda não temos uma publicação para essa página! Volte em breve ;)”, sem o cabeçalho de versão selecionada. Carregamento e erros de conexão são tratados separadamente desse estado vazio. A migração preserva o conteúdo antigo e identifica o sistema pelos vínculos existentes; se encontrar uma versão sem vínculo inequívoco, interrompe a transação para exigir um mapeamento explícito.

Cada post pode ter uma **capa opcional**, independente das imagens do conteúdo. Em `Capa do post`, use `Importar capa`, `Alterar capa` ou `Remover capa` e salve o post. A capa segue os mesmos limites de formato e tamanho dos uploads; os cards sem capa usam um SVG padrão, inclusive os posts antigos. Na leitura de uma versão, seu código permanece apenas no cabeçalho, sem se repetir em cada card. A migração `004_post_covers` adiciona o vínculo opcional da capa sem alterar o conteúdo existente.

## Ordenação e busca na leitura

Depois de selecionar Sistema e/ou Tipo, a lista de versões oferece ordenação numérica (maior/menor) ou pela data de criação (mais recentes/mais antigas). A busca de versões aceita até 30 caracteres, somente números e pontos, inclusive um trecho do código. Nas publicações de uma versão, ordene pela data de publicação e busque por título, subtítulo ou texto do conteúdo (até 200 caracteres). Aplique a busca pela lupa ou Enter; `Limpar busca` mantém Sistema e Tipo selecionados. Trocar esses filtros ou voltar ao início reinicia as opções de busca e ordenação.

As consultas são feitas na API sobre todos os resultados elegíveis, com paginação de 20 publicações, sem expor rascunhos, agendamentos futuros ou sistemas inativos. A ordenação aceita somente opções predefinidas; o termo de busca é um parâmetro SQL literal. Não é necessária uma nova migração. `npm run test:listings` verifica os cenários reais de banco em um schema temporário isolado, removido no final; `npm run test:visual` também verifica os controles responsivos e a navegação.

## Reações, compartilhamento e acompanhamento

Ao abrir o conteúdo completo de um post público, o leitor encontra `Gostei`, `Não Gostei` e `Compartilhar`. O dislike exige um motivo de 1 a 1000 caracteres, visível apenas à Gestão. Cancelar o pop-up não altera a reação. É possível trocar/remover o voto ou editar o motivo; o painel mostra as reações e os motivos atuais, não um histórico de votos anteriores.

Os links diretos têm o formato `/posts/ID/palavra-chave`. A consulta usa o ID, portanto links antigos continuam funcionando se a palavra-chave mudar. Rascunhos, posts de sistemas inativos, agendados futuros e posts excluídos não ficam acessíveis pelo link. Em produção, configure o servidor web para servir o `index.html` nas rotas do frontend (SPA), preservando as rotas `/api` para o backend.

Na Gestão, abra `Acompanhamento`. A visão gerencial reúne indicadores de publicações, visualizações, aprovação e compartilhamentos. Respeita os filtros de Sistema e Tipo e oferece busca pelo título (sem diferenciar acentos/maiúsculas), status e ordenação. Use `Atualizar painel` para obter os números mais recentes. Os dados são acumulados, sem comparação temporal.

- Os indicadores consideram **todos** os resultados de sistema, tipo, busca e status, não apenas a página visível. São calculados junto com a lista em uma única consulta, sem multiplicar interações por cruzamentos de tabelas.
- “Resultados por publicação” começa minimizado. Para consultar, aplique um filtro de sistema, tipo, título, status ou atenção e maximize a seção. Busca, status específico e atalhos de atenção também abrem os resultados. Sem filtros, a seção orienta a escolher o que analisar e não exibe a lista geral.
- A lista só é solicitada quando a seção está aberta e há filtros: fechada, a API devolve apenas indicadores e contagem, sem linhas de publicações (`incluir_publicacoes=false`). A paginação é feita no servidor, com 5 itens por padrão na interface e opções de 10 ou 20. Trocar filtros/tamanho reinicia a página; minimizar preserva a página escolhida. Resultados atrasados não substituem a consulta atual.
- A aprovação é `Gostei / (Gostei + Não gostei)`, calculada sobre o total de votos; não é uma média das porcentagens das publicações. Ausência de reações aparece como “Sem avaliações”, e não como 0%. A quantidade de avaliações acompanha o percentual.
- “Onde concentrar a atenção” filtra somente a lista: feedback negativo, publicações sem visualizações e publicações abertas sem avaliações. Os dois últimos recortes consideram apenas conteúdo disponível para leitura; excluem rascunhos, agendamentos futuros, arquivados e sistemas inativos.
- “Ver motivos” abre os feedbacks privados em uma janela com paginação. “Revisar” abre o editor administrativo, sem contabilizar uma leitura pública. Não existe um estado de feedback “resolvido”: são mostrados os votos negativos atuais.
- O total de visualizações soma os navegadores/dispositivos únicos de cada publicação. O número complementar de navegadores/dispositivos no conjunto é deduplicado entre as publicações. Nenhum dos dois identifica pessoas.

O painel mantém os temas claro/escuro e transforma a tabela em cartões de métricas em telas menores. O refinamento não exige nova migração. `npm run test:analytics` valida cálculos, filtros, paginação, autenticação e fluxos reais de navegador em schema temporário isolado, incluindo sete larguras nos dois temas.

- **Visualizações únicas:** registros de abertura do conteúdo por navegador/dispositivo, reaproveitando `ca_leituras`. Reabrir/recarregar no mesmo navegador não duplica o número; abrir só a listagem ou a prévia administrativa não registra leitura. Não há identificação de pessoas: limpar os cookies ou usar outro dispositivo pode gerar outro visitante, e um navegador compartilhado conta uma vez.
- **Likes/dislikes:** uma reação atual por post e identificador anônimo. Os cookies são `HttpOnly` e assinados; somente o hash do identificador é armazenado. Os cookies antigos são migrados preservando as leituras existentes.
- **Compartilhamentos:** ações concluídas de copiar o link ou compartilhar pelo dispositivo. Cancelar o compartilhamento nativo não conta. Eventos possuem UUID para não duplicar em uma nova tentativa após falha de rede. A contagem não confirma envio, recebimento ou leitura em aplicativos externos, nem detecta links copiados fora do botão.

A migração `005_post_engagement` adiciona `ca_reacoes` e `ca_compartilhamentos`, com índices e exclusão em cascata ao excluir o post. Motivos são texto simples e escapados na tela, nunca HTML executável. Interações exigem um header não simples, verificação de origem e limites de frequência; consultas de motivos e métricas exigem sessão administrativa. Por ser público, o blog não garante identidade humana nem impede totalmente abuso automatizado ou limpeza de cookies.

## Caixa de sugestões

Disponível somente em `/inicio`, à direita dos cartões de Últimas novidades no desktop e centralizada no rodapé, após todas as novidades, em telas de até 900px. Em telas amplas, aproveita a margem direita sem reduzir a largura original dos cartões. Passe o mouse ou dê foco pelo teclado para abrir a tampa e revelar `Deixe aqui sua sugestão`. Clicar/tocar no presente ou no convite abre diretamente o formulário; Enter/Espaço também funcionam no presente. O formulário exige Nome (até 100 caracteres), Cartório (até 180) e Sugestão (até 4000). Cancelar/Escape não envia dados; durante o envio os controles ficam bloqueados. A confirmação `Obrigado pela sugestão :)` aparece somente após a API salvar e fecha automaticamente após 3 segundos. Em todos os fechamentos, a tampa e o convite são recolhidos, sem reabrir ao devolver o foco ao presente. Uma falha mantém os campos preenchidos para tentar novamente.

Execute `npm run db:migrate` para aplicar `006_suggestions`. `POST /api/v1/sugestoes` armazena os campos como texto simples em `ca_sugestoes`, com UUID e data de criação, sem listar os dados publicamente. A API valida campos, origem, tamanho e limita a 5 tentativas por IP a cada 15 minutos. O UUID evita duplicação ao repetir um envio após falha de rede. `npm run test:suggestions` testa a API e a persistência em um schema temporário, sem alterar dados reais; `npm run test:visual` cobre os estados e a interação do formulário.

Em `/gestao`, a aba **Sugestões** consulta esses mesmos registros, incluindo os envios anteriores. Exibe nome, cartório, data/hora e uma prévia; `Ler sugestão` expande o texto completo. Há busca por nome, cartório ou mensagem (sem diferenciar acentos/maiúsculas), ordenação por data e paginação no servidor de 5, 10 ou 20 itens. Os filtros de Sistema/Tipo ficam ocultos nessa aba porque os envios não têm esses vínculos; as escolhas são preservadas ao retornar a Publicações ou Acompanhamento. A troca de aba permanece bloqueada enquanto um formulário de criação/edição estiver aberto.

`GET /api/v1/admin/sugestoes` exige sessão administrativa e responde com `Cache-Control: private, no-store`. Nomes e mensagens são renderizados como texto, nunca HTML. A consulta não modifica, remove nem marca sugestões como lidas. Não há envio por e-mail ou resposta automática ao leitor. A aba não exige nova migração se `006_suggestions` já estiver aplicada. `npm run test:admin-suggestions` valida autenticação, paginação/busca, envio real da home até a Gestão, mensagens extensas, teclado, erros/reenvio e quatro larguras nos dois temas, sempre com banco isolado.

## Segurança

Leitores não precisam de conta. A leitura é registrada por um token anônimo, armazenado apenas como hash.
O blog não exibe “Tudo lido”, contadores de não lidas ou marcadores de lida/não lida para o leitor. O registro interno de visualizações permanece ativo exclusivamente para o acompanhamento na Gestão, sem alterar as reações ou o compartilhamento.
No modo local, administradores usam sessão própria em cookie `HttpOnly`, com expiração, rate limiting, verificação de origem e token CSRF. No modo integrado, a sessão e a permissão são validadas pelo adaptador do hospedeiro a cada requisição, mantendo proteção de origem/CSRF sem outro login do blog.
Conteúdo formatado passa por uma lista restrita de tags e atributos na API e pelo DOMPurify no frontend. Scripts, eventos, iframes e imagens externas são descartados. Uploads exigem sessão e CSRF; apenas imagens efetivamente decodificadas são aceitas, com limites de bytes, pixels e quantidade.

## Verificação

`npm run test:visual` verifica a home, os atalhos, o histórico do navegador, os estados de carregamento/erro/vazio e o layout em quatro larguras nos temas claro e escuro, com respostas de API simuladas. `npm run test:mobile-filters` verifica os gestos de toque e a navegação por teclado dos filtros em emulação móvel.

A Gestão compartilha as cores e os componentes visuais do blog. Os ajustes privados ficam em `apps/web/src/management.css`, carregado após os estilos públicos e limitado à área administrativa. A navegação de Publicações/Acompanhamento/Sugestões permanece acima dos filtros; botões, buscas, cartões, editores e acesso usam o mesmo padrão nos dois temas. Não há alteração de dados ou migração para esse refinamento.

O teste visual também executa `scripts/check-management-style.mjs`: acesso/saída, erro de login, navegação, cadastro de versão, criação/edição de publicação, agendamento, prévia privada de capa e teclado em 320, 390, 768 e 1366 px nos temas claro/escuro. `test:analytics` e `test:admin-suggestions` complementam essa cobertura com as consultas reais em schemas temporários.

Execute `npm run typecheck`, `npm run build`, `npm run test:workflows` e `npm run test:engagement`. As verificações usam schemas temporários e isolados no PostgreSQL configurado em `apps/api/.env`, API e frontend em portas temporárias e navegador Edge em modo headless. Removem apenas os schemas que elas próprias criam. A suíte de engajamento verifica reações, motivos, links diretos, compartilhamento, métricas e acesso administrativo. As suítes respeitam a janela real do rate limit e podem aguardar sua renovação entre os cenários. Para usar Chromium instalado pelo Playwright, defina `TEST_BROWSER_CHANNEL=chromium` e instale o navegador com `npx playwright install chromium`.
