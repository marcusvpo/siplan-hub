import {
    Layers,
    Briefcase,
    Database,
    FileText,
    FolderKanban,
    BarChart3,
    Calendar,
    Rocket,
    Users,
    AlertCircle,
    Contact,
    Home,
    Cog,
    FileEdit,
    LayoutGrid,
    LayoutDashboard,
    History,
    ClipboardList,
    BookOpen,
    FolderClosed,
} from "lucide-react";

export interface MenuItem {
    title: string;
    icon: any;
    path?: string;
    description?: string;
    permissionKey?: string; // resource key used for permission check (e.g. "menu_implantacao")
    subItems?: {
        title: string;
        path: string;
        icon: any;
        description?: string;
        permissionKey?: string;
    }[];
}

export const menuItems: MenuItem[] = [
    {
        title: "Dashboard",
        icon: LayoutGrid,
        description: "Visão geral e indicadores principais",
        permissionKey: "dashboard",
        subItems: [
            {
                title: "Visão Geral",
                path: "/dashboard",
                icon: BarChart3,
                description: "Métricas e status dos projetos",
                permissionKey: "dashboard_view",
            },
            {
                title: "Quadro Kanban",
                path: "/dashboard/kanban",
                icon: LayoutDashboard,
                description: "Acompanhamento visual do fluxo",
                permissionKey: "kanban",
            },
        ],
    },
    {
        title: "Implantação",
        icon: Layers,
        description: "Gestão de projetos, cronogramas e entregas",
        permissionKey: "menu_implantacao",
        subItems: [
            {
                title: "Gerenciar Projetos",
                path: "/projects",
                icon: FolderKanban,
                description: "Lista e acompanhamento de projetos ativos",
            },
            {
                title: "Relatórios",
                path: "/reports",
                icon: BarChart3,
                description: "Análise de dados e performance",
            },
            {
                title: "Próx. Implantações",
                path: "/deployments",
                icon: Rocket,
                description: "Planejamento de futuras instalações",
            },
            {
                title: "Últimas Implantações",
                path: "/deployments/latest",
                icon: History,
                description: "Histórico de instalações concluídas",
            },
        ],
    },
    {
        title: "Calendário",
        icon: Calendar,
        description: "Visão cronológica de atividades e prazos",
        permissionKey: "menu_calendario",
        subItems: [
            {
                title: "Calendário de Projetos",
                path: "/calendar",
                icon: Calendar,
                description: "Cronograma de atividades e prazos",
            },
            {
                title: "Agenda dos Analistas",
                path: "/agenda-analistas",
                icon: Users,
                description: "Alocações e agendas da equipe",
            },
        ],
    },
    {
        title: "Comercial",
        icon: Briefcase,
        description: "CRM, vendas e gerenciamento de clientes",
        permissionKey: "menu_comercial",
        subItems: [
            {
                title: "Painel de Clientes",
                path: "/commercial/customers",
                icon: Users,
                description: "Visão 360 do relacionamento com clientes",
            },
            {
                title: "Bloqueios",
                path: "/commercial/blockers",
                icon: AlertCircle,
                description: "Gestão de impeditivos comerciais",
            },
            {
                title: "Contatos",
                path: "/commercial/contacts",
                icon: Contact,
                description: "Registro de interações comerciais",
            },
            {
                title: "Form. Nova Implantação",
                path: "/commercial/deployment-forms",
                icon: ClipboardList,
                description: "Formulários de solicitação de implantação",
            },
            {
                title: "Checklist do Cliente",
                path: "/commercial/checklists",
                icon: ClipboardList,
                description: "Status do checklist comercial dos clientes",
            },
        ],
    },
    {
        title: "Conversão",
        icon: Database,
        description: "Migração de dados e motores de conversão",
        permissionKey: "menu_conversao",
        subItems: [
            {
                title: "Gestão de Atividades",
                path: "/conversion",
                icon: Home,
                description: "Controle de tarefas de conversão",
            },
            {
                title: "Motores",
                path: "/conversion/engines",
                icon: Cog,
                description: "Configuração de scripts de migração",
            },
            {
                title: "Homologação",
                path: "/conversion/homologation",
                icon: BarChart3,
                description: "Validação de dados convertidos",
            },
        ],
    },
    {
        title: "Modelos Editor OrionTN",
        icon: FileText,
        description: "Editor de modelos e templates OrionTN",
        permissionKey: "menu_orion",
        subItems: [
            {
                title: "Dashboard",
                path: "/orion-tn-models/dashboard",
                icon: BarChart3,
                description: "Métricas e overview da central de modelos",
            },
            {
                title: "Gerenciar Projetos",
                path: "/orion-tn-models/projects",
                icon: FolderClosed,
                description: "Templates específicos por projeto",
            },
            {
                title: "Editor de Modelos",
                path: "/orion-tn-models",
                icon: FileText,
                description: "Criador e editor avançado de JSON",
            },
        ],
    },
    {
        title: "Implantadores",
        icon: Users,
        description: "Ferramentas, formulários de aderência e transição",
        permissionKey: "menu_implantadores",
        subItems: [
            {
                title: "Editor de Aderência",
                path: "/implantadores/aderencia",
                icon: FileEdit,
                description: "Formulários e checklists de aderência",
            },
            {
                title: "Roteiro de Treinamento",
                path: "/implantadores/treinamento",
                icon: BookOpen,
                description: "Material de capacitação e treinamentos",
            },
            {
                title: "Documento de Transição",
                path: "/implantadores/transicao",
                icon: FileText,
                description: "Passagem de bastão para a equipe de suporte",
            },
        ],
    },
];
