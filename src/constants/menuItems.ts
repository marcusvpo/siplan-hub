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
    FileCheck,
    Headset,
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
            {
                title: "Panorama Pós-Implantação",
                path: "/dashboard/pos-implantacao",
                icon: Headset,
                description: "Chamados 0800 dos pós EM ANDAMENTO por produto, tema e recorrência",
                permissionKey: "pos_panorama",
            },
            {
                title: "Panorama Geral",
                path: "/dashboard/pos-panorama-geral",
                icon: History,
                description: "Histórico completo dos pós (em andamento + finalizados)",
                permissionKey: "pos_panorama_geral",
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
                permissionKey: "projects",
            },
            {
                title: "Relatórios",
                path: "/reports",
                icon: BarChart3,
                description: "Análise de dados e performance",
                permissionKey: "reports",
            },
            {
                title: "Próx. Implantações",
                path: "/deployments",
                icon: Rocket,
                description: "Planejamento de futuras instalações",
                permissionKey: "deployments_next",
            },
            {
                title: "Últimas Implantações",
                path: "/deployments/latest",
                icon: History,
                description: "Histórico de instalações concluídas",
                permissionKey: "deployments_latest",
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
                permissionKey: "calendar_projects",
            },
            {
                title: "Agenda dos Analistas",
                path: "/agenda-analistas",
                icon: Users,
                description: "Alocações e agendas da equipe",
                permissionKey: "calendar_analysts",
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
                permissionKey: "commercial_customers",
            },
            {
                title: "Bloqueios",
                path: "/commercial/blockers",
                icon: AlertCircle,
                description: "Gestão de impeditivos comerciais",
                permissionKey: "commercial_blockers",
            },
            {
                title: "Contatos",
                path: "/commercial/contacts",
                icon: Contact,
                description: "Registro de interações comerciais",
                permissionKey: "commercial_contacts",
            },
            {
                title: "Checklist do Cliente",
                path: "/commercial/checklists",
                icon: ClipboardList,
                description: "Status do checklist comercial dos clientes",
                permissionKey: "commercial_checklists",
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
                permissionKey: "conversion_home",
            },
            {
                title: "Motores",
                path: "/conversion/engines",
                icon: Cog,
                description: "Configuração de scripts de migração",
                permissionKey: "conversion_engines",
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
                permissionKey: "orion_dashboard",
            },
            {
                title: "Gerenciar Projetos",
                path: "/orion-tn-models/projects",
                icon: FolderClosed,
                description: "Templates específicos por projeto",
                permissionKey: "orion_projects",
            },
            {
                title: "Editor de Modelos",
                path: "/orion-tn-models",
                icon: FileText,
                description: "Criador e editor avançado de JSON",
                permissionKey: "orion_editor",
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
                title: "Visão Geral",
                path: "/implantadores",
                icon: LayoutDashboard,
                description: "Painel geral do módulo de implantadores",
                permissionKey: "implantadores_home",
            },
            {
                title: "Editor de Aderência",
                path: "/implantadores/aderencia",
                icon: FileEdit,
                description: "Formulários e checklists de aderência",
                permissionKey: "implantadores_aderencia",
            },
            {
                title: "Aderências Finalizadas",
                path: "/implantadores/aderencia/finalizadas",
                icon: FileCheck,
                description: "Listagem de checklists de aderência concluídos",
                permissionKey: "implantadores_aderencia_finalizadas",
            },
            {
                title: "Homologação de Conversões",
                path: "/implantadores/homologation",
                icon: ClipboardList,
                description: "Validação de conversões, inconsistências e aprovação de etapas",
                permissionKey: "conversion_homologation",
            },
            {
                title: "Roteiro de Treinamento",
                path: "/implantadores/treinamento",
                icon: BookOpen,
                description: "Material de capacitação e treinamentos",
                permissionKey: "implantadores_treinamento",
            },
            {
                title: "Documento de Transição",
                path: "/implantadores/transicao",
                icon: FileText,
                description: "Passagem de bastão para a equipe de suporte",
                permissionKey: "implantadores_transicao",
            },
        ],
    },
];
