# Graph Report - .  (2026-07-08)

## Corpus Check
- 306 files · ~218,401 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1162 nodes · 4275 edges · 58 communities (53 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.63)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Conversion Issues & Post Forms
- Conversion Post Feed & Drawer
- App Routes & Pages
- Queue Card & Project Info
- VM Worker Job Queue
- Alerts & DTC AI/Team Hooks
- Checklist & Visual Question Builder
- Project Stage Forms & Models
- Charts, KPI & Reports
- Notification Bell & Dropdown
- Calendar Grid & Drag-Drop
- Modal/Tab Prop Types
- Adherence Form Renderer
- Sidebar Components
- Deployment Cards & Project Hooks
- Dashboard KPI & Report
- Custom Widgets & Sheet
- Dashboard Table & Pagination
- App Sidebar & Protected Route
- Overview/Activity & Avatar
- Commercial & Conversion Hooks
- Worker package.json
- Distribution/Workload Charts
- Modelos Editor & Model Jobs
- VM Worker Domain (README)
- Deployment Form Fields
- Project Transformers & Stages
- use-toast Reducer
- Project Modal & Kanban
- Commercial/Public Checklists
- Commercial Page & Hooks
- Lexical Editor Config
- Predictability & Bottlenecks
- Worker tsconfig
- Main Layout & Theme Toggle
- Post Observations Editor
- Toast Component
- Admin Stats & RBAC Hooks
- Files Tab & Accordion
- Roadmap Page
- Deployment Template & Stage Forms
- Theme Provider
- Health Badge & Pipeline Status
- Admin Settings
- Auth Context
- Button Variants & Calendar
- Menu Items & Home
- Improve-Text AI Jobs
- Toggle Component
- Supabase Deno Config
- CORS Headers (Edge Fn)
- Auto-Deploy Script
- Worker Watchdog Script

## God Nodes (most connected - your core abstractions)
1. `cn()` - 182 edges
2. `ProjectV2` - 85 edges
3. `Button` - 77 edges
4. `useToast()` - 63 edges
5. `Card` - 61 edges
6. `CardContent` - 60 edges
7. `Badge()` - 57 edges
8. `supabase` - 50 edges
9. `CardHeader` - 49 edges
10. `CardTitle` - 48 edges

## Surprising Connections (you probably didn't know these)
- `AdminLayout()` --indirect_call--> `sendHeartbeat()`  [INFERRED]
  src/layouts/AdminLayout.tsx → vm-worker/src/index.ts
- `listToText()` --indirect_call--> `v()`  [INFERRED]
  vm-worker/src/processDtcJob.ts → src/utils/deployment-template.ts
- `DashboardReportProps` --references--> `ProjectV2`  [EXTRACTED]
  src/components/Dashboard/DashboardReport.tsx → src/types/ProjectV2.ts
- `DashboardTableProps` --references--> `ProjectV2`  [EXTRACTED]
  src/components/Dashboard/DashboardTable.tsx → src/types/ProjectV2.ts
- `PipelineStatusProps` --references--> `ProjectV2`  [EXTRACTED]
  src/components/Dashboard/PipelineStatus.tsx → src/types/ProjectV2.ts

## Import Cycles
- None detected.

## Communities (58 total, 5 thin omitted)

### Community 0 - "Conversion Issues & Post Forms"
Cohesion: 0.06
Nodes (117): ConversionIssuesTab(), ConversionIssuesTabProps, PRIORITIES, STATUSES, NewPostForm(), STAGE_OPTIONS, COLORS, FONT_SIZES (+109 more)

### Community 1 - "Conversion Post Feed & Drawer"
Cohesion: 0.06
Nodes (45): ConversionPostDrawer(), ConversionPostDrawerProps, STATUS_LABELS, ConversionPostFeed(), ConversionPostFeedProps, formatPostDate(), getInitials(), groupPostsByDate() (+37 more)

### Community 2 - "App Routes & Pages"
Cohesion: 0.04
Nodes (51): AderenciasFinalizadas, AdminDashboard, AdminLayout, AdminSettings, AgendaAnalistas, Analytics, App(), AuditLogPage (+43 more)

### Community 3 - "Queue Card & Project Info"
Cohesion: 0.05
Nodes (35): CompactQueueCard(), CompactQueueCardProps, STATUS_COLORS, STATUS_LABELS, ProjectInfo, ProjectInfoSection(), ProjectInfoSectionProps, AdvancedFilters() (+27 more)

### Community 4 - "VM Worker Job Queue"
Cohesion: 0.10
Nodes (41): config, DtcJob, Job, ModelType, claimAndProcess(), claimOneDtcJob(), claimOneModelJob(), installShutdownHandlers() (+33 more)

### Community 5 - "Alerts & DTC AI/Team Hooks"
Cohesion: 0.08
Nodes (33): Alert, AlertDescription, AlertTitle, alertVariants, mapJob(), useDtcAiJobs(), useTeamMembers(), LexicalNode (+25 more)

### Community 6 - "Checklist & Visual Question Builder"
Cohesion: 0.10
Nodes (29): ChecklistEditor(), ChecklistEditorProps, SYSTEM_TYPES, convertVisualToJSONSchema(), convertVisualToUISchema(), parseJSONSchemaToVisual(), VisualQuestion, VisualQuestionBuilder() (+21 more)

### Community 7 - "Project Stage Forms & Models"
Cohesion: 0.07
Nodes (34): AdherenceStageFormProps, ConversionStageFormProps, EnvironmentStageFormProps, ImplementationStageFormProps, PhaseFormProps, InfraStageFormProps, ProjectRow, AdherenceStageV2 (+26 more)

### Community 8 - "Charts, KPI & Reports"
Cohesion: 0.20
Nodes (16): ProjectStatusChartProps, STATUS_LABELS, KPICardProps, IndividualProjectReportProps, ProjectHeaderStats(), ProjectHeaderStatsProps, StageAnalysisTimeline(), Card (+8 more)

### Community 9 - "Notification Bell & Dropdown"
Cohesion: 0.08
Nodes (28): NOTIFICATION_TYPE_ICONS, NotificationBell(), DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuShortcut(), DropdownMenuSubContent, DropdownMenuSubTrigger (+20 more)

### Community 10 - "Calendar Grid & Drag-Drop"
Cohesion: 0.17
Nodes (21): CalendarControls(), CalendarGrid(), CalendarGridProps, DayDroppableZone(), DraggableTeamMember(), DraggableTeamMemberProps, CalendarEventPill(), CalendarEventPillProps (+13 more)

### Community 11 - "Modal/Tab Prop Types"
Cohesion: 0.10
Nodes (24): ProjectDetailsModalProps, TimelineChartProps, DeploymentDetailsDialogProps, Chamado0800TabProps, TabProps, LogsTabProps, TabProps, AdherenceGapCard() (+16 more)

### Community 12 - "Adherence Form Renderer"
Cohesion: 0.10
Nodes (18): AdherenceImpactSummary(), AdherenceQuestionField(), AdherenceQuestionValue, ArrayFieldTemplateItem, checkHasAdherenceQuestions(), CustomArrayFieldTemplate(), customFields, CustomFieldTemplate() (+10 more)

### Community 13 - "Sidebar Components"
Cohesion: 0.09
Nodes (22): SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInput (+14 more)

### Community 14 - "Deployment Cards & Project Hooks"
Cohesion: 0.14
Nodes (15): Breadcrumbs(), DeploymentCard(), DeploymentCardProps, DeploymentDetailsDialog(), useProjectsV2(), useTimeline(), getMarqueeStyle(), CompareProjects() (+7 more)

### Community 15 - "Dashboard KPI & Report"
Cohesion: 0.14
Nodes (15): DashboardKPI(), DashboardKPIProps, DashboardReport(), DashboardReportProps, KPICard(), ProjectDetailsModal(), ProjectDistributionChart(), StatusChart() (+7 more)

### Community 16 - "Custom Widgets & Sheet"
Cohesion: 0.12
Nodes (19): CustomCheckboxWidget(), CustomImageUploadWidget(), EditableCell(), ProjectSelector(), CommandShortcut(), PaginationEllipsis(), SheetContent, SheetContentProps (+11 more)

### Community 17 - "Dashboard Table & Pagination"
Cohesion: 0.18
Nodes (15): DashboardTable(), DashboardTableProps, ButtonProps, Pagination(), PaginationContent, PaginationItem, PaginationLink(), PaginationLinkProps (+7 more)

### Community 18 - "App Sidebar & Protected Route"
Cohesion: 0.20
Nodes (12): AppSidebar(), UserProfileDrawer(), UserProfileDrawerProps, StepsTab(), ProtectedRoute(), Sidebar, SidebarContext, useSidebar() (+4 more)

### Community 19 - "Overview/Activity & Avatar"
Cohesion: 0.22
Nodes (11): data, OverviewChart(), ProjectStatusChart(), formatAction(), RecentActivity(), Avatar, AvatarFallback, AvatarImage (+3 more)

### Community 20 - "Commercial & Conversion Hooks"
Cohesion: 0.16
Nodes (10): Client, Contact, Project, ConversionEngineItem, EngineKPIs, EngineStatus, ConversionIssue, Vacation (+2 more)

### Community 21 - "Worker package.json"
Cohesion: 0.11
Nodes (17): dependencies, dotenv, @supabase/supabase-js, description, devDependencies, tsx, @types/node, typescript (+9 more)

### Community 22 - "Distribution/Workload Charts"
Cohesion: 0.16
Nodes (10): ProjectDistributionChartProps, StatusChartProps, WorkloadChartProps, ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent (+2 more)

### Community 23 - "Modelos Editor & Model Jobs"
Cohesion: 0.20
Nodes (15): formatStepTime(), ModelosEditorWorkspace(), ModelosEditorWorkspaceProps, ModelosMetrics(), ProgressBody(), mapHeartbeat(), mapJob(), useModelGenerationJobs() (+7 more)

### Community 24 - "VM Worker Domain (README)"
Cohesion: 0.16
Nodes (16): Auto-deploy via cron (auto-deploy.sh, GitHub API), Auto-descoberta do binário do Claude (CLAUDE_BIN opcional), VM Worker README (geração automática de modelos), Rascunho headless requer revisão do analista, Heartbeat do worker (model_worker_heartbeat, selo online/offline), Claim de job (FOR UPDATE SKIP LOCKED), Andamento ao vivo (stream-json, progress/progress_log), Fila de jobs model_generation_jobs (Supabase) (+8 more)

### Community 25 - "Deployment Form Fields"
Cohesion: 0.17
Nodes (6): Props, Checkbox, RadioGroup, RadioGroupItem, DeploymentFormRecord, DeploymentFormData

### Community 26 - "Project Transformers & Stages"
Cohesion: 0.35
Nodes (13): StageCardProps, BottleneckIssue, StageStatus, formatDateForDB(), mapAdherenceStage(), mapConversionStage(), mapEnvironmentStage(), mapImplementationStage() (+5 more)

### Community 27 - "use-toast Reducer"
Cohesion: 0.19
Nodes (13): Action, ActionType, actionTypes, addToRemoveQueue(), dispatch(), genId(), listeners, memoryState (+5 more)

### Community 28 - "Project Modal & Kanban"
Cohesion: 0.18
Nodes (9): ProjectModal(), Progress, useStorageStats(), SystemStorage(), STATUS_CONFIG, Column, COLUMNS, KanbanStatus (+1 more)

### Community 29 - "Commercial/Public Checklists"
Cohesion: 0.34
Nodes (9): FallbackChecklistForm(), FallbackChecklistFormProps, CommercialChecklistRecord, useSingleCommercialChecklist(), KeyPerson, usePublicChecklist(), PublicChecklist(), formatBrazilianPhone() (+1 more)

### Community 30 - "Commercial Page & Hooks"
Cohesion: 0.19
Nodes (14): useToast(), useCommercial(), useCommercialChecklists(), useDeploymentForms(), ClientOverview(), CommercialBlockers(), getBlockers(), CommercialChecklists() (+6 more)

### Community 31 - "Lexical Editor Config"
Cohesion: 0.21
Nodes (8): Editor(), editorConfig, nodes, Plugins(), ToolbarPlugin(), editorTheme, EditorContentEditable(), Props

### Community 32 - "Predictability & Bottlenecks"
Cohesion: 0.32
Nodes (11): ProjectCardV3(), ProjectCardV3Props, getBottleneckColor(), getBottleneckIcon(), getDaysStuck(), getSeverity(), getStageReadiness(), identifyBottleneck() (+3 more)

### Community 33 - "Worker tsconfig"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, module, moduleResolution, outDir, resolveJsonModule, rootDir, skipLibCheck (+4 more)

### Community 34 - "Main Layout & Theme Toggle"
Cohesion: 0.21
Nodes (8): MainLayout(), MainLayoutProps, ModeToggle(), NewProjectDialog(), SidebarProvider, SidebarTrigger, useTheme(), Login()

### Community 35 - "Post Observations Editor"
Cohesion: 0.21
Nodes (12): blockTextLen(), blockToPlain(), escapeHtml(), fmtDate(), inlineHtml(), lexToHtml(), makeBlock(), newId() (+4 more)

### Community 36 - "Toast Component"
Cohesion: 0.24
Nodes (10): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+2 more)

### Community 37 - "Admin Stats & RBAC Hooks"
Cohesion: 0.24
Nodes (8): useAuditLogs(), useTeams(), RolesManagement(), TeamConfiguration(), UserManagement(), AdminStats, AuditLog, Team

### Community 38 - "Files Tab & Accordion"
Cohesion: 0.33
Nodes (7): FilesTab(), TabProps, AccordionContent, AccordionItem, AccordionTrigger, useProjectFiles(), ProjectFile

### Community 39 - "Roadmap Page"
Cohesion: 0.22
Nodes (6): RoadmapData, RoadmapPage(), StageConfig, StageData, STAGES_CONFIG, TimelineItem()

### Community 40 - "Deployment Template & Stage Forms"
Cohesion: 0.31
Nodes (8): DeploymentFormFields(), ConversionStageForm(), ImplementationPhaseForm(), MyQueueDetailedCard(), check(), generateDeploymentTemplate(), v(), yn()

### Community 41 - "Theme Provider"
Cohesion: 0.31
Nodes (6): initialState, Theme, ThemeProviderContext, ThemeProviderState, ThemeProvider(), ThemeProviderProps

### Community 42 - "Health Badge & Pipeline Status"
Cohesion: 0.32
Nodes (5): HealthBadge(), HealthBadgeProps, PipelineStatus(), PipelineStatusProps, TooltipContent

### Community 43 - "Admin Settings"
Cohesion: 0.43
Nodes (5): AdminSettings(), STAGE_LABELS, DEFAULT_HEALTH_SETTINGS, ProjectHealthSettings, useAdminSettings()

### Community 44 - "Auth Context"
Cohesion: 0.43
Nodes (5): AuthProvider(), AuthContext, AuthContextType, Permission, UserRole

### Community 45 - "Button Variants & Calendar"
Cohesion: 0.60
Nodes (3): buttonVariants, Calendar(), CalendarProps

### Community 46 - "Menu Items & Home"
Cohesion: 0.60
Nodes (3): MenuItem, menuItems, Home()

### Community 47 - "Improve-Text AI Jobs"
Cohesion: 0.83
Nodes (3): mapJob(), TEXT_JOB_TYPES, useImproveTextJobs()

## Knowledge Gaps
- **292 isolated node(s):** `Index`, `Home`, `Reports`, `Analytics`, `CompareProjects` (+287 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Custom Widgets & Sheet` to `Conversion Issues & Post Forms`, `Conversion Post Feed & Drawer`, `Queue Card & Project Info`, `Alerts & DTC AI/Team Hooks`, `Checklist & Visual Question Builder`, `Charts, KPI & Reports`, `Notification Bell & Dropdown`, `Calendar Grid & Drag-Drop`, `Modal/Tab Prop Types`, `Adherence Form Renderer`, `Sidebar Components`, `Deployment Cards & Project Hooks`, `Dashboard KPI & Report`, `Dashboard Table & Pagination`, `App Sidebar & Protected Route`, `Overview/Activity & Avatar`, `Distribution/Workload Charts`, `Modelos Editor & Model Jobs`, `Deployment Form Fields`, `Project Modal & Kanban`, `Commercial Page & Hooks`, `Lexical Editor Config`, `Predictability & Bottlenecks`, `Main Layout & Theme Toggle`, `Post Observations Editor`, `Toast Component`, `Files Tab & Accordion`, `Roadmap Page`, `Deployment Template & Stage Forms`, `Health Badge & Pipeline Status`, `Button Variants & Calendar`, `Toggle Component`?**
  _High betweenness centrality (0.241) - this node is a cross-community bridge._
- **Why does `AdminLayout()` connect `App Sidebar & Protected Route` to `Custom Widgets & Sheet`, `Main Layout & Theme Toggle`, `VM Worker Job Queue`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `sendHeartbeat()` connect `VM Worker Job Queue` to `App Sidebar & Protected Route`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `Index`, `Home`, `Reports` to the rest of the system?**
  _295 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Conversion Issues & Post Forms` be split into smaller, more focused modules?**
  _Cohesion score 0.059067227418241164 - nodes in this community are weakly interconnected._
- **Should `Conversion Post Feed & Drawer` be split into smaller, more focused modules?**
  _Cohesion score 0.05704365079365079 - nodes in this community are weakly interconnected._
- **Should `App Routes & Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.03771043771043771 - nodes in this community are weakly interconnected._