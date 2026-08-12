# Migração SistemaRegistro → CS/CX

Este documento é a matriz de controle da migração do sistema Flask em
`\\10.0.10.9\Siplan\SistemaRegistro` para o módulo CS/CX do SiplanHub.

## Garantias de migração

- O sistema legado permanece como fonte oficial até o corte final.
- Cargas de desenvolvimento nunca apagam nem alteram o banco de produção.
- IDs legados são preservados em `legacy_id` quando não puderem ser mantidos como chave primária.
- Toda carga é idempotente e usa `upsert` com auditoria de execução.
- Inclusões, alterações, exclusões e anexos ocorridos durante o desenvolvimento entram no delta final.
- Cada domínio só é considerado concluído após comparação de dados e homologação funcional.

## Status

- `inventariado`: fluxo localizado no legado.
- `fundação`: rota, menu e permissão criados no Hub.
- `em migração`: schema, dados ou tela em implementação.
- `homologado`: dados e comportamento comparados com o legado.

## Matriz por domínio

| Domínio | Funcionalidades que devem ser preservadas | Status |
| --- | --- | --- |
| Autenticação | login, logout, perfil, validação e renovação de sessão | inventariado; será substituído por Supabase Auth |
| Visão geral | atalhos por perfil, indicadores e central de prioridades | fundação |
| Solicitações | lista, filtros, busca, criação, edição, exclusão, detalhe, Kanban, mudança de status, histórico, PDF e exportação | em migração; lista, CRUD, filtros, quadro e status implementados |
| Cartórios | cadastro, edição, ativação, produtos, período de implantação, registros, histórico e PDFs | em migração; cadastro, CRUD, filtros e produtos implementados |
| Contatos | lista, filtros, criação, edição, exclusão, produtos, estatísticas e PDFs | em migração; lista, CRUD, filtros e indicadores básicos implementados |
| Agendamentos | lista, calendário, criação, edição, realização, conclusão, cancelamento, remarcação, impressão e PDF | em migração; lista, calendário, CRUD e mudanças de estado implementados |
| Rotinas | aplicações, configuração, análise, histórico, modelos, itens, categorias, tipos, reordenação, relatórios e PDF | em migração; schema e carga incremental preparados, aplicações, análise de itens e catálogo de modelos implementados |
| Visitas | criação, edição, checklist, pendências, anexos, geração de solicitações, status e PDF | em migração; lista, CRUD, status, checklist, pendências, anexos nativos, geração transacional de solicitações e PDF implementados; cópia dos binários legados pendente |
| NPS | respostas, importação, classificação, estatísticas, histórico, reatribuição, webhook, exclusão e PDF | em migração; respostas, classificação, indicadores, histórico, reatribuição por edição, importação CSV/XLSX idempotente, PDF e webhook autenticado implementados; deploy e homologação externa pendentes |
| Notificações | lista, leitura individual e leitura em lote | inventariado; integrar com notifications existente |
| Administração | usuários, perfis, permissões, logs, prioridades, estatísticas, PDF e Excel | fundação; identidade será integrada ao RBAC do Hub |

## Tabelas legadas inventariadas

`users`, `perfis_acesso`, `permissoes_sistema`, `perfil_permissoes`, `cartorios`,
`cartorio_produtos`, `registros`, `anexos`, `logs_auditoria`, `categorias_rotina`,
`tipos_rotina`, `modelos_rotina`, `modelo_rotina_produtos`, `itens_modelo_rotina`,
`rotinas_cartorio`, `config_item_cartorio`, `historico_rotina_cartorio`, `produtos`,
`contatos`, `logs_auditoria_contatos`, `agendamentos`,
`logs_auditoria_agendamentos`, `respostas_nps`, `historico_nps`,
`logs_auditoria_nps`, `visitas_cartorio`, `itens_checklist_visita`,
`pendencias_visita`, `anexos_visita`, `logs_auditoria_visita` e `notifications`.

## Pontos especiais

- Pós-implantação não será duplicado no CS/CX: o acompanhamento continuará nas telas nativas de projetos e no Panorama Pós-Implantação do HUB.
- `users` será mapeada para `auth.users` + `profiles`; não será copiada como autenticação paralela.
- `notifications` será integrada à tabela já existente no Hub para evitar colisão.
- Arquivos de `uploads/` serão copiados para Supabase Storage com hash e vínculo ao registro original.
- Tabelas sem `data_atualizacao` exigem comparação por hash ou diário de mudanças.
- Exclusões físicas precisam ser capturadas por diário de mudanças antes do corte.
- PDFs/Excel e webhooks serão migrados para RPC, Edge Function ou VM Worker conforme o custo de execução.

## Critério de conclusão por domínio

1. Schema, constraints, índices e RLS revisados.
2. Carga inicial e delta executados sem erros.
3. Contagens, chaves estrangeiras e amostras comparadas.
4. Todos os fluxos da matriz disponíveis na nova interface.
5. Permissões verificadas por perfil e por acesso direto à URL.
6. Testes automatizados e homologação do usuário concluídos.
