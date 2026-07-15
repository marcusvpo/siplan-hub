-- Faz a autorizacao de Usuarios respeitar app_permissions, nao so role='admin'.
--
-- Problema: a UI passou a mostrar as acoes de Usuarios para perfis com
-- users.create/edit, mas o servidor so aceitava role='admin'. O checkbox
-- concedia e o backend devolvia 403. Aqui o servidor passa a consultar a
-- mesma fonte de verdade que a UI.
--
-- SEGURANCA: has_permission() retorna TRUE para role='admin' (ver
-- 20260601141300). Logo, toda policy abaixo e um SUPERCONJUNTO da atual:
-- admin nao perde nada, e perfis com a permissao ganham. Mudanca aditiva.
--
-- Bonus: a policy antiga fazia SELECT em public.profiles de dentro de uma
-- policy da propria public.profiles, o que arrisca recursao. has_permission()
-- e SECURITY DEFINER e nao dispara RLS, entao elimina esse risco.

DROP POLICY IF EXISTS "Users can update own profile or admins can update any profile" ON public.profiles;

CREATE POLICY "Update own profile or with users.edit permission"
  ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id
    OR public.has_permission(auth.uid(), 'users', 'edit')
  );

-- NOTA DELIBERADA: nao criamos policy de DELETE para public.profiles.
-- Nao existe uma hoje, entao o DELETE do client e bloqueado pelo RLS: o
-- PostgREST apaga zero linhas e NAO retorna erro, e a UI exibe "Usuario
-- removido" sem ter removido nada. Criar a policy aqui transformaria um
-- no-op silencioso numa exclusao real e irreversivel, sem que ninguem
-- tenha pedido por isso. Decisao do produto, nao desta migration.
