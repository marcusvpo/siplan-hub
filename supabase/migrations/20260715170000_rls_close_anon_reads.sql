-- SEGURANCA: fecha a leitura anonima de nove tabelas.
--
-- Encontradas pelo teste src/test/rls-invariants.test.ts (2a invariante), que
-- falhou apontando SELECT ... TO public USING (true) fora das rotas publicas.
-- O role `public` inclui `anon`, e a chave anon vai no bundle do site.
--
-- AS DUAS GRAVES sao PII de cliente, hoje legivel por qualquer um sem conta:
--   clients          -- cadastro de clientes
--   client_contacts  -- contatos (nome, telefone, email)
-- O resto vaza estrutura interna (catalogo de permissoes, times, logs):
--   app_roles, app_permissions, app_role_permissions, teams, team_members,
--   conversion_logs, homologation_events
--
-- ENSAIADO EM PRODUCAO (transacao + rollback, 15/07/2026):
--   role authenticated -> clients=31, app_role_permissions=154, teams=9 (le tudo)
--   role anon          -> clients=0, client_contacts=0 (bloqueado)
--
-- So o role muda (public -> authenticated); a expressao segue `true`, entao
-- usuario logado nao perde nada. As tres app_* sao lidas pelo AuthContext no
-- login de todo usuario -- por isso continuam legiveis a authenticated.
--
-- Nenhuma pagina publica le estas tabelas (verificado em src/pages/public/,
-- RoadmapPage e usePublicChecklist).

ALTER POLICY "Allow read access to app_permissions"
  ON public.app_permissions TO authenticated;
ALTER POLICY "Allow read access to app_role_permissions"
  ON public.app_role_permissions TO authenticated;
ALTER POLICY "Allow read access to app_roles"
  ON public.app_roles TO authenticated;
ALTER POLICY "Enable read access for all users"
  ON public.client_contacts TO authenticated;
ALTER POLICY "Enable read access for all users"
  ON public.clients TO authenticated;
ALTER POLICY "Users can view conversion logs for their projects"
  ON public.conversion_logs TO authenticated;
ALTER POLICY "Users can view homologation events"
  ON public.homologation_events TO authenticated;
ALTER POLICY "Allow public read access to team_members"
  ON public.team_members TO authenticated;
ALTER POLICY "Teams are viewable by everyone"
  ON public.teams TO authenticated;
