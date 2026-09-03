-- Migration to seed release notification for the Central de Novidades (Changelog) system

INSERT INTO public.notifications (
  type,
  category,
  permission_resource,
  title,
  message,
  action_url,
  read,
  created_at
) VALUES (
  'release_feature',
  'changelog',
  'admin_changelog',
  'Central de Novidades (Changelog) no Ícone de Notificações',
  'Lançada a Central de Novidades! Agora todas as melhorias, correções e novas telas do Siplan HUB serão notificadas diretamente no sino do menu superior com filtro automático de permissão (RBAC), abas de navegação e opção de descarte individual.',
  '/admin/changelog',
  false,
  NOW()
);
