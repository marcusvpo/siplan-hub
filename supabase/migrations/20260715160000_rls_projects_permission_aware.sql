-- Faz a escrita em public.projects respeitar app_permissions.
--
-- ESTADO ATUAL: seis policies, duas por operacao, TODAS `true` para
-- authenticated. Qualquer usuario logado insere, altera e APAGA qualquer
-- projeto via API, independente do perfil. (A migration que criou isso se
-- chama "security_hardening_rls".)
--
-- POR QUE HA DUPLICATAS E POR QUE ISSO IMPORTA: policies permissivas se somam
-- com OU. Apertar uma e deixar a irma `true` nao muda absolutamente nada -- por
-- isso as seis sao dropadas, e nao alteradas.
--
-- ESTA MUDANCA ESPELHA O QUE A UI JA IMPOE, nao inventa restricao nova:
--   INSERT -> projects.create : NewProjectDialog.tsx:47 ja faz `if
--             (!canCreateProjects) return null`. Unico ponto de insert do app.
--   DELETE -> projects.delete : ProjectCardV3.tsx:387 ja esconde o botao sem
--             canDeleteProjects; ProjectGrid so recebe o onAction desse botao.
--   UPDATE -> projects.edit   : o perfil 'user' TEM projects.edit, entao segue
--             editando normalmente.
--
-- ENSAIADO EM PRODUCAO ANTES (transacao + rollback, 15/07/2026), simulando
-- sessao real via request.jwt.claims:
--   'user' real  -> UPDATE: 1 linha  (continua trabalhando)
--   'user' real  -> DELETE: 0 linhas (bloqueado)
--   'admin' real -> DELETE: 1 linha  (continua podendo)
--
-- QUEM E AFETADO: so o perfil 'Teste' (1 usuario, confirmado como nao-real),
-- que tem apenas projects.view e perderia a escrita -- que a UI ja nao oferece.
--
-- NAO AFETA: vm-worker (usa service_role, ignora RLS); paginas publicas
-- (/roadmap e /public/infra-coleta usam RPCs SECURITY DEFINER); a leitura
-- (policies de SELECT ficam intactas, inclusive a publica de checklist/roadmap).
--
-- ROLLBACK: ver o bloco comentado no fim do arquivo.

DROP POLICY "insert_projects_authenticated" ON public.projects;
DROP POLICY "Authenticated users can insert projects" ON public.projects;
DROP POLICY "update_projects_authenticated" ON public.projects;
DROP POLICY "Authenticated users can update projects" ON public.projects;
DROP POLICY "delete_projects_authenticated" ON public.projects;
DROP POLICY "Authenticated users can delete projects" ON public.projects;

CREATE POLICY "Insert projects with projects.create permission"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'projects', 'create'));

CREATE POLICY "Update projects with projects.edit permission"
  ON public.projects FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'projects', 'edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'projects', 'edit'));

CREATE POLICY "Delete projects with projects.delete permission"
  ON public.projects FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'projects', 'delete'));

-- ROLLBACK (volta ao estado permissivo anterior, sem as duplicatas):
--
-- DROP POLICY "Insert projects with projects.create permission" ON public.projects;
-- DROP POLICY "Update projects with projects.edit permission" ON public.projects;
-- DROP POLICY "Delete projects with projects.delete permission" ON public.projects;
-- CREATE POLICY "Authenticated users can insert projects" ON public.projects
--   FOR INSERT TO authenticated WITH CHECK (true);
-- CREATE POLICY "Authenticated users can update projects" ON public.projects
--   FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
-- CREATE POLICY "Authenticated users can delete projects" ON public.projects
--   FOR DELETE TO authenticated USING (true);
