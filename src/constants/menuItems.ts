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
    }[];
}

export const menuItems: MenuItem[] = [
    {
        title: "Dashboard",
        icon: LayoutGrid,
        path: "/dashboard",
        description: "Visão geral e indicadores principais",
        // Dashboard is always visible — no permissionKey required
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
                icon: FolderKanban,
                description: "Templates específicos por projeto",
            },
            {
                title: "Editor",
                path: "/orion-tn-models",
                icon: FileEdit,
                description: "Criador e editor avançado de JSON",
            },
        ],
    },
];
