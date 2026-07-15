-- SEGURANCA: fecha a leitura anonima de public.profiles.
--
-- O PROBLEMA (confirmado, nao teorizado)
-- A policy "Public profiles are viewable by everyone" e TO public USING (true).
-- O role `public` inclui `anon`, e a chave anon vai no bundle JS do site. Um
-- `set role anon; select count(*) from public.profiles;` rodado em 15/07/2026
-- retornou 27 -- ou seja, qualquer pessoa na internet lia nome, email e role
-- de todos os usuarios, sem ter conta.
--
-- POR QUE E SEGURA
-- So o role muda: `public` -> `authenticated`. A expressao continua `true`,
-- entao todo usuario logado segue lendo todos os perfis, como hoje (a tela de
-- Usuarios, os seletores de responsavel e o AuthContext dependem disso).
-- Verificados os quatro caminhos que poderiam quebrar:
--   1. Login (src/pages/Login.tsx:59): le profiles DENTRO de `if (data.session)`,
--      ou seja, depois do signInWithPassword -- ja ha sessao, role authenticated.
--   2. /roadmap/:token: usa a RPC get_roadmap_data, SECURITY DEFINER (ignora RLS).
--   3. /public/infra-coleta/:id: usa as RPCs get_project_public_info e
--      update_project_public_infra, SECURITY DEFINER.
--   4. /public/checklist/:id: le apenas form_templates, intocada aqui.
--
-- NAO restringimos alem disso (ex: cada um so ve o proprio perfil) porque
-- quebraria a tela de Usuarios e os seletores de responsavel. Fechar o anonimo
-- e o ganho real; segmentar entre usuarios logados e outra discussao.

ALTER POLICY "Public profiles are viewable by everyone."
  ON public.profiles TO authenticated;
