# Graph Report - .  (2026-07-08)

## Corpus Check
- 499 files · ~383,950 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1922 nodes · 5215 edges · 123 communities (102 shown, 21 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 143 edges (avg confidence: 0.72)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Playwright Runner & Benchmarks
- Dashboard Charts & Status Config
- NPM Runtime Dependencies
- Conversion Post Feed
- Conversion Issues & Filters
- App Routes & Pages
- VM Worker Job Queue
- TypeScript Utility Types
- BM25 Search Engine (Python)
- Recent Activity & UI Primitives
- Siplan Hub Domain Docs
- Error Handling & KPI Patterns
- Interview Analyzer (Python)
- Strict tsconfig
- Project Modal & Roadmap Tabs
- Editor Toolbar & UI Inputs
- Alerts & DTC AI Hooks
- API Design & Auth Patterns
- Component Prop Types
- Calendar Grid & Drag-Drop
- Toast Notifications
- Adherence Form Renderer
- Conversion/Infra Stage Forms
- Dev Dependencies
- Notification Bell & Dropdown
- Notifications & Conversion Types
- Environment Stage & Project Model
- Sidebar Components
- graphify CLI Features
- Checklist & Visual Question Builder
- FastAPI REST Template
- Dashboard Table & Pagination
- Project Grid & List Hooks
- Post Observations Editor
- tsconfig.app
- Auth & Commercial Checklists
- TypeScript Diagnostics (Python)
- Dashboard KPI & PDF Report
- Admin Settings Hooks
- Conversion Issues Hooks
- Distribution/Workload Charts
- RICE Prioritizer (Python)
- App Sidebar & Layout
- Implementation Stage & Rich Text
- Worker package.json
- Playwright Helpers
- shadcn components.json
- Caveman Skill Family
- Projects Hooks & Stage Types
- tsconfig.node
- Playwright package.json
- Modelos Editor & Model Jobs
- Deployment Cards & Reports
- Infra Validation
- Project Transformers
- Lexical Editor Config
- Auth Context & Protected Route
- Adherence Form & Responses
- Predictability & Bottlenecks
- Team & 0800 Ticket Tab
- Root tsconfig
- Worker tsconfig
- React/Architecture Skills
- Frontend package.json
- Postgres Indexing Rules
- Deployment Form Fields
- Deployment Forms & Template
- Project Form Autosave Hooks
- Roadmap Page
- Lexical Serialization
- Sheet Component
- Filter Store
- Theme Provider
- Schema Validator (Python)
- Health Badge & Pipeline Status
- Git Advanced Workflows
- graphify Integration Docs
- Siplan Hub Architecture Docs
- Conversion Engines Hook
- Accessibility Skills
- Clean Code & Refactoring Skills
- Playwright Skill Docs
- RLS & SQL Optimization
- Cavecrew/Caveman Docs
- Frontend Security
- Sonner Toast
- Postgres Locking Rules
- Postgres Schema Rules
- Product Manager Toolkit
- Gemini Optimization Docs
- CI/CD Automation Workflows
- Supabase Deno Config
- Postgres Batch/N+1 Rules
- Postgres Advisory Locks
- AI Predictability Feature
- Caveman Compress Package
- Siplan Logo (White) Brand
- Siplan Logo Brand
- Siplan White Logo Asset
- Siplan Logo PNG Asset
- Favicon Brand Icon
- Placeholder Graphic
- CORS Headers (Edge Fn)
- Vercel Config
- Auto-Deploy Script
- Worker Watchdog Script
- Postgres Prepared Statements
- graphify add/watch
- graphify Exports
- graphify Cross-Repo Merge
- graphify Transcription
- Machine Info Doc

## God Nodes (most connected - your core abstractions)
1. `cn()` - 182 edges
2. `ProjectV2` - 85 edges
3. `Button` - 77 edges
4. `useToast()` - 64 edges
5. `Card` - 61 edges
6. `CardContent` - 60 edges
7. `Badge()` - 57 edges
8. `supabase` - 50 edges
9. `CardHeader` - 49 edges
10. `CardTitle` - 48 edges

## Surprising Connections (you probably didn't know these)
- `graphify Pipeline (Codex)` --semantically_similar_to--> `graphify Pipeline`  [INFERRED] [semantically similar]
  .codex/skills/graphify/SKILL.md → .claude/skills/graphify/SKILL.md
- `AGENTS.md graphify integration` --semantically_similar_to--> `CLAUDE.md graphify integration`  [INFERRED] [semantically similar]
  AGENTS.md → CLAUDE.md
- `PostObservations()` --indirect_call--> `err()`  [INFERRED]
  src/components/ProjectManagement/Forms/PostObservations.tsx → .agent/skills/typescript-expert/references/utility-types.ts
- `InfraStageForm()` --indirect_call--> `err()`  [INFERRED]
  src/components/ProjectManagement/Forms/StageForms/InfraStageForm.tsx → .agent/skills/typescript-expert/references/utility-types.ts
- `ModelosEditorWorkspace()` --indirect_call--> `err()`  [INFERRED]
  src/components/ProjectManagement/ModelosEditor/ModelosEditorWorkspace.tsx → .agent/skills/typescript-expert/references/utility-types.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **API Design Principles Skill Suite** — _agent_skills_api_design_principles_skill_api_design_principles, _agent_skills_api_design_principles_assets_api_design_checklist_api_design_checklist, _agent_skills_api_design_principles_references_graphql_schema_design_graphql_schema_design, _agent_skills_api_design_principles_references_rest_best_practices_rest_best_practices, _agent_skills_api_design_principles_resources_implementation_playbook_api_playbook [INFERRED 0.85]
- **N+1 Query Problem and DataLoader Mitigation** — _agent_skills_database_design_optimization_n_plus_1_query_problem, _agent_skills_api_design_principles_references_graphql_schema_design_dataloader_pattern, _agent_skills_api_design_principles_references_graphql_schema_design_graphql_schema_design, _agent_skills_database_design_optimization_query_optimization, _agent_skills_api_design_principles_resources_implementation_playbook_api_playbook [INFERRED 0.85]
- **Authentication, Authorization and Backend Security** — _agent_skills_auth_implementation_patterns_skill_auth_implementation_patterns, _agent_skills_auth_implementation_patterns_resources_implementation_playbook_auth_playbook, _agent_skills_backend_security_coder_skill_backend_security_coder, _agent_skills_auth_implementation_patterns_resources_implementation_playbook_jwt_authentication, _agent_skills_auth_implementation_patterns_resources_implementation_playbook_rbac [INFERRED 0.85]
- **Three Pillars of Observability (metrics, traces, dashboards)** — _agent_skills_observability_monitoring_monitor_setup_resources_implementation_playbook_prometheus, _agent_skills_observability_monitoring_monitor_setup_resources_implementation_playbook_opentelemetry, _agent_skills_observability_monitoring_monitor_setup_resources_implementation_playbook_grafana, _agent_skills_observability_monitoring_monitor_setup_resources_implementation_playbook_slo [INFERRED 0.75]
- **Postgres Connection Management category** — _agent_skills_postgres_best_practices_rules_conn_idle_timeout_idle_connection_timeouts, _agent_skills_postgres_best_practices_rules_conn_limits_connection_limits, _agent_skills_postgres_best_practices_rules_conn_pooling_connection_pooling [INFERRED 0.85]
- **Postgres rules authoring pipeline (sections, template, guidelines)** — _agent_skills_postgres_best_practices_rules__sections_section_definitions, _agent_skills_postgres_best_practices_rules__template_rule_template, _agent_skills_postgres_best_practices_rules__contributing_writing_guidelines, _agent_skills_postgres_best_practices_readme_postgres_contributor_guide [INFERRED 0.75]
- **PostgreSQL Indexing Strategies** — _agent_skills_postgres_best_practices_rules_query_missing_indexes_missing_indexes, _agent_skills_postgres_best_practices_rules_query_composite_indexes_composite_indexes, _agent_skills_postgres_best_practices_rules_query_covering_indexes_covering_indexes, _agent_skills_postgres_best_practices_rules_query_partial_indexes_partial_indexes, _agent_skills_postgres_best_practices_rules_query_index_types_index_types [INFERRED 0.85]
- **PostgreSQL Locking and Concurrency Control** — _agent_skills_postgres_best_practices_rules_lock_advisory_advisory_locks, _agent_skills_postgres_best_practices_rules_lock_deadlock_prevention_deadlock_prevention, _agent_skills_postgres_best_practices_rules_lock_short_transactions_short_transactions, _agent_skills_postgres_best_practices_rules_lock_skip_locked_skip_locked [INFERRED 0.85]
- **PostgreSQL Monitoring and Diagnostics** — _agent_skills_postgres_best_practices_rules_monitor_explain_analyze_explain_analyze, _agent_skills_postgres_best_practices_rules_monitor_pg_stat_statements_pg_stat_statements, _agent_skills_postgres_best_practices_rules_monitor_vacuum_analyze_vacuum_analyze [INFERRED 0.85]
- **Postgres Security Best Practice Rules** — _agent_skills_postgres_best_practices_rules_security_privileges_least_privilege, _agent_skills_postgres_best_practices_rules_security_rls_basics_rls, _agent_skills_postgres_best_practices_rules_security_rls_performance_rls_perf [INFERRED 0.85]
- **Frontend Development Skill Cluster** — _agent_skills_react_patterns_skill_react_patterns, _agent_skills_react_state_management_skill_react_state_management, _agent_skills_tailwind_design_system_skill_tailwind_design_system, _agent_skills_typescript_expert_skill_typescript_expert, _agent_skills_ui_ux_pro_max_skill_ui_ux_pro_max [INFERRED 0.75]
- **Caveman/Cavecrew Agent Tooling Skills** — _agents_skills_cavecrew_skill_cavecrew, _agents_skills_caveman_commit_skill_caveman_commit, agents_agents_agents_project_rules [INFERRED 0.65]
- **Caveman Token-Saving Toolkit** — _agents_skills_caveman_readme_caveman, _agents_skills_caveman_compress_readme_caveman_compress, _agents_skills_caveman_review_readme_caveman_review, _agents_skills_caveman_stats_readme_caveman_stats, _agents_skills_caveman_help_readme_caveman_help [INFERRED 0.85]
- **graphify Extraction Pipeline** — _claude_skills_graphify_skill_graphify_pipeline, _claude_skills_graphify_references_extraction_spec_subagent_prompt, _claude_skills_graphify_references_extraction_spec_node_id_format, _claude_skills_graphify_references_extraction_spec_confidence_rubric [INFERRED 0.85]
- **graphify Query Flow** — _claude_skills_graphify_references_query_query_expansion, _claude_skills_graphify_references_query_bfs_dfs_traversal, _claude_skills_graphify_references_query_save_result_loop [INFERRED 0.85]
- **graphify skill pipeline references** — _codex_skills_graphify_references_query_query, _codex_skills_graphify_references_update_update, _codex_skills_graphify_references_extraction_spec_prompt [INFERRED 0.75]
- **Siplan Hub optimization documentation set** — _gemini_build_fixes_buildfixes, _gemini_optimization_complete_threephases, _gemini_optimization_report_report [INFERRED 0.75]
- **Siplan Hub automation (migrations + heartbeat alert)** — automation_automation, _github_workflows_supabase_migrations_workflow, _github_workflows_worker_heartbeat_alert_workflow [INFERRED 0.75]
- **Pipeline de geração automática de modelos (aba 5 → fila → worker VM)** — docs_telas_02_conversao_orion_tn_modelos_editor, docs_modelo_de_dados_model_generation_jobs, vm_worker_readme_worker, vm_worker_readme_criar_modelo_mesclado [INFERRED 0.75]
- **Fluxo Split Query (listagem leve vs detalhes pesados)** — docs_manual_desenvolvedor_split_query, docs_referencia_hooks_useprojectslist, docs_referencia_hooks_useprojectdetails, docs_modelo_de_dados_projects_table [INFERRED 0.75]
- **Modelo de acesso e segurança (RBAC + RLS + Auth)** — docs_modelo_de_dados_rbac, docs_modelo_de_dados_rls, docs_telas_07_telas_publicas_autenticacao_authcontext [INFERRED 0.75]

## Communities (123 total, 21 thin omitted)

### Community 0 - "Playwright Runner & Benchmarks"
Cohesion: 0.06
Nodes (58): checkPlaywrightInstalled(), cleanupOldTempFiles(), { execSync }, fs, getCodeToExecute(), installPlaywright(), main(), path (+50 more)

### Community 1 - "Dashboard Charts & Status Config"
Cohesion: 0.10
Nodes (31): data, OverviewChart(), ProjectStatusChart(), ProjectStatusChartProps, STATUS_LABELS, STAGE_LABELS, STATUS_COLORS, STATUS_LABELS (+23 more)

### Community 2 - "NPM Runtime Dependencies"
Cohesion: 0.03
Nodes (58): dependencies, canvas-confetti, class-variance-authority, clsx, cmdk, date-fns, @dnd-kit/core, @dnd-kit/sortable (+50 more)

### Community 3 - "Conversion Post Feed"
Cohesion: 0.05
Nodes (35): CompactQueueCard(), CompactQueueCardProps, ConversionPostDrawer(), ConversionPostFeed(), ConversionPostFeedProps, formatPostDate(), getInitials(), groupPostsByDate() (+27 more)

### Community 4 - "Conversion Issues & Filters"
Cohesion: 0.15
Nodes (33): ConversionIssuesTabProps, PRIORITIES, STATUSES, ConversionPostDrawerProps, STATUS_LABELS, STAGE_OPTIONS, AdvancedFiltersProps, DialogContent (+25 more)

### Community 5 - "App Routes & Pages"
Cohesion: 0.04
Nodes (49): AderenciasFinalizadas, AdminDashboard, AdminLayout, AdminSettings, AgendaAnalistas, Analytics, App(), AuditLogPage (+41 more)

### Community 6 - "VM Worker Job Queue"
Cohesion: 0.10
Nodes (41): config, DtcJob, Job, ModelType, claimAndProcess(), claimOneDtcJob(), claimOneModelJob(), installShutdownHandlers() (+33 more)

### Community 7 - "TypeScript Utility Types"
Cohesion: 0.04
Nodes (45): Arguments, AssertEqual, AsyncFunction, AtLeast, Brand, DeepMutable, DeepPartial, DeepReadonly (+37 more)

### Community 8 - "BM25 Search Engine (Python)"
Cohesion: 0.06
Nodes (32): BM25, detect_domain(), _load_csv(), BM25 ranking algorithm for text search, Lowercase, split, remove punctuation, filter short words, Build BM25 index from documents, Score all documents against query, Load CSV and return list of dicts (+24 more)

### Community 9 - "Recent Activity & UI Primitives"
Cohesion: 0.12
Nodes (32): formatAction(), RecentActivity(), AccordionContent, AccordionItem, AccordionTrigger, Table, TableBody, TableCaption (+24 more)

### Community 10 - "Siplan Hub Domain Docs"
Cohesion: 0.09
Nodes (41): CalendarContext (Calendar Component Docs), Arquitetura de 3 Camadas do Calendário, Guia Completo: Área de Conversão, Fluxo de Trabalho da Conversão, Manual do Desenvolvedor, Sincronização de novas telas (AppSidebar/menuItems), Split Query (padrão de otimização), Modelo de Dados (Supabase/PostgreSQL) (+33 more)

### Community 11 - "Error Handling & KPI Patterns"
Cohesion: 0.06
Nodes (40): Circuit Breaker Pattern, Error Handling Patterns, Graceful Degradation, Result Type Pattern, Retry with Exponential Backoff, Cohort Retention Analysis, KPI Dashboard Design, Monthly Recurring Revenue (MRR) (+32 more)

### Community 12 - "Interview Analyzer (Python)"
Cohesion: 0.07
Nodes (22): aggregate_interviews(), format_single_interview(), InterviewAnalyzer, main(), Extract feature requests and suggestions, Extract Jobs to Be Done patterns, Analyze customer interviews for insights and patterns, Calculate overall sentiment of the interview (+14 more)

### Community 13 - "Strict tsconfig"
Cohesion: 0.06
Nodes (34): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, declarationMap, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames (+26 more)

### Community 14 - "Project Modal & Roadmap Tabs"
Cohesion: 0.13
Nodes (22): ProjectModal(), CustomTheme, RoadmapManager(), RoadmapManagerProps, RoadmapSettings, Chamado0800Tab(), FilesTab(), GeneralInfoTab() (+14 more)

### Community 15 - "Editor Toolbar & UI Inputs"
Cohesion: 0.20
Nodes (17): COLORS, FONT_SIZES, ReportsFiltersProps, AutocompleteInputProps, Button, Command, CommandDialogProps, CommandEmpty (+9 more)

### Community 16 - "Alerts & DTC AI Hooks"
Cohesion: 0.09
Nodes (26): Alert, AlertDescription, AlertTitle, alertVariants, AutocompleteInput(), mapJob(), useDtcAiJobs(), useTeamMembers() (+18 more)

### Community 17 - "API Design & Auth Patterns"
Cohesion: 0.08
Nodes (31): API Design Checklist, DataLoader Pattern, GraphQL Schema Design Patterns, Cursor-Based Pagination, Rate Limiting, REST API Best Practices, API Design Principles Implementation Playbook, API Design Principles Skill (+23 more)

### Community 18 - "Component Prop Types"
Cohesion: 0.07
Nodes (27): DashboardTableProps, PipelineStatusProps, ProjectDetailsModalProps, TimelineChartProps, DeploymentCardProps, DeploymentDetailsDialogProps, ProjectHeaderForm(), ProjectHeaderFormProps (+19 more)

### Community 19 - "Calendar Grid & Drag-Drop"
Cohesion: 0.19
Nodes (20): CalendarControls(), CalendarGrid(), CalendarGridProps, DayDroppableZone(), DraggableTeamMember(), DraggableTeamMemberProps, CalendarEventPill(), CalendarEventPillProps (+12 more)

### Community 20 - "Toast Notifications"
Cohesion: 0.11
Nodes (23): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+15 more)

### Community 21 - "Adherence Form Renderer"
Cohesion: 0.10
Nodes (19): AdherenceImpactSummary(), AdherenceQuestionField(), AdherenceQuestionValue, ArrayFieldTemplateItem, checkHasAdherenceQuestions(), CustomArrayFieldTemplate(), CustomCheckboxWidget(), customFields (+11 more)

### Community 22 - "Conversion/Infra Stage Forms"
Cohesion: 0.22
Nodes (18): ConversionStageForm(), ConversionStageFormProps, EditableCellProps, InfraStageFormProps, StatusType, StatusType, AlertDialogAction, AlertDialogCancel (+10 more)

### Community 23 - "Dev Dependencies"
Cohesion: 0.08
Nodes (24): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, jsdom (+16 more)

### Community 24 - "Notification Bell & Dropdown"
Cohesion: 0.13
Nodes (19): NOTIFICATION_TYPE_ICONS, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSubContent (+11 more)

### Community 25 - "Notifications & Conversion Types"
Cohesion: 0.11
Nodes (21): NotificationBell(), useNotifications(), UseNotificationsOptions, ConversionActivityLog, ConversionIssue, ConversionKPIs, ConversionMapping, ConversionQueueItem (+13 more)

### Community 26 - "Environment Stage & Project Model"
Cohesion: 0.09
Nodes (22): EnvironmentStageForm(), EnvironmentStageFormProps, AttachedFile, BlockingReason, ChecklistItem, ClientSatisfaction, ConversionComplexity, EnvironmentStageV2 (+14 more)

### Community 27 - "Sidebar Components"
Cohesion: 0.09
Nodes (22): SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInput (+14 more)

### Community 28 - "graphify CLI Features"
Cohesion: 0.09
Nodes (23): graphify add URL, --watch Folder Monitor, graphify Export Backends, graphify MCP Server, Confidence Score Rubric, Node ID Format, Extraction Subagent Prompt, Cross-Repo Merge (+15 more)

### Community 29 - "Checklist & Visual Question Builder"
Cohesion: 0.17
Nodes (16): ChecklistEditor(), ChecklistEditorProps, SYSTEM_TYPES, convertVisualToJSONSchema(), convertVisualToUISchema(), parseJSONSchemaToVisual(), VisualQuestion, VisualQuestionBuilder() (+8 more)

### Community 30 - "FastAPI REST Template"
Cohesion: 0.17
Nodes (21): create_user(), delete_user(), ErrorDetail, ErrorResponse, get_user(), http_exception_handler(), list_users(), PaginatedResponse (+13 more)

### Community 31 - "Dashboard Table & Pagination"
Cohesion: 0.16
Nodes (17): DashboardTable(), ButtonProps, buttonVariants, Calendar(), CalendarProps, Pagination(), PaginationContent, PaginationEllipsis() (+9 more)

### Community 32 - "Project Grid & List Hooks"
Cohesion: 0.13
Nodes (18): Breadcrumbs(), NewProjectDialog(), AdvancedFilters(), ProjectGrid(), useConversionQueue(), useProjectsList(), userProjectsListTransform(), useProjectsV2() (+10 more)

### Community 33 - "Post Observations Editor"
Cohesion: 0.17
Nodes (20): AiTarget, Block, blockTextLen(), blockToPlain(), escapeHtml(), fmtDate(), inlineHtml(), lexToHtml() (+12 more)

### Community 34 - "tsconfig.app"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules, jsx, lib, module, moduleDetection (+13 more)

### Community 35 - "Auth & Commercial Checklists"
Cohesion: 0.19
Nodes (17): err(), react, CustomImageUploadWidget(), FallbackChecklistFormProps, ProjectSelector(), AuthProvider(), useToast(), CommercialChecklistRecord (+9 more)

### Community 36 - "TypeScript Diagnostics (Python)"
Cohesion: 0.17
Nodes (19): check_any_usage(), check_monorepo(), check_performance(), check_tooling(), check_tsconfig(), check_type_assertions(), check_type_errors(), check_versions() (+11 more)

### Community 37 - "Dashboard KPI & PDF Report"
Cohesion: 0.16
Nodes (14): jspdf, DashboardKPI(), DashboardKPIProps, DashboardReport(), DashboardReportProps, KPICard(), KPICardProps, ProjectDetailsModal() (+6 more)

### Community 38 - "Admin Settings Hooks"
Cohesion: 0.13
Nodes (13): AdminSettings(), DEFAULT_HEALTH_SETTINGS, ProjectHealthSettings, useAdminSettings(), useAdminStats(), useStorageStats(), Vacation, VacationInput (+5 more)

### Community 39 - "Conversion Issues Hooks"
Cohesion: 0.12
Nodes (18): ConversionIssuesTab(), EditableCell(), CommandShortcut(), DropdownMenuShortcut(), Toggle, toggleVariants, ConversionIssue, useConversionIssues() (+10 more)

### Community 40 - "Distribution/Workload Charts"
Cohesion: 0.13
Nodes (14): ProjectDistributionChart(), ProjectDistributionChartProps, StatusChart(), StatusChartProps, WorkloadChart(), WorkloadChartProps, ChartConfig, ChartContainer (+6 more)

### Community 41 - "RICE Prioritizer (Python)"
Cohesion: 0.15
Nodes (13): create_sample_csv(), format_output(), load_features_from_csv(), main(), Generate a quarterly roadmap based on team capacity                  Args:, Calculate RICE scores for feature prioritization, Format the results for display, Load features from CSV file (+5 more)

### Community 42 - "App Sidebar & Layout"
Cohesion: 0.18
Nodes (12): AppSidebar(), MainLayout(), MainLayoutProps, ModeToggle(), Sidebar, SidebarContext, SidebarProvider, SidebarTrigger (+4 more)

### Community 43 - "Implementation Stage & Rich Text"
Cohesion: 0.20
Nodes (14): StageCard(), StageCardProps, ImplementationPhaseForm(), ImplementationStageForm(), ImplementationStageFormProps, PhaseFormProps, RichTextEditor(), RichTextEditorProps (+6 more)

### Community 44 - "Worker package.json"
Cohesion: 0.11
Nodes (17): dependencies, dotenv, @supabase/supabase-js, description, devDependencies, tsx, @types/node, typescript (+9 more)

### Community 45 - "Playwright Helpers"
Cohesion: 0.14
Nodes (6): authenticate(), { chromium, firefox, webkit }, createContext(), getExtraHeadersFromEnv(), safeClick(), safeType()

### Community 46 - "shadcn components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 47 - "Caveman Skill Family"
Cohesion: 0.14
Nodes (16): caveman-compress skill, Memory File Token Savings, Snyk High Risk False Positive, Caveman Compression Rules, FILE.original.md Backup, caveman-help skill, CAVEMAN_DEFAULT_MODE Config, Caveman Reference Card (+8 more)

### Community 48 - "Projects Hooks & Stage Types"
Cohesion: 0.17
Nodes (12): AdherenceStageFormProps, ModelosEditorWorkspaceProps, ProjectRow, useTimeline(), AdherenceStageV2, AuditEntry, ContentBlock, GlobalStatus (+4 more)

### Community 49 - "tsconfig.node"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 50 - "Playwright package.json"
Cohesion: 0.13
Nodes (14): author, dependencies, playwright, description, engines, node, keywords, license (+6 more)

### Community 51 - "Modelos Editor & Model Jobs"
Cohesion: 0.24
Nodes (13): jszip, formatStepTime(), ModelosEditorWorkspace(), ModelosMetrics(), ProgressBody(), mapHeartbeat(), mapJob(), useModelGenerationJobs() (+5 more)

### Community 52 - "Deployment Cards & Reports"
Cohesion: 0.31
Nodes (7): DeploymentCard(), DeploymentDetailsDialog(), ProjectHeaderStats(), StageAnalysisTimeline(), Badge(), BadgeProps, badgeVariants

### Community 53 - "Infra Validation"
Cohesion: 0.31
Nodes (12): InfraStageForm(), PublicInfraCollection(), ServerInfo, WorkstationInfo, checkServerRequirements(), checkWorkstationRequirements(), extractGeneration(), formatDiskFreeSpace() (+4 more)

### Community 54 - "Project Transformers"
Cohesion: 0.41
Nodes (12): calculateHealthScore(), formatDateForDB(), mapAdherenceStage(), mapConversionStage(), mapEnvironmentStage(), mapImplementationStage(), mapInfraStage(), mapModelosEditorStage() (+4 more)

### Community 55 - "Lexical Editor Config"
Cohesion: 0.21
Nodes (8): Editor(), editorConfig, nodes, Plugins(), ToolbarPlugin(), editorTheme, EditorContentEditable(), Props

### Community 56 - "Auth Context & Protected Route"
Cohesion: 0.26
Nodes (8): UserProfileDrawer(), UserProfileDrawerProps, ProtectedRoute(), AuthContext, AuthContextType, Permission, UserRole, useAuth()

### Community 57 - "Adherence Form & Responses"
Cohesion: 0.23
Nodes (10): AdherenceStageForm(), Checkbox, ProjectFormResponse, UpsertResponseInput, useProjectFormResponse(), useUpsertFormResponse(), getGeneralFields(), getImpactedItems() (+2 more)

### Community 58 - "Predictability & Bottlenecks"
Cohesion: 0.26
Nodes (12): ProjectCardV3(), StepsTab(), BottleneckIssue, getBottleneckColor(), getBottleneckIcon(), getDaysStuck(), getSeverity(), getStageReadiness() (+4 more)

### Community 59 - "Team & 0800 Ticket Tab"
Cohesion: 0.31
Nodes (6): Avatar, AvatarFallback, AvatarImage, Separator, InactiveUser, AREA_COLORS

### Community 60 - "Root tsconfig"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, baseUrl, noImplicitAny, noUnusedLocals, noUnusedParameters, paths, skipLibCheck (+4 more)

### Community 61 - "Worker tsconfig"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, module, moduleResolution, outDir, resolveJsonModule, rootDir, skipLibCheck (+4 more)

### Community 62 - "React/Architecture Skills"
Cohesion: 0.18
Nodes (12): React Patterns Skill, React State Management Skill, Clean Architecture and DDD Principles, Software Architecture Skill, Tailwind Design System Playbook, Tailwind Design System Skill, TypeScript Cheatsheet, TypeScript Expert Skill (+4 more)

### Community 63 - "Frontend package.json"
Cohesion: 0.17
Nodes (11): name, private, scripts, build, build:dev, dev, lint, preview (+3 more)

### Community 64 - "Postgres Indexing Rules"
Cohesion: 0.18
Nodes (11): Cursor-Based Pagination, EXPLAIN ANALYZE for Slow Queries, pg_stat_statements for Query Analysis, VACUUM and ANALYZE Maintenance, Composite Indexes for Multi-Column Queries, Covering Indexes with INCLUDE, Choosing Index Types (B-tree, GIN, BRIN, Hash), Index WHERE and JOIN Columns (+3 more)

### Community 65 - "Deployment Form Fields"
Cohesion: 0.22
Nodes (3): DeploymentFormFields(), RadioGroup, RadioGroupItem

### Community 66 - "Deployment Forms & Template"
Cohesion: 0.27
Nodes (9): Props, DeploymentFormRecord, useDeploymentForms(), DeploymentForms(), validateForm(), check(), DeploymentFormData, generateDeploymentTemplate() (+1 more)

### Community 67 - "Project Form Autosave Hooks"
Cohesion: 0.29
Nodes (7): EditProjectTab(), useDebounce(), AutoSaveConfig, SaveState, useAutoSave(), useProjectForm(), UseProjectFormReturn

### Community 68 - "Roadmap Page"
Cohesion: 0.22
Nodes (6): RoadmapData, RoadmapPage(), StageConfig, StageData, STAGES_CONFIG, TimelineItem()

### Community 69 - "Lexical Serialization"
Cohesion: 0.39
Nodes (8): lexical, LexicalNode, listItemNode(), listNode(), paragraphNode(), parseInline(), plainTextToLexicalJson(), textNode()

### Community 70 - "Sheet Component"
Cohesion: 0.22
Nodes (8): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants

### Community 71 - "Filter Store"
Cohesion: 0.25
Nodes (8): defaultFilters, FilterState, FilterStore, HealthFilter, SavedFilter, SortOrder, StageFilter, ViewPreset

### Community 72 - "Theme Provider"
Cohesion: 0.32
Nodes (6): initialState, Theme, ThemeProviderContext, ThemeProviderState, ThemeProvider(), ThemeProviderProps

### Community 73 - "Schema Validator (Python)"
Cohesion: 0.48
Nodes (6): find_schema_files(), main(), Path, Find database schema files., Validate Prisma schema file., validate_prisma_schema()

### Community 74 - "Health Badge & Pipeline Status"
Cohesion: 0.38
Nodes (4): HealthBadge(), HealthBadgeProps, PipelineStatus(), TooltipContent

### Community 75 - "Git Advanced Workflows"
Cohesion: 0.33
Nodes (6): Cherry-Picking, Git Advanced Workflows, Git Bisect, Interactive Rebase, Git Reflog, Git Worktrees

### Community 76 - "graphify Integration Docs"
Cohesion: 0.47
Nodes (6): graphify extraction subagent prompt, graphify commit hook & CLAUDE.md integration, graphify query / path / explain, graphify incremental update & cluster-only, AGENTS.md graphify integration, CLAUDE.md graphify integration

### Community 77 - "Siplan Hub Architecture Docs"
Cohesion: 0.40
Nodes (6): Adherence questionnaire (cartório sectors), Siplan Hub architecture map, Split Query pattern (useProjectsList / useProjectDetails), GEMINI.md dev guidelines (Siplan HUB), index.html app entry (main.tsx), Siplan HUB README overview

### Community 78 - "Conversion Engines Hook"
Cohesion: 0.33
Nodes (5): ConversionEngineItem, EngineKPIs, EngineStatus, useConversionEngines(), ConversionEngines()

### Community 79 - "Accessibility Skills"
Cohesion: 0.50
Nodes (5): ARIA Patterns, axe-core Automated Accessibility Testing, Accessibility Audit Implementation Playbook, Accessibility Audit and Testing Skill, WCAG Compliance

### Community 80 - "Clean Code & Refactoring Skills"
Cohesion: 0.40
Nodes (5): Clean Code Pragmatic Coding Standards, SRP/DRY/KISS/YAGNI Principles, Incremental Refactoring (Facade/Feature Flag), Technical Debt Analysis and Remediation Skill, Concise Planning Skill

### Community 81 - "Playwright Skill Docs"
Cohesion: 0.40
Nodes (5): Network Interception and Mocking, Page Object Model, Playwright API Reference, Dev Server Auto-Detection, Playwright Browser Automation (Skill)

### Community 82 - "RLS & SQL Optimization"
Cohesion: 0.40
Nodes (5): Principle of Least Privilege, Row Level Security for Multi-Tenant Data, Optimize RLS Policies for Performance, SQL Optimization Implementation Playbook, SQL Optimization Patterns Skill

### Community 83 - "Cavecrew/Caveman Docs"
Cohesion: 0.40
Nodes (5): Cavecrew README, Cavecrew Delegation Guide, Caveman Commit README, Caveman Commit Skill, Project Rules (No Git Push Without Permission)

### Community 84 - "Frontend Security"
Cohesion: 0.50
Nodes (4): Content Security Policy (CSP), DOMPurify Sanitization, Frontend Security Coder, XSS Prevention

### Community 85 - "Sonner Toast"
Cohesion: 0.50
Nodes (3): sonner, SonnerToaster(), ToasterProps

### Community 86 - "Postgres Locking Rules"
Cohesion: 0.67
Nodes (3): UPSERT with ON CONFLICT, Deadlock Prevention with Consistent Lock Ordering, Keep Transactions Short

### Community 87 - "Postgres Schema Rules"
Cohesion: 0.67
Nodes (3): Choose Appropriate Data Types, Use Lowercase Identifiers, Primary Key Strategy (IDENTITY, UUIDv7)

### Community 88 - "Product Manager Toolkit"
Cohesion: 0.67
Nodes (3): PRD Templates, Product Manager Toolkit Skill, RICE Prioritization Framework

### Community 89 - "Gemini Optimization Docs"
Cohesion: 0.67
Nodes (3): Build warning fixes (Recharts chunks, bundle size), Three-phase optimization (Type Safety, DB, React), Optimization report summary

### Community 90 - "CI/CD Automation Workflows"
Cohesion: 0.67
Nodes (3): Supabase migrations GitHub Actions workflow, Worker heartbeat alert workflow (Teams), Automation overview (deploy / migrations / alert)

## Knowledge Gaps
- **622 isolated node(s):** `{ chromium, firefox, webkit }`, `name`, `version`, `description`, `author` (+617 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Conversion Issues Hooks` to `Dashboard Charts & Status Config`, `Conversion Post Feed`, `Conversion Issues & Filters`, `Recent Activity & UI Primitives`, `Project Modal & Roadmap Tabs`, `Editor Toolbar & UI Inputs`, `Alerts & DTC AI Hooks`, `Component Prop Types`, `Calendar Grid & Drag-Drop`, `Toast Notifications`, `Adherence Form Renderer`, `Conversion/Infra Stage Forms`, `Notification Bell & Dropdown`, `Notifications & Conversion Types`, `Sidebar Components`, `Checklist & Visual Question Builder`, `Dashboard Table & Pagination`, `Project Grid & List Hooks`, `Post Observations Editor`, `Auth & Commercial Checklists`, `Dashboard KPI & PDF Report`, `Admin Settings Hooks`, `Distribution/Workload Charts`, `App Sidebar & Layout`, `Implementation Stage & Rich Text`, `Modelos Editor & Model Jobs`, `Deployment Cards & Reports`, `Infra Validation`, `Lexical Editor Config`, `Adherence Form & Responses`, `Predictability & Bottlenecks`, `Team & 0800 Ticket Tab`, `Deployment Form Fields`, `Deployment Forms & Template`, `Project Form Autosave Hooks`, `Roadmap Page`, `Sheet Component`, `Health Badge & Pipeline Status`, `Conversion Engines Hook`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Why does `dependencies` connect `NPM Runtime Dependencies` to `Auth & Commercial Checklists`, `Lexical Serialization`, `Dashboard KPI & PDF Report`, `Modelos Editor & Model Jobs`, `Sonner Toast`, `Frontend package.json`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `err()` connect `Auth & Commercial Checklists` to `Project Grid & List Hooks`, `Post Observations Editor`, `Conversion Post Feed`, `VM Worker Job Queue`, `TypeScript Utility Types`, `Conversion Issues Hooks`, `Implementation Stage & Rich Text`, `Conversion Engines Hook`, `Alerts & DTC AI Hooks`, `Modelos Editor & Model Jobs`, `Infra Validation`, `Notifications & Conversion Types`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **What connects `Production-ready REST API template using FastAPI. Includes pagination, filterin`, `List users with pagination and filtering.`, `Partially update user.` to the rest of the system?**
  _713 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Playwright Runner & Benchmarks` be split into smaller, more focused modules?**
  _Cohesion score 0.05706760316066725 - nodes in this community are weakly interconnected._
- **Should `Dashboard Charts & Status Config` be split into smaller, more focused modules?**
  _Cohesion score 0.10163934426229508 - nodes in this community are weakly interconnected._
- **Should `NPM Runtime Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.034482758620689655 - nodes in this community are weakly interconnected._