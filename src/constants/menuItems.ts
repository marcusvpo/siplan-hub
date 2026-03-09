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
    FolderClosed,
} from "lucide-react";

export interface MenuItem {
    title: string;
    icon: any;
    path?: string;
    description?: string;
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
        icon: Home,
        path: "/dashboard",
        description: "Visão geral e indicadores principais",
    },
    {
        title: "Implantação",
        icon: Layers,
        description: "Gestão de projetos, cronogramas e entregas",
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
                title: "Calendário",
                path: "/calendar",
                icon: Calendar,
                description: "Cronograma de atividades e prazos",
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
        title: "Comercial",
        icon: Briefcase,
        description: "CRM, vendas e gerenciamento de clientes",
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
        subItems: [
            {
                title: "Gerenciar Projetos",
                path: "/orion-tn-models/projects",
                icon: FolderClosed,
                description: "Templates específicos por projeto",
            },
        ],
    },
];
