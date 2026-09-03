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
  Cpu,
  Server,
  Star,
  LucideIcon,
  Home,
  Sliders,
  Terminal,
  Activity,
  LifeBuoy,
  MapPin,
  Settings2,
  FolderClosed,
  FileCheck,
  UserX,
  GitCompare,
  Key,
  Filter,
  Plus,
  Search,
  MessageSquare,
  CheckSquare,
  Send,
  Lock,
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
  // ---------------------------------------------------------------------------
  // HOME / GENERAL
  // ---------------------------------------------------------------------------
  {
    route: "/",
    title: "Central de Navegação Siplan HUB",
    subtitle: "Página Inicial",
    moduleName: "Siplan HUB",
    icon: Home,
    description:
      "Página inicial e central de navegação do Siplan HUB. Reúne atalhos dinâmicos para todos os módulos e funcionalidades do sistema liberados para o seu perfil de acesso.",
    keyFeatures: [
      "Busca rápida por nome de tela, funcionalidade ou módulo",
      "Cards interativos com descrição e status dos módulos ativos",
      "Navegação com restrição por permissão de usuário (RBAC)",
      "Acesso direto para instalação de PWA e central de avisos",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Pesquise uma funcionalidade",
        description:
          "Utilize a barra de pesquisa 'Encontrar tela...' no topo da página para localizar rapidamente qualquer ferramenta.",
        icon: Sparkles,
      },
      {
        stepNumber: 2,
        title: "Selecione o Módulo",
        description:
          "Clique sobre o card do módulo (ex: Implantação, CS/CX, Comercial, SD) para abrir sua central dedicada.",
        icon: LayoutGrid,
      },
      {
        stepNumber: 3,
        title: "Verifique Notificações",
        description:
          "Acompanhe alertas do sistema e avisos importantes pelo menu superior.",
        icon: CheckCircle2,
      },
    ],
    tips: [
      {
        title: "Recolher Menu Lateral",
        description:
          "Você pode expandir ou recolher o menu lateral a qualquer momento pelo botão de alternância.",
        variant: "tip",
      },
      {
        title: "Acesso a Módulos Restritos",
        description:
          "Se um módulo não estiver visível, solicite permissão ao Administrador em /admin/roles.",
        variant: "info",
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // DASHBOARD
  // ---------------------------------------------------------------------------
  {
    route: "/dashboard",
    title: "Central do Dashboard",
    subtitle: "Indicadores e Visão Geral",
    moduleName: "Dashboard",
    icon: LayoutGrid,
    description:
      "Central de inteligência operacional do sistema. Agrupa métricas de saúde dos projetos de implantação, quadro Kanban visual, panoramas de pós-implantação e consultas de chamados 0800.",
    keyFeatures: [
      "Indicadores consolidados de progresso em tempo real",
      "Acompanhamento do ciclo de vida dos cartórios em implantação",
      "Monitoramento de chamados de pós-implantação por produto e reincidência",
      "Navegação direta para relatórios especializados",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Explore os Atalhos do Módulo",
        description:
          "Utilize os cards principais para acessar Indicadores, Quadro Kanban e Panorama Pós-Implantação.",
        icon: LayoutGrid,
      },
      {
        stepNumber: 2,
        title: "Analise a Performance",
        description:
          "Acesse 'Dashboard Indicadores' para conferir gráficos por produto, estado e volume.",
        icon: BarChart3,
      },
      {
        stepNumber: 3,
        title: "Monitore o Funil Kanban",
        description:
          "Acesse o Quadro Kanban para acompanhar a evolução das fases dos cartórios.",
        icon: LayoutDashboard,
      },
    ],
    tips: [
      {
        title: "Dados em Tempo Real",
        description:
          "Todas as métricas são atualizadas automaticamente em sincronia com o PostgreSQL/Supabase.",
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
    subtitle: "Indicadores Globais de Implantação",
    moduleName: "Dashboard",
    icon: BarChart3,
    description:
      "Painel de inteligência gerencial que exibe a distribuição de cartórios por Health Score, sistemas contratados, taxa de cumprimento de prazos e volumes de entregas.",
    keyFeatures: [
      "Distribuição de Health Score (Excelente, Atenção, Crítico)",
      "Métricas comparativas por produto (Siplan, Control-M, OrionTN)",
      "Filtros dinâmicos por período, estado e analista responsável",
      "Gráficos interativos com detalhamento ao passar o cursor",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Filtre os Dados",
        description:
          "Selecione o período ou gestor nos filtros no topo para refinar as estatísticas.",
        icon: Sliders,
      },
      {
        stepNumber: 2,
        title: "Interaja com os Gráficos",
        description:
          "Passe o cursor ou toque nos elementos do gráfico para visualizar contagens exatas.",
        icon: BarChart3,
      },
    ],
  },
  {
    route: "/dashboard/kanban",
    title: "Quadro Kanban de Projetos",
    subtitle: "Fluxo de Trabalho Visual de Implantação",
    moduleName: "Dashboard",
    icon: LayoutDashboard,
    description:
      "Visão visual em colunas das etapas de implantação dos cartórios. Permite acompanhar o avanço desde a Reunião Inicial até a Validação Pós-Go Live.",
    keyFeatures: [
      "Cards com nome da serventia, sistema, analista e progresso",
      "Destaque de alertas de atraso e Health Score em cada card",
      "Filtro rápido de pesquisa por texto e seletores por status",
      "Acesso direto à edição do projeto clicando sobre o card",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Visualize as Colunas",
        description:
          "Identifique em qual estágio o cartório se encontra nas colunas do funil.",
        icon: LayoutDashboard,
      },
      {
        stepNumber: 2,
        title: "Abra o Projeto",
        description:
          "Clique sobre o card de qualquer cartório para abrir o modal de detalhes e formulários.",
        icon: FileText,
      },
    ],
  },
  {
    route: "/dashboard/pos-implantacao",
    title: "Panorama Pós-Implantação",
    subtitle: "Monitoramento de Chamados 0800 Ativos",
    moduleName: "Dashboard",
    icon: Headset,
    description:
      "Painel focado no acompanhamento de chamados 0800 abertos durante a fase crítica de pós-implantação. Permite identificar gargalos de treinamento, dúvidas recorrentes e temas críticos.",
    keyFeatures: [
      "Filtros por produto, reincidência de tema e cartório",
      "Ranking dos temas com maior volume de chamados",
      "Indicadores de cartórios sob acompanhamento intensivo",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Filtre por Produto",
        description:
          "Selecione o produto no filtro superior para analisar apenas os chamados daquela família.",
        icon: Sliders,
      },
      {
        stepNumber: 2,
        title: "Analise Reincidências",
        description:
          "Verifique os temas mais chamados no 0800 para direcionar reforço de treinamento no cartório.",
        icon: AlertCircle,
      },
    ],
  },
  {
    route: "/dashboard/pos-panorama-geral",
    title: "Panorama Geral de Pós",
    subtitle: "Histórico Consolidado de Atendimentos",
    moduleName: "Dashboard",
    icon: History,
    description:
      "Visão histórica completa abrangendo chamados de pós-implantação ativos e encerrados. Permite realizar auditorias, analisar tempo médio de resolução e evolução do suporte.",
    keyFeatures: [
      "Visão consolidada do histórico de pós-implantação",
      "Métricas de tempo de resposta e taxa de encerramento",
      "Pesquisa por serventia cartorária ou período",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Consulte o Histórico",
        description:
          "Utilize o filtro por período para acompanhar a curva de encerramento de chamados pós-virada.",
        icon: History,
      },
    ],
  },
  {
    route: "/deployments/tickets",
    title: "Consultar Chamados 0800",
    subtitle: "Busca de Atendimentos de Suporte",
    moduleName: "Dashboard",
    icon: ClipboardList,
    description:
      "Ferramenta de pesquisa detalhada para localizar tickets de atendimento 0800 por número de protocolo, nome do cliente, sistema ou intervalo de datas.",
    keyFeatures: [
      "Busca textual instantânea por cliente, protocolo ou resumo",
      "Filtros por status, produto e período",
      "Exportação da listagem de chamados encontrados",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Digite o Parâmetro de Busca",
        description:
          "Informe o nome do cartório ou número do chamado na barra de pesquisa.",
        icon: Search,
      },
      {
        stepNumber: 2,
        title: "Exporte a Lista",
        description:
          "Clique no botão de exportação se precisar gerar um relatório dos chamados listados.",
        icon: FileText,
      },
    ],
  },
  {
    route: "/deployments/tickets-legacy",
    title: "Chamados Legados (Ellevo)",
    subtitle: "Consulta Histórica de Atendimentos Anteriores",
    moduleName: "Dashboard",
    icon: History,
    description:
      "Consulta ao acervo histórico de chamados da plataforma Ellevo abrangendo as famílias de produtos Control-M, Global e Siplan Legado.",
    keyFeatures: [
      "Pesquisa no banco legado por contrato, cartório ou protocolo Ellevo",
      "Filtro por família de sistema legado",
      "Visualização das descrições e soluções aplicadas na época",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Pesquise por Protocolo Legado",
        description:
          "Digite o código Ellevo ou razão social para resgatar o histórico antigo do cliente.",
        icon: Search,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // IMPLANTAÇÃO
  // ---------------------------------------------------------------------------
  {
    route: "/implantacao",
    title: "Central de Implantação",
    subtitle: "Gestão de Projetos e Cronogramas",
    moduleName: "Implantação",
    icon: Layers,
    description:
      "Central de orquestração de projetos de implantação de software para cartórios. Agrupa a gestão da carteira de projetos ativos, emissão de relatórios e controle de lançamentos.",
    keyFeatures: [
      "Gestão centralizada de projetos de implantação V2",
      "Relatórios de progresso, prazos e entregáveis",
      "Planejamento de próximas instalações e histórico de Go-Live",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Acesse a Gestão de Projetos",
        description:
          "Clique em 'Gerenciar Projetos' para abrir a listagem completa e operar os formulários dos estágios.",
        icon: FolderKanban,
      },
      {
        stepNumber: 2,
        title: "Consulte Próximos Lançamentos",
        description:
          "Acompanhe em 'Próximas Implantações' a agenda de Go-Live dos cartórios.",
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
    title: "Gerenciamento de Projetos V2",
    subtitle: "Carteira e Acompanhamento de Implantações",
    moduleName: "Implantação",
    icon: FolderKanban,
    description:
      "Tela operacional central da Implantação. Permite filtrar todos os cartórios cadastrados, monitorar Health Score, criar novos projetos e atualizar os formulários dos estágios V2.",
    keyFeatures: [
      "Filtros avançados por status, Health Score, sistema e analista",
      "Barra de pesquisa rápida com busca por serventia e CNS",
      "Modal de detalhes com abas organizadas por Estágios, Notas e Histórico",
      "Recurso de Autosave automático com salvamento contínuo em segundo plano",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Localize a Serventia",
        description:
          "Digite o nome do cartório ou CNS na barra de busca ou filtre por status.",
        icon: Search,
      },
      {
        stepNumber: 2,
        title: "Abra os Formulários do Projeto",
        description:
          "Clique na linha do projeto para abrir a janela de detalhes e navegar pelas abas dos estágios.",
        icon: FileEdit,
      },
      {
        stepNumber: 3,
        title: "Preencha as Etapas",
        description:
          "Atualize as datas, checklists e observações. As alterações são salvas automaticamente pelo Autosave.",
        icon: CheckCircle2,
      },
    ],
    tips: [
      {
        title: "Salvamento Automático (Autosave)",
        description:
          "As edições nos formulários de estágios são gravadas automaticamente no banco de dados.",
        variant: "tip",
      },
      {
        title: "Novo Cartório",
        description:
          "Utilize o botão '+ Novo Projeto' no canto superior direito para cadastrar uma nova implantação.",
        variant: "info",
      },
    ],
  },
  {
    route: "/reports",
    title: "Relatórios de Implantação",
    subtitle: "Análise de Desempenho e Entregas",
    moduleName: "Implantação",
    icon: BarChart3,
    description:
      "Central de relatórios operacionais e gerenciais da área de implantação. Oferece visões sobre tempo médio por estágio, desvios de cronograma e entregabilidade da equipe.",
    keyFeatures: [
      "Relatórios de desvios e cumprimento de prazos",
      "Filtros por intervalo de datas, produto e analista",
      "Exportação para formatos de impressão e planilha",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Defina os Parâmetros",
        description:
          "Ajuste os filtros de período e responsável no cabeçalho do relatório.",
        icon: Sliders,
      },
      {
        stepNumber: 2,
        title: "Exporte as Informações",
        description:
          "Utilize o botão de exportar para emitir cópias executivas em PDF ou CSV.",
        icon: FileText,
      },
    ],
  },
  {
    route: "/deployments",
    title: "Próximas Implantações",
    subtitle: "Cronograma de Viradas Agendadas",
    moduleName: "Implantação",
    icon: Rocket,
    description:
      "Calendário de previsões para os próximos lançamentos (Go-Live) de sistemas nos cartórios. Auxilia no planejamento de infraestrutura, suporte prévio e alocação de analistas.",
    keyFeatures: [
      "Visão cronológica dos Go-Lives previstos para os próximos 30/60/90 dias",
      "Detalhamento dos requisitos pendentes de cada cartório antes do lançamento",
      "Previsão de capacidade operacional da equipe",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Analise a Fila de Lançamento",
        description:
          "Examine a lista de cartórios agendados para a virada nos próximos dias.",
        icon: Rocket,
      },
      {
        stepNumber: 2,
        title: "Valide Pré-Requisitos",
        description:
          "Certifique-se de que a aderência e a conversão do cartório estão concluídas.",
        icon: CheckCircle2,
      },
    ],
  },
  {
    route: "/deployments/latest",
    title: "Últimas Implantações",
    subtitle: "Histórico de Instalações Concluídas",
    moduleName: "Implantação",
    icon: History,
    description:
      "Registro histórico de cartórios que concluíram recentemente o processo de implantação e entraram na fase de pós-implantação / 0800.",
    keyFeatures: [
      "Lista de serventias com Go-Live realizado com sucesso",
      "Data de encerramento e responsável pela implantação",
      "Atalho direto para o acompanhamento pós-virada do cliente",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Consulte o Histórico",
        description:
          "Filtre por mês ou ano para verificar cartórios implantados recentemente.",
        icon: History,
      },
    ],
  },
  {
    route: "/compare",
    title: "Comparador de Projetos",
    subtitle: "Análise Lado a Lado de Implantações",
    moduleName: "Implantação",
    icon: GitCompare,
    description:
      "Ferramenta de comparação simultânea entre múltiplos projetos de implantação. Permite avaliar o avanço de estágios, Health Score e prazos de cartórios em paralelo.",
    keyFeatures: [
      "Seleção de 2 ou mais projetos para comparação em grade",
      "Mapeamento visual de gargalos em etapas específicas",
      "Destaque de desvios em relação ao cronograma modelo",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Selecione os Projetos",
        description:
          "Escolha os cartórios que deseja comparar no seletor de projetos.",
        icon: Plus,
      },
      {
        stepNumber: 2,
        title: "Compare o Progresso",
        description:
          "Análise a matriz comparativa para identificar quais estágios apresentam atraso.",
        icon: GitCompare,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // CALENDÁRIO
  // ---------------------------------------------------------------------------
  {
    route: "/calendario",
    title: "Central do Calendário",
    subtitle: "Visão Cronológica Integrada",
    moduleName: "Calendário",
    icon: Calendar,
    description:
      "Central de agendamentos e visualização temporal. Concentra datas de treinamentos, alinhamentos técnicos, viagens de implantadores e disponibilidade da equipe.",
    keyFeatures: [
      "Calendário visual de eventos de projetos",
      "Agenda de alocação dos analistas de campo e remotos",
      "Filtros por analista, cartório e tipo de agendamento",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Escolha a Visualização",
        description:
          "Navegue entre o 'Calendário de Projetos' e a 'Agenda dos Analistas'.",
        icon: Calendar,
      },
      {
        stepNumber: 2,
        title: "Verifique Compromissos",
        description:
          "Clique sobre qualquer compromisso no calendário para visualizar detalhes do agendamento.",
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
    subtitle: "Marcos e Agendamentos de Implantação",
    moduleName: "Calendário",
    icon: Calendar,
    description:
      "Visão em linha do tempo de todos os eventos de implantação nos cartórios (Treinamento, Virada de Chave, Alinhamento Técnico, Validação).",
    keyFeatures: [
      "Visualização por Mês, Semana e Dia",
      "Código de cores por tipo de evento e nível de prioridade",
      "Criação rápida de novos compromissos vinculados a projetos",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Filtre os Eventos",
        description:
          "Selecione o projeto desejado nos filtros superiores para destacar seus marcos.",
        icon: Sliders,
      },
      {
        stepNumber: 2,
        title: "Agende um Compromisso",
        description:
          "Clique no botão '+ Novo Agendamento' ou diretamente sobre um dia no calendário.",
        icon: Plus,
      },
    ],
  },
  {
    route: "/agenda-analistas",
    title: "Agenda dos Analistas",
    subtitle: "Alocações da Equipe de Implantação",
    moduleName: "Calendário",
    icon: Users,
    description:
      "Grade de ocupação e disponibilidade da equipe de analistas. Permite planejar viagens, atendimentos remotos e evitar sobreposição de agendas.",
    keyFeatures: [
      "Grid de ocupação por analista e período",
      "Identificação de dias disponíveis e bloqueados para viagem",
      "Visualização de horas alocadas por profissional",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Selecione o Analista",
        description:
          "Escolha o membro da equipe para checar a disponibilidade e compromissos.",
        icon: Users,
      },
      {
        stepNumber: 2,
        title: "Aloque Novo Treinamento",
        description:
          "Verifique os horários vagos antes de agendar uma nova sessão no cartório.",
        icon: Clock3,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // COMERCIAL
  // ---------------------------------------------------------------------------
  {
    route: "/commercial",
    title: "Central Comercial (CRM)",
    subtitle: "Gestão de Clientes e Propostas",
    moduleName: "Comercial",
    icon: Briefcase,
    description:
      "Central de relacionamento com clientes, acompanhamento de contratos, gestão de impeditivos comerciais e controle de checklists de pré-venda.",
    keyFeatures: [
      "Painel 360º de Clientes Cartórios",
      "Gestão de Bloqueios Comerciais e Financeiros",
      "Histórico de Contatos e Interações",
      "Acompanhamento dos Checklists Comerciais",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Consulte o Painel de Clientes",
        description:
          "Acesse a lista de serventias para visualizar o perfil cadastral e contratos.",
        icon: Building2,
      },
      {
        stepNumber: 2,
        title: "Verifique Bloqueios",
        description:
          "Monitore impeditivos financeiros ou documentais que possam impactar o início da implantação.",
        icon: AlertCircle,
      },
    ],
    quickLinks: [
      { label: "Painel de Clientes", path: "/commercial/customers" },
      { label: "Bloqueios", path: "/commercial/blockers" },
      { label: "Contatos", path: "/commercial/contacts" },
      { label: "Checklists", path: "/commercial/checklists" },
    ],
  },
  {
    route: "/commercial/customers",
    title: "Painel de Clientes Cartórios",
    subtitle: "Visão 360º de Carteira de Clientes",
    moduleName: "Comercial",
    icon: Building2,
    description:
      "Lista detalhada de todos os cartórios clientes da empresa, contendo dados cadastrais, sistemas contratados, titulares e histórico comercial.",
    keyFeatures: [
      "Busca rápida por Razão Social, Titular, Município ou CNS",
      "Filtro de clientes por estado, tipo de cartório e status contratual",
      "Atalho direto para a Visão 360º e Linha do Tempo do Cliente",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Pesquise a Serventia",
        description: "Digite a razão social ou código CNS no campo de busca.",
        icon: Search,
      },
      {
        stepNumber: 2,
        title: "Abra o Perfil do Cliente",
        description:
          "Clique sobre o nome do cartório para acessar a ficha completa e seu histórico.",
        icon: Building2,
      },
    ],
  },
  {
    route: "/commercial/client",
    title: "Visão 360º do Cliente Cartório",
    subtitle: "Perfil Detalhado da Serventia",
    moduleName: "Comercial",
    icon: Building2,
    description:
      "Ficha completa do cartório selecionado. Reúne dados cadastrais, contatos do tabelião e escreventes, contratos vigentes, módulos ativos e vínculo com projetos de implantação.",
    keyFeatures: [
      "Resumo cadastral completo com CNPJ, CNS e endereço",
      "Listagem de contatos e cargos dentro da serventia",
      "Status dos projetos de implantação e chamados vinculados",
      "Linha do tempo de interações comerciais",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Navegue pelas Abas",
        description:
          "Alterne entre Visão Geral, Contatos, Contratos e Linha do Tempo.",
        icon: LayoutGrid,
      },
      {
        stepNumber: 2,
        title: "Atualize Informações",
        description:
          "Utilize o botão de edição para manter contatos e telefones atualizados.",
        icon: FileEdit,
      },
    ],
  },
  {
    route: "/commercial/blockers",
    title: "Bloqueios Comerciais",
    subtitle: "Gestão de Impeditivos e Pendências",
    moduleName: "Comercial",
    icon: AlertCircle,
    description:
      "Acompanhamento de pendências financeiras, pendências contratuais ou falta de insumos que bloqueiam a continuidade da implantação do cartório.",
    keyFeatures: [
      "Lista de bloqueios classificados por prioridade e impacto",
      "Registro de tratativas e histórico de negociações",
      "Notificação de liberação quando o bloqueio for resolvido",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Identifique Impeditivos",
        description:
          "Filtre os bloqueios com prioridade 'Alta' para resolver itens críticos.",
        icon: AlertCircle,
      },
      {
        stepNumber: 2,
        title: "Atualize a Tratativa",
        description:
          "Registre os acordos comerciais realizados e encerre o bloqueio quando regularizado.",
        icon: CheckCircle2,
      },
    ],
  },
  {
    route: "/commercial/contacts",
    title: "Histórico de Contatos",
    subtitle: "Registro de Interações Comerciais",
    moduleName: "Comercial",
    icon: Contact,
    description:
      "Registro centralizado de todas as interações comerciais realizadas com os cartórios (reuniões, chamadas telefônicas, propostas enviadas e e-mails).",
    keyFeatures: [
      "Histórico cronológico de conversas por serventia",
      "Formulário de cadastro de nova interação comercial",
      "Categorização por motivo do contato e resultado da conversa",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Registre Nova Interação",
        description:
          "Clique em '+ Novo Contato' para registrar o resumo da reunião ou chamada.",
        icon: Plus,
      },
      {
        stepNumber: 2,
        title: "Consulte Históricos Antigos",
        description:
          "Pesquise o nome do cartório para ler todas as notas deixadas pela equipe comercial.",
        icon: History,
      },
    ],
  },
  {
    route: "/commercial/checklists",
    title: "Checklist do Cliente",
    subtitle: "Acompanhamento de Pré-Requisitos",
    moduleName: "Comercial",
    icon: ListChecks,
    description:
      "Monitoramento dos pré-requisitos enviados e preenchidos pelo cliente (infraestrutura de servidores, links de internet, liberação de portas e dados cadastrais) antes do início da implantação.",
    keyFeatures: [
      "Status de preenchimento do formulário inicial pelo cartório",
      "Porcentagem de conclusão dos requisitos mínimos",
      "Visualização das respostas enviadas pelo tabelião/escrevente",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Verifique o Progresso",
        description:
          "Confira o percentual de preenchimento do checklist do cartório.",
        icon: ListChecks,
      },
      {
        stepNumber: 2,
        title: "Valide as Respostas",
        description:
          "Acesse as respostas para garantir que a infraestrutura atende aos requisitos mínimos.",
        icon: CheckCircle2,
      },
    ],
  },
  {
    route: "/commercial/checklists/questions",
    title: "Editor de Perguntas do Checklist",
    subtitle: "Configuração dos Questionários Comerciais",
    moduleName: "Comercial",
    icon: Settings2,
    description:
      "Ambiente de administração dos formulários de pré-requisitos comerciais. Permite adicionar, editar ou reordenar perguntas exibidas para os clientes.",
    keyFeatures: [
      "Cadastro de tópicos e perguntas por categoria (Infraestrutura, Hardware, Software)",
      "Definição de respostas obrigatórias e tipos de campos",
      "Reordenação drag & drop de tópicos",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Adicione uma Pergunta",
        description:
          "Clique no botão para incluir um novo item de pré-requisito no formulário.",
        icon: Plus,
      },
      {
        stepNumber: 2,
        title: "Salve a Estrutura",
        description:
          "Clique em Salvar para atualizar o questionário público enviado aos cartórios.",
        icon: CheckCircle2,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // CONVERSÃO
  // ---------------------------------------------------------------------------
  {
    route: "/conversion",
    title: "Central de Conversão de Dados",
    subtitle: "Engenharia e Migração de Bancos Legados",
    moduleName: "Conversão",
    icon: Database,
    description:
      "Central de engenharia de dados responsável pela extração, tratamento, conversão e carga de acervos de bancos legados para a estrutura Siplan.",
    keyFeatures: [
      "Fila de processamento de backups e bancos de dados",
      "Gestão de atividades e tarefas de conversão",
      "Configuração de motores e scripts de migração",
      "Relatórios de batimento de totais e homologação",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Acompanhe a Fila",
        description:
          "Navegue pela fila de bancos para acompanhar as fases de extração e carga.",
        icon: Database,
      },
      {
        stepNumber: 2,
        title: "Configure Motores",
        description:
          "Acesse a aba 'Motores' para ajustar scripts de de-para específicos por sistema de origem.",
        icon: Cog,
      },
    ],
    quickLinks: [
      { label: "Gestão de Atividades", path: "/conversion/atividades" },
      { label: "Motores & Scripts", path: "/conversion/engines" },
      { label: "Fila de Bancos", path: "/conversion/queue" },
    ],
  },
  {
    route: "/conversion/atividades",
    title: "Gestão de Atividades de Conversão",
    subtitle: "Controle de Tarefas e Etapas de Migração",
    moduleName: "Conversão",
    icon: ListChecks,
    description:
      "Painel de controle de tarefas de conversão divididas por cartório. Permite aos analistas de dados registrar avanços na leitura de registros, mapas de de-para e cargas de teste.",
    keyFeatures: [
      "Quadro de tarefas de conversão por fase (Recebimento, Leitura, De-Para, Carga, Validação)",
      "Registro de horas técnicas aplicadas em cada banco de dados",
      "Atribuição de responsabilidade por analista de conversão",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Selecione a Tarefa",
        description: "Localize o cartório e a etapa da migração a ser executada.",
        icon: Search,
      },
      {
        stepNumber: 2,
        title: "Atualize o Status",
        description:
          "Marque a atividade como concluída e insira observações técnicas sobre o banco.",
        icon: CheckCircle2,
      },
    ],
  },
  {
    route: "/conversion/engines",
    title: "Motores e Scripts de Conversão",
    subtitle: "Regras de De-Para e Transformação",
    moduleName: "Conversão",
    icon: Cog,
    description:
      "Biblioteca de scripts SQL/Python e motores de migração estruturados por software de origem (ex: de-para de tabelas de livros, atos, cadastros e financeiros).",
    keyFeatures: [
      "Cadastro de motores por fornecedor legado",
      "Mapeamento flexível de tabelas e campos correspondentes",
      "Histórico de revisões dos scripts de migração",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Escolha o Sistema de Origem",
        description: "Selecione o fornecedor do sistema legado do cartório.",
        icon: Cog,
      },
      {
        stepNumber: 2,
        title: "Edite as Regras de De-Para",
        description:
          "Ajuste os relacionamentos de colunas para garantir a integridade da carga.",
        icon: FileEdit,
      },
    ],
  },
  {
    route: "/conversion/queue",
    title: "Fila de Bancos de Dados",
    subtitle: "Status de Recebimento e Processamento",
    moduleName: "Conversão",
    icon: Database,
    description:
      "Fila em tempo real dos backups recebidos dos cartórios. Acompanhe a restauração, auditoria de integridade, testes de carga e liberação para homologação.",
    keyFeatures: [
      "Status do banco (Recebido, Em Análise, Convertido, Em Homologação, Aprovado)",
      "Registro de tamanho do acervo e contagem total de atos",
      "Vínculo direto com a ficha do projeto de implantação",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Confira o Status do Banco",
        description:
          "Verifique em qual fase do pipeline o backup do cartório se encontra.",
        icon: Database,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // SD (SOLUTIONS & DELIVERY)
  // ---------------------------------------------------------------------------
  {
    route: "/sd",
    title: "Central SD (Suporte Especializado)",
    subtitle: "Soluções Técnicas e Apontamentos",
    moduleName: "SD",
    icon: LifeBuoy,
    description:
      "Central de atendimento técnico avançado e gerenciamento das demandas da equipe de SD (Solution Delivery). Controla a base de conhecimento de soluções e apontamento de horas.",
    keyFeatures: [
      "Base de conhecimento de soluções conhecidas e correções",
      "Gerenciamento e registro diário de horas trabalhadas",
      "Relatórios de consolidação de atendimento por cliente",
      "Dashboard analítico de performance e tipos de demanda (BI)",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Pesquise uma Solução",
        description:
          "Acesse 'Soluções' para resgatar passos de resolução de chamados conhecidos.",
        icon: BookOpen,
      },
      {
        stepNumber: 2,
        title: "Lance suas Horas",
        description:
          "Utilize 'Gerenciamento de Horas' para contabilizar os atendimentos do dia.",
        icon: Clock3,
      },
    ],
    quickLinks: [
      { label: "Soluções Técnicas", path: "/sd/solucoes" },
      { label: "Gerenciamento de Horas", path: "/sd/horas" },
      { label: "Consulta de Horas", path: "/sd/consulta-horas" },
      { label: "BI de Atendimento", path: "/sd/bi-atendimento" },
    ],
  },
  {
    route: "/sd/solucoes",
    title: "Base de Soluções Técnicas SD",
    subtitle: "Repositório de Artigos e Procedimentos",
    moduleName: "SD",
    icon: BookOpen,
    description:
      "Repositório de artigos técnicos, procedimentos de correção de dados, scripts de diagnóstico e soluções recomendadas para problemas operacionais recorrentes.",
    keyFeatures: [
      "Busca textual inteligente por palavras-chave, erros ou módulo",
      "Cadastro de novos artigos técnicos com formatação rica",
      "Classificação por produto, tags e nível de complexidade",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Busque pelo Código do Erro",
        description: "Digite a mensagem de erro ou síntese do chamado na busca.",
        icon: Search,
      },
      {
        stepNumber: 2,
        title: "Cadastre uma Nova Solução",
        description:
          "Ajude a equipe documentando a resolução de problemas inéditos.",
        icon: Plus,
      },
    ],
  },
  {
    route: "/sd/horas",
    title: "Apontamento Diário de Horas SD",
    subtitle: "Registro de Atividades Técnicas",
    moduleName: "SD",
    icon: Clock3,
    description:
      "Formulário individual para o analista registrar as horas trabalhadas em cada atendimento, projeto ou chamado técnico ao longo do dia.",
    keyFeatures: [
      "Lançamento por data, cartório, ticket e categoria de serviço",
      "Resumo das horas acumuladas no dia e na semana",
      "Edição rápida de lançamentos do dia atual",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Informe o Cliente e Atividade",
        description:
          "Selecione a serventia e descreva a atividade executada.",
        icon: FileText,
      },
      {
        stepNumber: 2,
        title: "Defina o Tempo Utilizado",
        description: "Preencha o horário de início e fim ou a duração total.",
        icon: Clock3,
      },
    ],
  },
  {
    route: "/sd/consulta-horas",
    title: "Consulta de Horas Lançadas",
    subtitle: "Relatório Gerencial de Apontamentos",
    moduleName: "SD",
    icon: BarChart3,
    description:
      "Painel gerencial para visualização e auditoria das horas lançadas pela equipe de SD. Permite filtrar apontamentos por colaborador, cartório e período.",
    keyFeatures: [
      "Totalização de horas por projeto e por analista",
      "Filtro por período semanal, mensal ou personalizado",
      "Exportação dos dados para conferência ou faturamento",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Selecione o Colaborador ou Período",
        description: "Ajuste os filtros superiores para refinar o relatório.",
        icon: Sliders,
      },
    ],
  },
  {
    route: "/sd/bi-atendimento",
    title: "BI de Atendimento SD",
    subtitle: "Analytics e Indicadores de Suporte",
    moduleName: "SD",
    icon: BarChart3,
    description:
      "Dashboard analítico com métricas de performance do time de SD. Exibe volume de demandas por tipo, SLA de resolução, distribuição por produto e produtividade.",
    keyFeatures: [
      "Gráficos de tendência de chamados por mês",
      "Indicadores de cumprimento de SLA",
      "Distribuição de atendimentos por produto Siplan",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Analise os Indicadores de SLA",
        description:
          "Acompanhe o percentual de chamados resolvidos dentro do prazo estipulado.",
        icon: BarChart3,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // MODELOS EDITOR ORIONTN
  // ---------------------------------------------------------------------------
  {
    route: "/orion-tn-models",
    title: "Modelos Editor OrionTN",
    subtitle: "Gerenciador de Templates de Documentos",
    moduleName: "Modelos OrionTN",
    icon: FileText,
    description:
      "Central de gerenciamento de modelos de atos, certidões, minutas e documentos do sistema OrionTN. Permite estruturar e padronizar textos jurídicos com variáveis dinâmicas.",
    keyFeatures: [
      "Dashboard com volume de modelos por atribuição",
      "Biblioteca de templates globais e personalizados por cliente",
      "Editor Rich-Text WYSIWYG com inclusão de tags automatizadas",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Acesse o Editor",
        description:
          "Selecione 'Editor de Modelos' para criar ou ajustar uma minuta.",
        icon: FileEdit,
      },
      {
        stepNumber: 2,
        title: "Gerencie Templates por Cartório",
        description:
          "Navegue em 'Gerenciar Projetos' para ver modelos exclusivos de cada serventia.",
        icon: FolderClosed,
      },
    ],
    quickLinks: [
      { label: "Dashboard", path: "/orion-tn-models/dashboard" },
      { label: "Projetos de Modelos", path: "/orion-tn-models/projects" },
      { label: "Editor de Modelos", path: "/orion-tn-models/editor" },
    ],
  },
  {
    route: "/orion-tn-models/dashboard",
    title: "Dashboard de Modelos OrionTN",
    subtitle: "Métricas e Status da Biblioteca de Minutas",
    moduleName: "Modelos OrionTN",
    icon: BarChart3,
    description:
      "Estatísticas sobre a acervo de modelos OrionTN configurados, quantidade de certidões homologadas e distribuição de modelos por atribuição cartorária (RI, RTD, RCPN, Notas).",
    keyFeatures: [
      "Contagem de modelos por atribuição e tipo de ato",
      "Status de homologação dos modelos junto aos cartórios",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Analise a Distribuição",
        description:
          "Acompanhe a quantidade de modelos ativos por especialidade cartorária.",
        icon: BarChart3,
      },
    ],
  },
  {
    route: "/orion-tn-models/projects",
    title: "Modelos por Projeto de Cartório",
    subtitle: "Templates Personalizados por Serventia",
    moduleName: "Modelos OrionTN",
    icon: FolderClosed,
    description:
      "Organização dos modelos de texto e minutas personalizados para cada cartório durante seu processo de implantação do OrionTN.",
    keyFeatures: [
      "Seleção por cartório cliente",
      "Clonagem de biblioteca padrão para uso no cartório",
      "Aprovação e homologação dos textos pelo tabelião",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Selecione o Cartório",
        description:
          "Escolha o cliente na lista para visualizar seus modelos específicos.",
        icon: Search,
      },
    ],
  },
  {
    route: "/orion-tn-models/editor",
    title: "Editor Interativo de Modelos OrionTN",
    subtitle: "Criador WYSIWYG de Atos e Certidões",
    moduleName: "Modelos OrionTN",
    icon: FileEdit,
    description:
      "Ambiente de edição visual do OrionTN. Permite redigir minutas, aplicar formatação avançada, inserir tabelas e posicionar marcadores dinâmicos (como nome do outorgante, livro, folha e ato).",
    keyFeatures: [
      "Editor WYSIWYG com suporte a rich-text e tabelas",
      "Painel lateral com tags dinâmicas arrastáveis/clicáveis",
      "Pré-visualização do documento com dados simulados",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Insira as Tags Dinâmicas",
        description:
          "Clique sobre as variáveis no painel lateral para inseri-las no texto.",
        icon: Sparkles,
      },
      {
        stepNumber: 2,
        title: "Valide no Preview",
        description:
          "Utilize o botão de pré-visualização para testar a renderização do ato.",
        icon: CheckCircle2,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // IMPLANTADORES
  // ---------------------------------------------------------------------------
  {
    route: "/implantadores",
    title: "Central dos Implantadores",
    subtitle: "Ferramentas do Analista de Campo",
    moduleName: "Implantadores",
    icon: Users,
    description:
      "Central de recursos e formulários operacionais para analistas durante a implantação presencial ou remota. Reúne checklists de aderência, homologação de dados e termos de transição.",
    keyFeatures: [
      "Formulários de verificação de aderência de requisitos",
      "Ferramenta de homologação e conferência de saldos/atos",
      "Guias de treinamento e roteiros de capacitação",
      "Termo de transição (passagem de bastão para o suporte)",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Preencha a Aderência",
        description:
          "Acesse 'Editor de Aderência' para validar os requisitos do cliente.",
        icon: FileEdit,
      },
      {
        stepNumber: 2,
        title: "Execute a Homologação",
        description:
          "Em 'Homologação', colha o aceite do cartório após a carga de dados.",
        icon: ClipboardList,
      },
    ],
    quickLinks: [
      { label: "Editor de Aderência", path: "/implantadores/aderencia" },
      { label: "Aderências Finalizadas", path: "/implantadores/aderencia/finalizadas" },
      { label: "Homologação", path: "/implantadores/homologation" },
      { label: "Treinamento", path: "/implantadores/treinamento" },
      { label: "Transição", path: "/implantadores/transicao" },
    ],
  },
  {
    route: "/implantadores/aderencia",
    title: "Formulário de Aderência de Sistemas",
    subtitle: "Checklist de Requisitos por Módulo",
    moduleName: "Implantadores",
    icon: FileEdit,
    description:
      "Checklist detalhado de verificação de aderência operacional do cartório. Avalia rotinas necessárias (ex: emissão de certidões, selagem eletrônica, livros de notas) antes da virada.",
    keyFeatures: [
      "Checklist por especialidade cartorária",
      "Marcação de itens atendidos, parcialmente atendidos ou pendentes",
      "Cálculo automático do percentual de aderência",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Selecione o Sistema/Atribuição",
        description:
          "Escolha o módulo (ex: Registro de Imóveis, Tabelionato de Notas).",
        icon: Sliders,
      },
      {
        stepNumber: 2,
        title: "Valide Item a Item",
        description:
          "Marque cada quesito conforme o fluxo testado junto ao cliente.",
        icon: CheckCircle2,
      },
    ],
  },
  {
    route: "/implantadores/aderencia/finalizadas",
    title: "Aderências Finalizadas",
    subtitle: "Histórico de Formulários Homologados",
    moduleName: "Implantadores",
    icon: FileCheck,
    description:
      "Consulta e emissão dos formulários de aderência já concluídos e assinados durante a implantação nos cartórios.",
    keyFeatures: [
      "Lista de checklists de aderência aprovados pelo cliente",
      "Geração de relatório em PDF para arquivamento do projeto",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Pesquise por Cartório",
        description: "Localize o projeto para emitir o termo impresso.",
        icon: Search,
      },
    ],
  },
  {
    route: "/implantadores/homologation",
    title: "Homologação de Conversões",
    subtitle: "Validação Conjunta de Dados Convertidos",
    moduleName: "Implantadores",
    icon: ClipboardList,
    description:
      "Tela de conferência e homologação dos dados convertidos junto ao tabelião/escreventes. Permite auditar saldos de caixa, quantitativo de livros e colher aceite formal.",
    keyFeatures: [
      "Checklist de conferência de saldos, atos e pessoas",
      "Registro de inconsistências encontradas para ajuste pela equipe de conversão",
      "Emissão de Termo de Aceite de Carga de Dados",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Confira as Amostras de Atos",
        description:
          "Verifique com a equipe do cartório os registros amostrais convertidos.",
        icon: ClipboardList,
      },
      {
        stepNumber: 2,
        title: "Registre Inconsistências ou Aceite",
        description:
          "Caso haja divergências, liste os ajustes necessários ou conclua a homologação.",
        icon: CheckCircle2,
      },
    ],
  },
  {
    route: "/implantadores/treinamento",
    title: "Roteiro de Treinamento Cartorário",
    subtitle: "Capacitação das Equipes do Cartório",
    moduleName: "Implantadores",
    icon: BookOpen,
    description:
      "Guias e cronogramas de treinamento ministrados durante a implantação. Permite registrar a lista de presença dos escreventes e os módulos ensinados.",
    keyFeatures: [
      "Checklist de tópicos ministrados por cargo (Caixa, Balcão, Escrevente, Tabelião)",
      "Registro de horas de treinamento realizadas",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Marque os Tópicos Ministrados",
        description:
          "Conforme o treinamento for concluído, marque os capítulos aplicados.",
        icon: BookOpen,
      },
    ],
  },
  {
    route: "/implantadores/transicao",
    title: "Documento de Transição para Suporte",
    subtitle: "Passagem de Bastão (Handover)",
    moduleName: "Implantadores",
    icon: FileText,
    description:
      "Formulário formal de conclusão da implantação e transferência do cartório da equipe de implantação para a equipe de Suporte 0800 e CS/CX.",
    keyFeatures: [
      "Checklist final de validação do Go-Live",
      "Observações sobre particularidades do cartório para a equipe de suporte",
      "Formalização do encerramento da implantação",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Preencha as Notas da Transição",
        description:
          "Descreva especificidades do cliente que ajudem o suporte no atendimento 0800.",
        icon: FileText,
      },
      {
        stepNumber: 2,
        title: "Finalize a Passagem",
        description: "Conclua o termo para notificar a equipe de suporte.",
        icon: CheckCircle2,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // CS / CX (CUSTOMER SUCCESS & EXPERIENCE)
  // ---------------------------------------------------------------------------
  {
    route: "/cs-cx",
    title: "Central de Sucesso & Experiência do Cliente (CS/CX)",
    subtitle: "Gestão do Relacionamento e Retenção",
    moduleName: "CS/CX",
    icon: Headset,
    description:
      "Central de acompanhamento da saúde dos cartórios após a implantação. Concentra o atendimento de solicitações, visitas periódicas, saúde do cliente, NPS e acompanhamento de rotinas.",
    keyFeatures: [
      "Dashboard de saúde e engajamento dos cartórios",
      "Central de solicitações e chamados internos de CS/CX",
      "Agendamento de reuniões de acompanhamento (Check-ins)",
      "Gestão de pesquisas de satisfação NPS e planos de ação",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Acompanhe as Solicitações",
        description:
          "Acesse 'Solicitações' para acompanhar demandas operacionais dos cartórios.",
        icon: ClipboardList,
      },
      {
        stepNumber: 2,
        title: "Gerencie Contatos e Reuniões",
        description:
          "Utilize 'Agendamentos' e 'Contatos' para manter a agenda de check-ins atualizada.",
        icon: Calendar,
      },
    ],
    quickLinks: [
      { label: "Solicitações", path: "/cs-cx/registros" },
      { label: "Cartórios", path: "/cs-cx/cartorios" },
      { label: "Contatos", path: "/cs-cx/contatos" },
      { label: "Agendamentos", path: "/cs-cx/agendamentos" },
      { label: "Rotinas", path: "/cs-cx/rotinas" },
      { label: "Visitas", path: "/cs-cx/visitas" },
      { label: "NPS", path: "/cs-cx/nps" },
      { label: "Relatórios", path: "/cs-cx/relatorios" },
      { label: "Administração", path: "/cs-cx/admin" },
    ],
  },
  {
    route: "/cs-cx/registros",
    title: "Central de Solicitações CS/CX",
    subtitle: "Registros Operacionais dos Cartórios",
    moduleName: "CS/CX",
    icon: ClipboardList,
    description:
      "Gerenciamento de chamados e solicitações operacionais de CS/CX enviadas pelos cartórios ou abertas pela equipe interna. Permite controlar o fluxo de atendimento por prioridade, status e visualização Kanban ou Lista.",
    keyFeatures: [
      "Alternância entre visualização por Lista detalhada e Quadro Kanban",
      "Filtros múltiplos por cartório, status (Aguardando, Em Execução, Concluído), responsável e módulo",
      "Formulário para abertura de novas solicitações com anexos e níveis de prioridade",
      "Métricas no topo: Total de registros, Aguardando Atendimento e Em Execução",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Filtre os Chamados",
        description:
          "Utilize a barra de pesquisa ou os seletores de status e cartório para encontrar uma solicitação.",
        icon: Search,
      },
      {
        stepNumber: 2,
        title: "Alterne para a Visão Kanban",
        description:
          "Clique na aba 'Quadro' no topo da lista para visualizar o fluxo em colunas interativas.",
        icon: LayoutDashboard,
      },
      {
        stepNumber: 3,
        title: "Abra uma Nova Solicitação",
        description:
          "Clique no botão '+ Nova Solicitação' para registrar um atendimento ou demanda para o cliente.",
        icon: Plus,
      },
    ],
    tips: [
      {
        title: "Acompanhamento de SLA",
        description:
          "Solicitações com prazo próximo de expirar exibem alerta em destaque.",
        variant: "warning",
      },
    ],
  },
  {
    route: "/cs-cx/cartorios",
    title: "Perfil CS/CX dos Cartórios",
    subtitle: "Cadastro e Indicadores de Saúde",
    moduleName: "CS/CX",
    icon: Building2,
    description:
      "Ficha de acompanhamento dos cartórios atendidos pelo time de Customer Success. Apresenta o nível de satisfação, contatos principais, histórico de chamados e nível de risco.",
    keyFeatures: [
      "Classificação de risco de churn/insatisfação",
      "Histórico consolidado de reuniões, solicitações e pesquisas de NPS",
      "Filtros por analista de CS responsável",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Pesquise a Serventia",
        description: "Encontre o cartório pelo nome ou código CNS.",
        icon: Search,
      },
      {
        stepNumber: 2,
        title: "Veja os Indicadores de Saúde",
        description:
          "Confira o score do cliente antes de agendar uma reunião de alinhamento.",
        icon: Building2,
      },
    ],
  },
  {
    route: "/cs-cx/contatos",
    title: "Engajamento e Contatos CS/CX",
    subtitle: "Registro de Relacionamento com Clientes",
    moduleName: "CS/CX",
    icon: Contact,
    description:
      "Painel de registro de interações com os membros do cartório (tabeliães, substitutos, escreventes e equipe de TI). Permite auditar históricos de conversas e pendências.",
    keyFeatures: [
      "Cadastramento de contatos por serventia e função",
      "Filtros por contatos com pendências ativas",
      "Histórico completo de e-mails, reuniões e chamadas registradas",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Registre a Conversa",
        description:
          "Adicione um novo apontamento após realizar uma reunião ou contato telefônico.",
        icon: Plus,
      },
    ],
  },
  {
    route: "/cs-cx/agendamentos",
    title: "Agendamentos & Reuniões CS/CX",
    subtitle: "Calendário de Acompanhamento de Clientes",
    moduleName: "CS/CX",
    icon: Calendar,
    description:
      "Calendário de agendamento de reuniões de acompanhamento (Check-ins periódicos, reuniões de alinhamento e apresentação de melhorias) com os cartórios.",
    keyFeatures: [
      "Agenda de compromissos por analista de CS",
      "Sincronização com pauta de reuniões e atas",
      "Lembretes de check-ins periódicos",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Agende uma Reunião",
        description:
          "Clique na data desejada no calendário para marcar o acompanhamento com o cartório.",
        icon: Plus,
      },
    ],
  },
  {
    route: "/cs-cx/rotinas",
    title: "Diagnósticos e Rotinas Cartorárias",
    subtitle: "Análise de Uso do Sistema no Cartório",
    moduleName: "CS/CX",
    icon: ListChecks,
    description:
      "Ferramenta de diagnóstico para avaliar se o cartório está utilizando plenamente as rotinas e recursos do sistema Siplan (ex: selagem automática, rotinas de certidões, livro caixa).",
    keyFeatures: [
      "Matriz de adoção de rotinas por serventia",
      "Identificação de recursos subutilizados para agendamento de recapacitação",
      "Filtros por cartório, busca textual e status de análise ou de itens",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Aplique o Diagnóstico",
        description:
          "Selecione o cartório para marcar quais rotinas estão operacionais.",
        icon: ListChecks,
      },
      {
        stepNumber: 2,
        title: "Filtre por Status",
        description:
          "Utilize os seletores de status para visualizar cartórios analisados, não analisados ou sem rotina, assim como itens ativos/inativos na análise.",
        icon: Filter,
      },
    ],
  },
  {
    route: "/cs-cx/visitas",
    title: "Visitas Técnicas & Relacionamento",
    subtitle: "Registro e Atas de Visitas Presenciais/Remotas",
    moduleName: "CS/CX",
    icon: MapPin,
    description:
      "Controle de visitas presenciais ou remotas realizadas aos cartórios pela equipe de CS/CX. Registra a ata da conversa, pontos fortes, insatisfações e plano de ação.",
    keyFeatures: [
      "Registro de ata de visita com plano de ação",
      "Checklist de ambiente e satisfação da equipe",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Cadastre a Visita",
        description:
          "Informe os detalhes da reunião presencial e os tópicos debatidos.",
        icon: Plus,
      },
    ],
  },
  {
    route: "/cs-cx/nps",
    title: "NPS & Satisfação dos Clientes",
    subtitle: "Pesquisas e Indicadores Net Promoter Score",
    moduleName: "CS/CX",
    icon: Star,
    description:
      "Gestão das pesquisas de NPS aplicadas aos cartórios. Permite analisar as notas atribuídas, categorizar clientes em Promotores, Neutros ou Detratores e criar planos de tratativa.",
    keyFeatures: [
      "Métricas consolidadas de NPS global da empresa",
      "Histórico de notas e comentários por cartório",
      "Controle de planos de ação para clientes detratores",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Dispare uma Pesquisa",
        description:
          "Gere um link público de pesquisa para ser respondido pelo tabelião/escrevente.",
        icon: Send,
      },
      {
        stepNumber: 2,
        title: "Trate feedbacks de Detratores",
        description:
          "Acompanhe notas baixas para abrir imediatamente um plano de contorno.",
        icon: AlertCircle,
      },
    ],
  },
  {
    route: "/cs-cx/relatorios",
    title: "Relatórios Gerenciais CS/CX",
    subtitle: "Indicadores Globais da Área",
    moduleName: "CS/CX",
    icon: BarChart3,
    description:
      "Painel de relatórios consolidados de Customer Success: evolução do NPS, volume de solicitações resolvidas, contatos realizados e matriz de retenção.",
    keyFeatures: [
      "Exportação de estatísticas de atendimento",
      "Gráficos de evolução da saúde da carteira",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Selecione os Filtros",
        description: "Escolha o período e tipo de indicador a ser analisado.",
        icon: Sliders,
      },
    ],
  },
  {
    route: "/cs-cx/admin",
    title: "Configurações CS/CX",
    subtitle: "Parâmetros e Tabelas Auxiliares",
    moduleName: "CS/CX",
    icon: Settings2,
    description:
      "Ambiente de parametrização da área de CS/CX. Permite cadastrar categorias de solicitações, motivos de contato, modelos de rotinas e configurações do módulo.",
    keyFeatures: [
      "Cadastro de categorias e tipos de chamados CS/CX",
      "Configuração dos parâmetros de alerta de risco",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Gerencie as Categorias",
        description:
          "Adicione novos tipos de solicitação para a equipe classificar os chamados.",
        icon: Settings2,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // ASSISTENTES & COPILOT
  // ---------------------------------------------------------------------------
  {
    route: "/assistentes",
    title: "Central de Assistentes IA",
    subtitle: "Inteligência Artificial e Base de Conhecimento",
    moduleName: "Assistentes IA",
    icon: Bot,
    description:
      "Central de inteligência artificial do Siplan HUB. Gerencia os repositórios de conhecimento (RAG), monitora execuções de prompts, visualiza logs de custo e gera links de atendimento assistido.",
    keyFeatures: [
      "Base de Conhecimento OrionTN (Upload e Indexação de PDFs)",
      "Logs de execuções de IA com auditoria de custos e tempo de resposta",
      "Geração de links diretos de chat assistido para cartórios em pós-implantação",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Gerencie o Conhecimento",
        description:
          "Acesse 'Base de Conhecimento' para atualizar manuais que orientam as respostas da IA.",
        icon: BookOpen,
      },
      {
        stepNumber: 2,
        title: "Monitore os Logs",
        description:
          "Consulte os 'Logs' para verificar as perguntas enviadas pelos usuários.",
        icon: Activity,
      },
    ],
    quickLinks: [
      { label: "Base de Conhecimento", path: "/assistentes/conhecimento" },
      { label: "Logs & Analytics", path: "/assistentes/logs" },
      { label: "Links e Chats", path: "/assistentes/links-chats" },
    ],
  },
  {
    route: "/assistentes/conhecimento",
    title: "Base de Conhecimento (RAG)",
    subtitle: "Gerenciamento de Documentos e Manuais",
    moduleName: "Assistentes IA",
    icon: BookOpen,
    description:
      "Repositório de documentos, manuais de produto e PDFs técnicos que alimentam a memória do Copiloto IA (RAG - Retrieval-Augmented Generation).",
    keyFeatures: [
      "Upload e indexação de manuais e tutoriais do sistema",
      "Verificação de Chunks e Embeddings gerados no banco vectorial",
      "Editor de textos para inclusão manual de diretrizes de suporte",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Faça Upload de Manual",
        description:
          "Envie o arquivo PDF com as instruções do produto para indexação.",
        icon: Plus,
      },
      {
        stepNumber: 2,
        title: "Valide a Indexação",
        description:
          "Verifique se o documento foi processado com sucesso para uso nas respostas.",
        icon: CheckCircle2,
      },
    ],
  },
  {
    route: "/assistentes/logs",
    title: "Logs de Execução de IA",
    subtitle: "Auditoria e Analytics dos Modelos IA",
    moduleName: "Assistentes IA",
    icon: Activity,
    description:
      "Registro de auditoria com todas as requisições processadas pelos copilotos da plataforma. Exibe os prompts digitados, respostas geradas, tempo de resposta, modelo utilizado (Codex / Ollama) e índice de satisfação.",
    keyFeatures: [
      "Log completo de perguntas e respostas",
      "Métricas de tempo de latência e tokens consumidos",
      "Filtros por modelo de IA, usuário e avaliação do usuário",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Filtre por Período ou Modelo",
        description:
          "Selecione o intervalo de datas para auditar as interações dos usuários.",
        icon: Sliders,
      },
    ],
  },
  {
    route: "/assistentes/links-chats",
    title: "Links e Chats de Assistência IA",
    subtitle: "Gerenciador de Atendimentos Assistidos",
    moduleName: "Assistentes IA",
    icon: Link2,
    description:
      "Ferramenta de criação de links de atendimento assistido por IA para cartórios em fase de pós-implantação. Permite ao tabelião ou escrevente tirar dúvidas diretamente com o assistente do seu produto.",
    keyFeatures: [
      "Geração de links com token seguro por cartório",
      "Monitoramento de conversas ativas dos clientes",
      "Painel de suporte em tempo real",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Gere o Link para o Cartório",
        description:
          "Selecione a serventia para criar o link de atendimento direto por IA.",
        icon: Plus,
      },
    ],
  },
  {
    route: "/copilot",
    title: "Copilot Siplan HUB",
    subtitle: "Assistente Virtual Integrado",
    moduleName: "Assistentes IA",
    icon: Bot,
    description:
      "Assistente virtual inteligente integrado ao Siplan HUB. Permite consultar manuais de produto, normas de serviço dos cartórios e procedimentos operacionais em linguagem natural.",
    keyFeatures: [
      "Interface de chat interativa em tempo real",
      "Respostas fundamentadas nos manuais oficiais da empresa",
      "Citação de fontes e artigos de suporte relevantes",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Digite sua Dúvida",
        description:
          "Formule sua pergunta no campo de mensagem (ex: 'Como realizar o encerramento do livro caixa?').",
        icon: Send,
      },
      {
        stepNumber: 2,
        title: "Avalie a Resposta",
        description:
          "Utilize os ícones de avaliação para sinalizar se a resposta foi útil.",
        icon: CheckCircle2,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // ADMINISTRAÇÃO
  // ---------------------------------------------------------------------------
  {
    route: "/admin",
    title: "Painel de Administração",
    subtitle: "Configurações Globais e Gestão de Acessos",
    moduleName: "Administração",
    icon: Cog,
    description:
      "Central restrita a Administradores para gestão de contas de usuários, matriz de permissões por perfil (RBAC), equipes, configurações do sistema e auditoria de segurança.",
    keyFeatures: [
      "Gestão de Usuários e Atribuições (/admin/users)",
      "Matriz de Permissões e Perfis - RBAC (/admin/roles)",
      "Configuração de Equipes, Gestores e Áreas (/admin/teams-config)",
      "Monitoramento de Infraestrutura, Storage e Workers (/admin/infra)",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Gerencie Usuários e Permissões",
        description:
          "Acesse 'Matriz de Permissões' para conceder ou revogar acessos aos módulos.",
        icon: Shield,
      },
      {
        stepNumber: 2,
        title: "Monitore a Infraestrutura",
        description:
          "Acesse 'Infraestrutura' para verificar a carga de processamento do banco e workers.",
        icon: Cpu,
      },
    ],
    quickLinks: [
      { label: "Usuários", path: "/admin/users" },
      { label: "Matriz de Permissões", path: "/admin/roles" },
      { label: "Equipes", path: "/admin/teams-config" },
      { label: "Infraestrutura", path: "/admin/infra" },
      { label: "Auditoria", path: "/admin/audit" },
      { label: "Configurações", path: "/admin/settings" },
    ],
  },
  {
    route: "/admin/users",
    title: "Gestão de Usuários",
    subtitle: "Cadastro e Permissões de Membros",
    moduleName: "Administração",
    icon: Users,
    description:
      "Gerenciamento de contas dos usuários do sistema. Permite convidar novos colaboradores, alterar perfis (Roles), redefinir senhas e ativar ou desativar contas.",
    keyFeatures: [
      "Lista de usuários com perfil, e-mail e último acesso",
      "Cadastro e convite de novos usuários",
      "Vínculo de usuários com equipes e perfis RBAC",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Cadastre um Novo Usuário",
        description:
          "Clique em '+ Novo Usuário' e preencha nome, e-mail e perfil inicial.",
        icon: Plus,
      },
      {
        stepNumber: 2,
        title: "Edite Permissões de Perfil",
        description:
          "Altere o grupo de acesso (Admin, Gestor, Analista) conforme o cargo do colaborador.",
        icon: Shield,
      },
    ],
  },
  {
    route: "/admin/roles",
    title: "Matriz de Permissões (RBAC)",
    subtitle: "Controle Fino de Acesso por Perfil",
    moduleName: "Administração",
    icon: Shield,
    description:
      "Configuração detalhada das permissões de acesso do sistema. Define exatamente quais módulos, rotas e botões de ação (Criar, Editar, Excluir, Gerenciar) cada perfil de usuário pode executar.",
    keyFeatures: [
      "Matriz dinâmica de permissões vinculada ao RLS do Supabase",
      "Divisão por recurso (ex: Implantação, Comercial, CS/CX, SD)",
      "Sincronização imediata com os menus laterais e visibilidade de botões",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Selecione o Perfil",
        description:
          "Escolha o grupo de usuários (ex: Analista, Gestor) a ser configurado.",
        icon: Shield,
      },
      {
        stepNumber: 2,
        title: "Marque os Checkboxes de Acesso",
        description:
          "Conceda ou revogue os acessos e clique em Salvar Alterações.",
        icon: CheckCircle2,
      },
    ],
    tips: [
      {
        title: "Segurança de RLS",
        description:
          "As permissões alteradas aqui acionam a função security_definer no Supabase imediatamente.",
        variant: "warning",
      },
    ],
  },
  {
    route: "/admin/teams-config",
    title: "Configuração de Equipes e Áreas",
    subtitle: "Estrutura Organizacional Interna",
    moduleName: "Administração",
    icon: Users,
    description:
      "Gerenciamento da estrutura de equipes e áreas da empresa (Implantação, Conversão, CS/CX, Suporte SD, Comercial). Permite definir gestores e atribuir colaboradores.",
    keyFeatures: [
      "Cadastro de áreas de atendimento e desenvolvimento",
      "Definição do gestor líder por equipe",
      "Vínculo de colaboradores com suas respectivas equipes",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Crie uma Nova Equipe",
        description:
          "Informe o nome da área e selecione o gestor responsável.",
        icon: Plus,
      },
    ],
  },
  {
    route: "/admin/audit",
    title: "Logs de Auditoria do Sistema",
    subtitle: "Trilha de Segurança e Acessos",
    moduleName: "Administração",
    icon: History,
    description:
      "Trilha de auditoria que registra todas as ações críticas executadas na plataforma (alteração de permissões, edições de projetos, acessos e exclusões).",
    keyFeatures: [
      "Registro de timestamp, IP, usuário e ação realizada",
      "Filtros por intervalo de datas e tipo de evento de segurança",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Filtre os Eventos",
        description:
          "Selecione o período para auditar alterações sensíveis de dados.",
        icon: Sliders,
      },
    ],
  },
  {
    route: "/admin/settings",
    title: "Configurações Gerais do Sistema",
    subtitle: "Parâmetros Globais da Plataforma",
    moduleName: "Administração",
    icon: Cog,
    description:
      "Painel de configurações gerais da aplicação Siplan HUB, incluindo chaves de integração, textos padrão de e-mail e políticas do sistema.",
    keyFeatures: [
      "Configuração de chaves de API e webhooks",
      "Parâmetros de expiração de sessão e segurança",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Ajuste os Parâmetros Globais",
        description: "Edite as opções desejadas e salve as configurações.",
        icon: Cog,
      },
    ],
  },
  {
    route: "/admin/vacations",
    title: "Gestão de Escala e Férias",
    subtitle: "Planejamento de Ausências da Equipe",
    moduleName: "Administração",
    icon: Calendar,
    description:
      "Controle de escala de plantões, folgas e férias dos analistas. Evita agendamentos de implantação para colaboradores em período de ausência.",
    keyFeatures: [
      "Calendário de férias da equipe de campo e suporte",
      "Bloqueio automático de agendamentos para analistas ausentes",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Registre o Período de Férias",
        description:
          "Informe o colaborador e as datas de início e término do descanso.",
        icon: Plus,
      },
    ],
  },
  {
    route: "/admin/storage",
    title: "Armazenamento & Storage Supabase",
    subtitle: "Monitoramento de Buckets e Arquivos",
    moduleName: "Administração",
    icon: Server,
    description:
      "Painel de monitoramento dos buckets de armazenamento de arquivos no Supabase Storage (anexos de projetos, acervo de base de conhecimento, manuais e comprovantes).",
    keyFeatures: [
      "Consumo de espaço por bucket de armazenamento",
      "Contagem de arquivos cadastrados e políticas de acesso",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Verifique o Espaço Ocupado",
        description:
          "Monitore a taxa de uso do armazenamento do banco e buckets.",
        icon: Server,
      },
    ],
  },
  {
    route: "/admin/infra",
    title: "Infraestrutura & Hardware",
    subtitle: "Monitoramento em Tempo Real de Servidores",
    moduleName: "Administração",
    icon: Cpu,
    description:
      "Painel de monitoramento do ambiente de servidores em tempo real. Exibe carga de vCPU (Compute Load), uso de memória RAM, operações de I/O de disco (GP3) e status dos nós workers (Codex / Ollama).",
    keyFeatures: [
      "Métricas de processamento vCPU Compute em tempo real",
      "Uso de memória RAM e taxa de hit no cache de dados",
      "Detalhamento de disco (Tabelas PostgreSQL, WAL e sistema)",
      "Status operacional dos nós de execução assíncrona IA (Codex / Ollama Worker)",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Monitore a Carga de CPU",
        description:
          "Acompanhe a ocupação de vCPU durante os horários de pico de uso.",
        icon: Cpu,
      },
      {
        stepNumber: 2,
        title: "Verifique os Workers Codex/Ollama",
        description:
          "Confira se os serviços de contingência e processamento IA estão operacionais.",
        icon: Server,
      },
    ],
    tips: [
      {
        title: "Autoscaling GP3",
        description:
          "O volume de disco possui Spend Cap configurado com redimensionamento dinâmico.",
        variant: "info",
      },
    ],
  },
  {
    route: "/admin/inactive-users",
    title: "Controle de Usuários Inativos",
    subtitle: "Gestão de Contas Desativadas",
    moduleName: "Administração",
    icon: UserX,
    description:
      "Lista de contas de usuários inativas ou desativadas do sistema. Permite reativar perfis ou auditar colaboradores desligados.",
    keyFeatures: [
      "Listagem de contas inativas com data de desativação",
      "Opção de reativação de conta de usuário",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Reative uma Conta",
        description:
          "Clique no botão de reativação se o colaborador retornar à equipe.",
        icon: CheckCircle2,
      },
    ],
  },
  {
    route: "/admin/copilot",
    title: "Permissões e Acessos ao Copilot",
    subtitle: "Configuração do Assistente de IA",
    moduleName: "Administração",
    icon: Bot,
    description:
      "Gerenciamento das permissões de uso do Copilot de IA por perfil de usuário. Define quais grupos têm autorização para realizar consultas ao assistente.",
    keyFeatures: [
      "Controle de acesso por papel de usuário (RBAC)",
      "Definição de limites de requisições diárias",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Habilite o Copilot por Perfil",
        description:
          "Marque as funções que possuem permissão de interagir com o assistente.",
        icon: Bot,
      },
    ],
  },
  {
    route: "/admin/copilot-usage",
    title: "Métricas de Consumo do Copilot",
    subtitle: "Relatório de Custos e Utilização de IA",
    moduleName: "Administração",
    icon: BarChart3,
    description:
      "Relatório gerencial de consumo de inteligência artificial: volume de requisições, total de tokens processados por modelo e custos acumulados.",
    keyFeatures: [
      "Gráfico de consumo de tokens por dia e por usuário",
      "Estimativa de custos operacionais com APIs de IA",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Consulte a Curva de Uso",
        description:
          "Verifique os horários e setores de maior consumo do Copilot.",
        icon: BarChart3,
      },
    ],
  },
];

/**
 * Localiza as informações de ajuda adequadas para a rota atual (com tratamento refinado de rotas dinâmicas).
 */
export function getPageHelp(pathname: string): PageHelpInfo {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";

  // 1. Busca por correspondência exata
  const exactMatch = pageHelpData.find((item) => item.route === normalizedPath);
  if (exactMatch) return exactMatch;

  // 2. Busca por prefixo para rotas dinâmicas (ex: /cs-cx/cartorios/123 -> /cs-cx/cartorios)
  const sortedMatches = [...pageHelpData]
    .filter(
      (item) =>
        item.route !== "/" &&
        (normalizedPath === item.route ||
          normalizedPath.startsWith(item.route + "/") ||
          normalizedPath.startsWith(item.route + "?")),
    )
    .sort((a, b) => b.route.length - a.route.length);

  if (sortedMatches.length > 0) {
    return sortedMatches[0];
  }

  // 3. Fallback inteligente quando a rota não possui cadastro explícito
  const segments = normalizedPath.split("/").filter(Boolean);
  const rawModuleName = segments[0]
    ? segments[0].toUpperCase().replace("-", " ")
    : "Siplan HUB";

  return {
    route: normalizedPath,
    title: `Central de Ajuda - ${rawModuleName}`,
    subtitle: `Página atual: ${normalizedPath}`,
    moduleName: rawModuleName,
    icon: HelpCircle,
    description:
      `Você está navegando na área de ${rawModuleName}. Esta tela foi desenvolvida para apoiar as operações e fluxos de gestão de cartórios no Siplan HUB.`,
    keyFeatures: [
      "Navegação integrada com permissões RBAC",
      "Sincronização de dados em tempo real via Supabase",
      "Controles interativos e relatórios operacionais",
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Explore os Recursos da Tela",
        description:
          "Utilize a barra de ferramentas superior e os botões de ação para operar a funcionalidade atual.",
        icon: LayoutGrid,
      },
      {
        stepNumber: 2,
        title: "Filtros e Consultas",
        description:
          "Aplique os filtros disponíveis no topo ou campo de busca para localizar registros específicos.",
        icon: Sliders,
      },
      {
        stepNumber: 3,
        title: "Suporte e Dúvidas",
        description:
          "Para apoio adicional ou permissões de acesso nesta tela, consulte o Administrador ou equipe de TI.",
        icon: LifeBuoy,
      },
    ],
    tips: [
      {
        title: "Acesso por Perfil",
        description:
          "Os botões e formulários desta tela variam de acordo com as permissões atribuídas ao seu usuário.",
        variant: "info",
      },
    ],
  };
}
