import {
  LayoutGrid,
  BarChart3,
  LayoutDashboard,
  Headset,
  History,
  ClipboardList,
  Layers,
  FolderKanban,
  Rocket,
  Calendar,
  Users,
  Briefcase,
  AlertCircle,
  Contact,
  Database,
  FileText,
  FileEdit,
  Cog,
  Bot,
  Link2,
  Clock3,
  HelpCircle,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  Shield,
  BookOpen,
  ListChecks,
  Building2,
  Star,
  LucideIcon,
  Home,
  Sliders,
  Terminal,
  Activity,
  LifeBuoy,
} from "lucide-react";

export interface PageHelpStep {
  stepNumber: number;
  title: string;
  description: string;
  icon?: LucideIcon;
}

export interface PageHelpTip {
  title: string;
  description: string;
  variant?: "tip" | "warning" | "info";
}

export interface PageHelpQuickLink {
  label: string;
  path: string;
}

export interface PageHelpInfo {
  route: string;
  title: string;
  subtitle?: string;
  moduleName: string;
  icon: LucideIcon;
  description: string; // O que a tela faz / Visão Geral
  keyFeatures: string[]; // Principais funcionalidades
  steps: PageHelpStep[]; // Tutorial passo a passo
  tips?: PageHelpTip[]; // Dicas e boas práticas
  quickLinks?: PageHelpQuickLink[]; // Links de atalho
}

export const pageHelpData: PageHelpInfo[] = [
  {
    route: "/",
    title: "Central de Navegação Siplan HUB",
    subtitle: "Página Inicial",
    moduleName: "Siplan HUB",
    icon: Home,
    description:
      "Esta é a página inicial do Siplan HUB. Ela reúne cartões de atalho para todos os módulos e funcionalidades do sistema aos quais você tem permissão de acesso.",
    keyFeatures: [
      "Busca rápida por nome de tela ou módulo",
      "Cards interativos com descrição dos módulos ativos",
      "Navegação otimizada por permissão de usuário (RBAC)",
      "Atalho direto para o PWA e notificações do sistema",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Pesquise uma funcionalidade",
        description:
          "Utilize a barra de pesquisa 'Encontrar tela...' para localizar rapidamente a ferramenta desejada.",
        icon: Sparkles,
      },
      {
        stepNumber: 2,
        title: "Selecione o Módulo",
        description:
          "Clique sobre o card do módulo (ex: Implantação, Comercial, Dashboard) para acessar sua central.",
        icon: LayoutGrid,
      },
      {
        stepNumber: 3,
        title: "Verifique notificações",
        description:
          "Acompanhe no ícone de sino no topo superior direito os alertas e avisos pendentes.",
        icon: CheckCircle2,
      },
    ],
    tips: [
      {
        title: "Atalho de Teclado",
        description:
          "Você pode clicar no menu lateral para recolher ou expandir a barra de navegação.",
        variant: "tip",
      },
      {
        title: "Acesso a Módulos Restritos",
        description:
          "Caso precise de acesso a um módulo que não aparece na sua tela, solicite a um Administrador.",
        variant: "info",
      },
    ],
  },
  {
    route: "/dashboard",
    title: "Central do Dashboard",
    subtitle: "Indicadores e Visão Geral",
    moduleName: "Dashboard",
    icon: LayoutGrid,
    description:
      "A Central do Dashboard consolida a inteligência operacional do sistema, oferecendo métricas de saúde dos projetos, quadro Kanban, panoramas de pós-implantação e consulta de chamados.",
    keyFeatures: [
      "Indicadores consolidados em tempo real",
      "Visão de ciclo de vida de projetos de implantação",
      "Acompanhamento de chamados 0800 e suporte",
      "Navegação para sub-relatórios especializados",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Explore os Atalhos do Módulo",
        description:
          "Nesta tela você encontra acesso direto ao Kanban, Panorama Pós e Consulta de Chamados.",
        icon: LayoutGrid,
      },
      {
        stepNumber: 2,
        title: "Analise a Performance",
        description:
          "Acesse 'Dashboard Indicadores' para ver gráficos de volume e distribuição por estado.",
        icon: BarChart3,
      },
      {
        stepNumber: 3,
        title: "Monitore o Fluxo Kanban",
        description:
          "Use o Quadro Kanban para arrastar e avançar cartórios nas fases de implantação.",
        icon: LayoutDashboard,
      },
    ],
    tips: [
      {
        title: "Atualização Automática",
        description:
          "Os dados são sincronizados em tempo real com o banco de dados do Supabase.",
        variant: "tip",
      },
    ],
    quickLinks: [
      { label: "Indicadores", path: "/dashboard/indicadores" },
      { label: "Quadro Kanban", path: "/dashboard/kanban" },
      { label: "Panorama Pós-Implantação", path: "/dashboard/pos-implantacao" },
    ],
  },
  {
    route: "/dashboard/indicadores",
    title: "Métricas & Indicadores de Projetos",
    subtitle: "Indicadores Globais",
    moduleName: "Dashboard",
    icon: BarChart3,
    description:
      "Exibe estatísticas avançadas sobre os projetos de implantação, incluindo Health Score, distribuição por produto, status dos projetos e taxas de conclusão.",
    keyFeatures: [
      "Métricas de Health Score dos cartórios ativos",
      "Gráficos por tipo de produto e região",
      "Filtros dinâmicos por período e gestor",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Filtre os dados",
        description:
          "Ajuste os filtros de período e responsável no topo da tela para refinar os indicadores.",
        icon: Sliders,
      },
      {
        stepNumber: 2,
        title: "Interaja com os Gráficos",
        description:
          "Passe o cursor ou toque nos gráficos para ver o detalhamento numérico e percentual.",
        icon: BarChart3,
      },
    ],
  },
  {
    route: "/dashboard/kanban",
    title: "Quadro Kanban de Projetos",
    subtitle: "Fluxo de Trabalho de Implantação",
    moduleName: "Dashboard",
    icon: LayoutDashboard,
    description:
      "Visualização em colunas das fases dos projetos. Permite acompanhar de forma ágil a transição dos cartórios desde o planejamento até o encerramento.",
    keyFeatures: [
      "Cartões responsivos com nome do cliente, status e responsável",
      "Indicadores visuais de atraso ou risco",
      "Filtro por busca textual rápida",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Visualize o Funil",
        description:
          "Identifique em qual estágio o cartório se encontra observando as colunas do Kanban.",
        icon: LayoutDashboard,
      },
      {
        stepNumber: 2,
        title: "Abra o Detalhe",
        description:
          "Clique sobre o card de um projeto para visualizar os formulários e histórico de tarefas.",
        icon: FileText,
      },
    ],
  },
  {
    route: "/implantacao",
    title: "Central de Implantação",
    subtitle: "Gestão de Projetos e Entregas",
    moduleName: "Implantação",
    icon: Layers,
    description:
      "Módulo principal para orquestração de implantações de software nos cartórios. Reúne a gestão de projetos ativos, cronogramas, relatórios e controle de lançamentos.",
    keyFeatures: [
      "Gerenciamento completo dos projetos V2",
      "Relatórios de progresso e entregáveis",
      "Controle de próximas e últimas implantações",
      "Central de formulários de etapas",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Acesse a Lista de Projetos",
        description:
          "Clique em 'Gerenciar Projetos' para abrir a listagem completa e realizar edições.",
        icon: FolderKanban,
      },
      {
        stepNumber: 2,
        title: "Acompanhe Cronogramas",
        description:
          "Acesse os relatórios e próximos lançamentos para prever datas de Go-Live.",
        icon: Rocket,
      },
    ],
    quickLinks: [
      { label: "Gerenciar Projetos", path: "/projects" },
      { label: "Relatórios", path: "/reports" },
      { label: "Próximas Implantações", path: "/deployments" },
    ],
  },
  {
    route: "/projects",
    title: "Gerenciamento de Projetos",
    subtitle: "Lista e Acompanhamento V2",
    moduleName: "Implantação",
    icon: FolderKanban,
    description:
      "Tela operacional mais importante da Implantação. Permite visualizar todos os cartórios cadastrados, filtrar por status/estágio, cadastrar novos projetos e editar detalhes técnicos.",
    keyFeatures: [
      "Busca rápida por cartório, sistema ou analista",
      "Filtros múltiplos por Health Score, Status e Produto",
      "Modal de edição com formulários para cada estágio V2",
      "Autosave com preservação de alterações pendentes",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Localize o Projeto",
        description:
          "Digite o nome do cartório na barra de pesquisa ou utilize os filtros de status e saúde.",
        icon: Sparkles,
      },
      {
        stepNumber: 2,
        title: "Abra os Detalhes",
        description:
          "Clique na linha ou botão de editar para abrir a janela com as abas de Estágios, Notas e Histórico.",
        icon: FileEdit,
      },
      {
        stepNumber: 3,
        title: "Atualize os Estágios",
        description:
          "Preencha as datas e check-lists em cada estágio (Reunião Inicial, Homologação, Go-Live, etc.). Os dados são salvos automaticamente.",
        icon: CheckCircle2,
      },
    ],
    tips: [
      {
        title: "Salva Inteligente (Autosave)",
        description:
          "Ao preencher formulários de estágio, o sistema salva automaticamente após alguns segundos de inatividade.",
        variant: "tip",
      },
      {
        title: "Novo Projeto",
        description:
          "Para cadastrar um novo cartório, utilize o botão '+ Novo Projeto' no canto superior direito.",
        variant: "info",
      },
    ],
  },
  {
    route: "/reports",
    title: "Relatórios de Implantação",
    subtitle: "Análise de Performance",
    moduleName: "Implantação",
    icon: BarChart3,
    description:
      "Gera relatórios gerenciais e operacionais contendo o status detalhado das entregas, tempo médio por etapa e aderência dos cartórios.",
    keyFeatures: [
      "Exportação de dados e resumos executivos",
      "Detalhamento por analista e módulo",
      "Visão de desvios de prazo e cronograma",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Selecione o Tipo de Relatório",
        description: "Escolha o parâmetro desejado nos filtros superiores.",
        icon: Sliders,
      },
      {
        stepNumber: 2,
        title: "Exporte ou Imprima",
        description:
          "Utilize o botão de exportar para gerar versões em PDF ou planilha.",
        icon: FileText,
      },
    ],
  },
  {
    route: "/calendario",
    title: "Central do Calendário",
    subtitle: "Visão Cronológica",
    moduleName: "Calendário",
    icon: Calendar,
    description:
      "Central de agendamentos e visão temporal de treinamentos, implantações, migrações de dados e disponibilidade dos analistas.",
    keyFeatures: [
      "Calendário interativo por dia, semana e mês",
      "Visão de ocupação e alocação da equipe",
      "Filtro por analista e projeto",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Alterne a Visualização",
        description:
          "Escolha entre a visão de Calendário de Projetos e Agenda dos Analistas.",
        icon: Calendar,
      },
      {
        stepNumber: 2,
        title: "Verifique Agendamentos",
        description:
          "Clique sobre um evento no calendário para ver os detalhes da atividade alocada.",
        icon: Users,
      },
    ],
    quickLinks: [
      { label: "Calendário de Projetos", path: "/calendar" },
      { label: "Agenda dos Analistas", path: "/agenda-analistas" },
    ],
  },
  {
    route: "/calendar",
    title: "Calendário de Projetos",
    subtitle: "Agenda de Entregas e Marcos",
    moduleName: "Calendário",
    icon: Calendar,
    description:
      "Visualização em linha do tempo de todos os eventos de implantação (Treinamentos, Viradas de Chave, Alinhamentos Técnicos).",
    keyFeatures: [
      "Navegação por mês e semana",
      "Código de cores por tipo de evento e prioridade",
      "Arrastar e soltar (Drag & Drop) para reorganizar datas (quando permitido)",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Filtre por Projeto",
        description:
          "Selecione um projeto específico para destacar apenas seus marcos no calendário.",
        icon: Sliders,
      },
      {
        stepNumber: 2,
        title: "Adicione Novo Evento",
        description:
          "Clique no dia desejado ou no botão 'Novo Agendamento' para marcar uma reunião.",
        icon: Calendar,
      },
    ],
  },
  {
    route: "/commercial",
    title: "Central Comercial (CRM)",
    subtitle: "Gestão de Clientes e Oportunidades",
    moduleName: "Comercial",
    icon: Briefcase,
    description:
      "Central de relacionamento com clientes, acompanhamento de propostas, gestão de bloqueios comerciais e cadastros de contatos.",
    keyFeatures: [
      "Painel 360 de Clientes Cartórios",
      "Gestão de Impeditivos e Bloqueios Comerciais",
      "Histórico de Contatos e Interações",
      "Acompanhamento de Checklists Pré-Venda",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Consulte o Painel de Clientes",
        description:
          "Acesse a lista completa de clientes para consultar propostas e status financeiro/comercial.",
        icon: Users,
      },
      {
        stepNumber: 2,
        title: "Gerencie Bloqueios",
        description:
          "Verifique impedimentos que possam paralisar ou influenciar a implantação de um projeto.",
        icon: AlertCircle,
      },
    ],
    quickLinks: [
      { label: "Painel de Clientes", path: "/commercial/customers" },
      { label: "Bloqueios", path: "/commercial/blockers" },
      { label: "Contatos", path: "/commercial/contacts" },
    ],
  },
  {
    route: "/commercial/customers",
    title: "Painel de Clientes Cartórios",
    subtitle: "Visão 360 de Clientes",
    moduleName: "Comercial",
    icon: Building2,
    description:
      "Lista detalhada dos cartórios clientes com dados cadastrais, sistemas contratados, contratos vigentes e pontos de contato.",
    keyFeatures: [
      "Busca rápida por razão social, titular ou CNS",
      "Visualização de produtos ativos por serventia",
      "Link direto para projetos vinculados",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Pesquise a Serventia",
        description: "Digite o nome ou código CNS do cartório na busca.",
        icon: Sparkles,
      },
      {
        stepNumber: 2,
        title: "Veja a Ficha Completa",
        description:
          "Clique no cliente para visualizar o histórico de compras, bloqueios e implantações.",
        icon: Building2,
      },
    ],
  },
  {
    route: "/conversion",
    title: "Central de Conversão de Dados",
    subtitle: "Engenharia de Migração",
    moduleName: "Conversão",
    icon: Database,
    description:
      "Módulo de engenharia de dados focado na migração de bancos legados para o ecossistema Siplan. Gerencia filas de banco, scripts, homologações e validações.",
    keyFeatures: [
      "Fila de solicitações de conversão",
      "Monitoramento de scripts e executáveis",
      "Cronograma de migrações",
      "Validador de aderência de tabelas",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Acompanhe a Fila",
        description:
          "Verifique os bancos de dados que estão em fase de análise, extração ou carga.",
        icon: Database,
      },
      {
        stepNumber: 2,
        title: "Execute Validações",
        description:
          "Utilize as ferramentas de conferência para auditar totais de registros convertidos.",
        icon: CheckCircle2,
      },
    ],
    quickLinks: [
      { label: "Fila de Bancos", path: "/conversion/queue" },
      { label: "Cronograma", path: "/conversion/schedule" },
      { label: "Motores & Scripts", path: "/conversion/engines" },
    ],
  },
  {
    route: "/sd",
    title: "Central SD (Suporte Técnico)",
    subtitle: "Soluções Técnicas e Horas de Suporte",
    moduleName: "SD",
    icon: LifeBuoy,
    description:
      "Gestão de demandas do time de suporte e desenvolvimento (Software Development / Solution Delivery). Controle de apontamentos de horas e chamados técnicos.",
    keyFeatures: [
      "Apontamento de horas de analistas de suporte",
      "Acompanhamento de chamados e solicitações de ajuste",
      "Indicadores de resolução e backlog técnico",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Consulte as Demandas",
        description:
          "Navegue pela lista de solicitações atribuídas ao time técnico.",
        icon: LifeBuoy,
      },
      {
        stepNumber: 2,
        title: "Registre Horas",
        description:
          "Utilize o formulário de horas para contabilizar os atendimentos realizados.",
        icon: Clock3,
      },
    ],
  },
  {
    route: "/orion-tn-models",
    title: "Modelos Editor OrionTN",
    subtitle: "Gerenciador de Templates",
    moduleName: "Modelos OrionTN",
    icon: FileEdit,
    description:
      "Editor de modelos de documentos, minutas e certidões do sistema OrionTN. Permite criar, clonar e estruturar templates com tags dinâmicas.",
    keyFeatures: [
      "Editor Rich-Text com suporte a tags automáticas",
      "Biblioteca de modelos pré-configurados por atribuição",
      "Histórico de versões e homologação",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Escolha o Modelo",
        description:
          "Selecione na lista lateral o modelo de documento que deseja editar.",
        icon: FileEdit,
      },
      {
        stepNumber: 2,
        title: "Insira Variações/Tags",
        description:
          "Utilize o menu de marcadores dinâmicos para incluir campos automatizados no texto.",
        icon: Sparkles,
      },
    ],
  },
  {
    route: "/implantadores",
    title: "Central dos Implantadores",
    subtitle: "Ferramentas do Analista de Campo",
    moduleName: "Implantadores",
    icon: Rocket,
    description:
      "Conjunto de ferramentas operacionais para analistas durante a implantação presencial ou remota. Inclui formulários de homologação e checklist de transição.",
    keyFeatures: [
      "Checklists operacionais de virada",
      "Formulários de homologação por produto",
      "Registro de pendências do cliente",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Inicie o Checklist",
        description:
          "Abra o checklist referente ao produto sendo implantado no cartório.",
        icon: ListChecks,
      },
      {
        stepNumber: 2,
        title: "Valide as Etapas",
        description:
          "Marque os itens à medida que os testes forem executados junto à equipe do cartório.",
        icon: CheckCircle2,
      },
    ],
  },
  {
    route: "/assistentes",
    title: "Central de Assistentes IA",
    subtitle: "Base de Conhecimento e Copiloto",
    moduleName: "Assistentes IA",
    icon: Bot,
    description:
      "Central de gerenciamento de inteligência artificial do Siplan HUB. Permite gerenciar a base de conhecimento (RAG), monitorar logs e configurar assistentes.",
    keyFeatures: [
      "Base de Conhecimento de documentos e Manuais",
      "Logs de interações e respostas da IA",
      "Configuração de Prompts e Modelos (Codex / Ollama)",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Gerencie Documentos",
        description:
          "Em 'Conhecimento', adicione manuais e PDFs para treinar as respostas do copiloto.",
        icon: BookOpen,
      },
      {
        stepNumber: 2,
        title: "Audite Consultas",
        description:
          "Acesse os 'Logs' para verificar as perguntas e respostas dos usuários no sistema.",
        icon: Activity,
      },
    ],
    quickLinks: [
      { label: "Base de Conhecimento", path: "/assistentes/conhecimento" },
      { label: "Logs de Execução", path: "/assistentes/logs" },
    ],
  },
  {
    route: "/dashboard/pos-implantacao",
    title: "Panorama Pós-Implantação",
    subtitle: "Acompanhamento de Chamados 0800",
    moduleName: "Dashboard",
    icon: Headset,
    description:
      "Monitora os chamados de pós-implantação em andamento por produto, tema, cartório e reincidência, garantindo suporte aos cartórios recém-implantados.",
    keyFeatures: [
      "Filtros por produto, período e reincidência",
      "Indicadores de volume de tickets por tema",
      "Acompanhamento de cartórios no período crítico de 0800",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Selecione o Produto",
        description:
          "Utilize os filtros superiores para filtrar apenas o produto desejado.",
        icon: Sliders,
      },
      {
        stepNumber: 2,
        title: "Analise a Reincidência",
        description:
          "Identifique temas recorrentes nos chamados para tomar ações preventivas.",
        icon: AlertCircle,
      },
    ],
  },
  {
    route: "/dashboard/pos-panorama-geral",
    title: "Panorama Geral de Pós",
    subtitle: "Histórico Completo de Atendimentos",
    moduleName: "Dashboard",
    icon: History,
    description:
      "Histórico consolidado dos atendimentos de pós-implantação (em andamento e finalizados), permitindo auditoria e estatísticas de resolução.",
    keyFeatures: [
      "Visão histórica de chamados encerrados e ativos",
      "Tempo médio de atendimento e curva de suporte",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Consulte o Histórico",
        description:
          "Filtre por período ou cartório para consultar todos os chamados já registrados.",
        icon: History,
      },
    ],
  },
  {
    route: "/deployments/tickets",
    title: "Consultar Chamados 0800",
    subtitle: "Busca de Atendimentos",
    moduleName: "Dashboard",
    icon: ClipboardList,
    description:
      "Ferramenta de busca avançada para localizar chamados 0800 por cliente, número do ticket, período e família de produtos.",
    keyFeatures: [
      "Pesquisa textual por cliente ou protocolo",
      "Exportação de lista de chamados",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Pesquise por Cliente/Ticket",
        description: "Digite o código ou razão social na barra de busca.",
        icon: Sparkles,
      },
    ],
  },
  {
    route: "/deployments",
    title: "Próximas Implantações",
    subtitle: "Planejamento de Entregas",
    moduleName: "Implantação",
    icon: Rocket,
    description:
      "Cronograma futuro de lançamentos e instalações agendadas. Permite prever datas de Go-Live e preparar insumos.",
    keyFeatures: [
      "Visão de projetos agendados para os próximos 30/60/90 dias",
      "Previsão de capacidade e alocação",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Verifique a Fila de Lançamento",
        description: "Confira a lista cronológica das próximas instalações.",
        icon: Rocket,
      },
    ],
  },
  {
    route: "/deployments/latest",
    title: "Últimas Implantações",
    subtitle: "Histórico de Instalações",
    moduleName: "Implantação",
    icon: History,
    description:
      "Registro de implantações recentemente concluídas com sucesso, acompanhamento de viradas de chave recentes.",
    keyFeatures: [
      "Lista de cartórios com Go-Live recente",
      "Histórico de encerramento de projetos",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Consulte Entregas Concluídas",
        description:
          "Filtre por mês para visualizar cartórios que concluíram a implantação.",
        icon: CheckCircle2,
      },
    ],
  },
  {
    route: "/agenda-analistas",
    title: "Agenda dos Analistas",
    subtitle: "Alocações da Equipe",
    moduleName: "Calendário",
    icon: Users,
    description:
      "Painel de alocação de tempo dos analistas de implantação. Permite visualizar compromissos presenciais, viagens e treinos agendados.",
    keyFeatures: [
      "Grid de disponibilidade por analista",
      "Evita sobreposição de agendamentos",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Selecione o Analista",
        description:
          "Escolha o membro da equipe para visualizar sua agenda semanal.",
        icon: Users,
      },
    ],
  },
  {
    route: "/commercial/blockers",
    title: "Bloqueios Comerciais",
    subtitle: "Gestão de Impeditivos",
    moduleName: "Comercial",
    icon: AlertCircle,
    description:
      "Acompanhamento de pendências financeiras, contratuais ou operacionais que bloqueiam a implantação de um cartório.",
    keyFeatures: [
      "Lista de impeditivos com prioridade e responsável",
      "Histórico de tratativas comerciais",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Filtre por Gravidade",
        description:
          "Verifique quais bloqueios estão paralisando o Go-Live dos projetos.",
        icon: AlertCircle,
      },
    ],
  },
  {
    route: "/commercial/contacts",
    title: "Histórico de Contatos",
    subtitle: "Interações Comerciais",
    moduleName: "Comercial",
    icon: Contact,
    description:
      "Registro centralizado de contatos, reuniões, e-mails e ligações realizadas com os cartórios clientes.",
    keyFeatures: [
      "Histórico de conversas por serventia",
      "Novo registro de interação comercial",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Registre Nova Interação",
        description:
          "Adicione notas e atas de reuniões realizadas com o cliente.",
        icon: Contact,
      },
    ],
  },
  {
    route: "/commercial/checklists",
    title: "Checklist do Cliente",
    subtitle: "Status de Pré-Venda e Pré-Requisitos",
    moduleName: "Comercial",
    icon: ListChecks,
    description:
      "Acompanhamento da entrega de pré-requisitos pelo cliente (hardware, links, acessos) antes do início da implantação.",
    keyFeatures: [
      "Status de preenchimento do formulário inicial pelo cartório",
      "Validação de infraestrutura mínima",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Verifique Itens Pendentes",
        description:
          "Confira se o cartório enviou os acessos e infraestrutura necessária.",
        icon: ListChecks,
      },
    ],
  },
  {
    route: "/conversion/queue",
    title: "Fila de Bancos para Conversão",
    subtitle: "Gestão de Extrações e Cargas",
    moduleName: "Conversão",
    icon: Database,
    description:
      "Painel de controle de arquivos de banco de dados enviados pelos cartórios para conversão e carga.",
    keyFeatures: [
      "Status do banco (Recebido, Em Análise, Convertido, Homologado)",
      "Vincular banco ao projeto de implantação",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Acompanhe o Status",
        description: "Verifique a etapa de processamento do banco do cartório.",
        icon: Database,
      },
    ],
  },
  {
    route: "/assistentes/conhecimento",
    title: "Base de Conhecimento (RAG)",
    subtitle: "Documentos para Inteligência Artificial",
    moduleName: "Assistentes IA",
    icon: BookOpen,
    description:
      "Gerenciamento de arquivos, manuais e PDFs indexados no repositório de conhecimento para alimentarem as respostas do Copiloto.",
    keyFeatures: [
      "Upload e indexação de documentos",
      "Verificação de embeddings e chunks",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Faça Upload de Manual",
        description:
          "Envie um novo PDF ou documento para ser processado pela IA.",
        icon: BookOpen,
      },
    ],
  },
  {
    route: "/assistentes/logs",
    title: "Logs de Execução de IA",
    subtitle: "Auditoria do Copiloto",
    moduleName: "Assistentes IA",
    icon: Activity,
    description:
      "Histórico de consultas enviadas ao assistente virtual, tempo de resposta, modelo utilizado (Codex / Ollama) e índice de satisfação.",
    keyFeatures: [
      "Log detalhado de prompts e respostas",
      "Métricas de performance e tempo de execução",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Audite Consultas",
        description: "Inspecione o prompt enviado e a resposta gerada.",
        icon: Activity,
      },
    ],
  },
  {
    route: "/admin/roles",
    title: "Matriz de Permissões (RBAC)",
    subtitle: "Controle de Acesso por Perfil",
    moduleName: "Administração",
    icon: Shield,
    description:
      "Configuração fina de permissões de acesso por perfil (Admin, Gestor, Analista, Usuário). Controla o que cada grupo pode visualizar ou editar.",
    keyFeatures: [
      "Tabela com permissões por recurso e ação",
      "Sincronização imediata com RLS no Supabase",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Selecione o Perfil",
        description: "Escolha a função (role) que deseja ajustar.",
        icon: Shield,
      },
      {
        stepNumber: 2,
        title: "Marque os Checkboxes",
        description:
          "Conceda ou revogue os acessos desejados e clique em Salvar.",
        icon: CheckCircle2,
      },
    ],
  },
  {
    route: "/admin",
    title: "Painel de Administração",
    subtitle: "Configurações Globais do Sistema",
    moduleName: "Administração",
    icon: Cog,
    description:
      "Área restrita a Administradores para gestão de usuários, perfis de acesso (RBAC), matriz de permissões e logs de auditoria do sistema.",
    keyFeatures: [
      "Gerenciamento de Usuários e Atribuições",
      "Matriz de Permissões por Função (/admin/roles)",
      "Logs de Acesso e Auditoria de Segurança",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Gerencie Perfis (Roles)",
        description:
          "Acesse a matriz de permissões para definir quem pode visualizar ou editar cada módulo.",
        icon: Shield,
      },
      {
        stepNumber: 2,
        title: "Cadastre Usuários",
        description:
          "Adicione novos membros da equipe e atribua as respectivas permissões.",
        icon: Users,
      },
    ],
    tips: [
      {
        title: "Segurança de Acesso",
        description:
          "Qualquer alteração na matriz de permissões afeta imediatamente o menu e o RLS no Supabase.",
        variant: "warning",
      },
    ],
  },
];

/**
 * Localiza as informações de ajuda adequadas para a rota atual (com fallback inteligente).
 */
export function getPageHelp(pathname: string): PageHelpInfo {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";

  // 1. Busca exata
  const exactMatch = pageHelpData.find((item) => item.route === normalizedPath);
  if (exactMatch) return exactMatch;

  // 2. Busca por prefixo (ex: /projects/123 -> /projects)
  const sortedMatches = [...pageHelpData]
    .filter(
      (item) => item.route !== "/" && normalizedPath.startsWith(item.route),
    )
    .sort((a, b) => b.route.length - a.route.length);

  if (sortedMatches.length > 0) {
    return sortedMatches[0];
  }

  // 3. Fallback genérico para rotas não mapeadas
  return {
    route: normalizedPath,
    title: "Central de Ajuda Siplan HUB",
    subtitle: `Página atual: ${normalizedPath}`,
    moduleName: "Siplan HUB",
    icon: HelpCircle,
    description:
      "Você está navegando em uma área do Siplan HUB. Esta tela foi desenvolvida para apoiar a gestão e operação de implantação de cartórios.",
    keyFeatures: [
      "Navegação integrada pelo menu lateral",
      "Acesso seguro por permissões de usuário",
      "Integração em tempo real com o banco de dados",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Navegação",
        description:
          "Utilize os controles superiores e o menu lateral para alternar entre as ferramentas.",
        icon: LayoutGrid,
      },
      {
        stepNumber: 2,
        title: "Dúvidas ou Suporte",
        description:
          "Caso necessite de auxílio nesta tela, entre em contato com a equipe de TI/Administração.",
        icon: LifeBuoy,
      },
    ],
    tips: [
      {
        title: "Informação do Sistema",
        description:
          "Esta página possui controles dinâmicos de acordo com seu perfil de acesso.",
        variant: "info",
      },
    ],
  };
}
