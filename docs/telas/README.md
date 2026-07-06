# 🖥️ Documentação por Tela — Siplan HUB

Referência técnica de **todas as 48 telas** do sistema, agrupadas por módulo. Cada tela documenta: rota, arquivo-fonte, nível de acesso, objetivo, dados/hooks (queries, mutations, tabelas/RPCs Supabase), componentes principais, fluxos e interações, regras de negócio/estados e pontos de manutenção.

> Para o modelo de dados subjacente veja [../MODELO_DE_DADOS.md](../MODELO_DE_DADOS.md) e o catálogo de hooks em [../REFERENCIA_HOOKS.md](../REFERENCIA_HOOKS.md).

---

## 📚 Índice de Módulos

### 1. [Núcleo — Dashboard e Projetos](01-nucleo-dashboard-projetos.md)
Home, Dashboard (KPIs + PDF), Quadro Kanban, Projetos Ativos, Detalhes do Projeto, Análise de Aderência e Comparar Projetos.
`/` · `/dashboard` · `/dashboard/kanban` · `/projects` · `/projects/:id` · `/projects/:id/adherence` · `/compare`

### 2. [Conversão e Modelos OrionTN](02-conversao-orion-tn.md)
Fila de Conversão (+ Minha Fila detalhada), Motores de Conversão, Dashboard e Projetos OrionTN, Workspace de Modelos Editor (fluxo simplificado de 2 etapas do "Modelos TN").
`/conversion` · `/conversion/engines` · `/orion-tn-models/dashboard` · `/orion-tn-models/projects` · `/orion-tn-models/:projectId?`

### 3. [Comercial](03-comercial.md)
Clientes, Visão 360º, Timeline do Cliente, Central de Bloqueios, Contatos, Formulários de Implantação, Checklists e Editor de Perguntas.
`/commercial/customers` · `/commercial/client/:id` · `/commercial/client/:id/timeline` · `/commercial/blockers` · `/commercial/contacts` · `/commercial/deployment-forms` · `/commercial/checklists` · `/commercial/checklists/questions`

### 4. [Implantadores](04-implantadores.md)
Painel de Implantadores, Editor de Aderência, Aderências Finalizadas, Homologação de Conversões, Roteiro de Treinamento (placeholder) e DTC / Documento de Transição (leitor de voz).
`/implantadores` · `/implantadores/aderencia` · `/implantadores/aderencia/finalizadas` · `/implantadores/homologation` · `/implantadores/treinamento` · `/implantadores/transicao`

### 5. [Administração](05-administracao.md)
AdminLayout + RBAC, Dashboard Admin, Usuários, Perfis (Roles), Equipes, Auditoria, Saúde dos Projetos, Férias, Armazenamento e Usuários Inativos.
`/admin` · `/admin/users` · `/admin/roles` · `/admin/teams-config` · `/admin/audit` · `/admin/settings` · `/admin/vacations` · `/admin/storage` · `/admin/inactive-users`

### 6. [Calendário, Analytics e Relatórios](06-calendario-analytics-relatorios.md)
Calendário (DnD), Agenda dos Analistas (Power BI), Analytics, Relatórios, Roadmap público, Próximas e Últimas Implantações.
`/calendar` · `/agenda-analistas` · `/analytics` · `/reports` · `/roadmap/:token` · `/deployments` · `/deployments/latest`

### 7. [Telas Públicas e Autenticação](07-telas-publicas-autenticacao.md)
AuthContext / ProtectedRoute, Login, Checklist Público, Coleta Pública de Infraestrutura e 404.
`/login` · `/public/checklist/:id` · `/public/infra-coleta/:id` · `*` (404)

---

## 🔎 Convenções

- **Acesso:** a maioria das rotas fica sob `<ProtectedRoute>` + `MainLayout` (exige login). Rotas admin exigem `role === "admin"` ou permissão equivalente. Rotas públicas (`/login`, `/roadmap/:token`, `/public/*`) usam a anon key do Supabase + RLS/RPC.
- **Fonte da verdade:** os links de arquivo-fonte em cada doc apontam para o código real. Ao divergir, o código vence — atualize o doc.
- **Pontos de Manutenção:** cada tela lista acoplamentos, divergências e dívidas técnicas observadas no código durante a documentação.
