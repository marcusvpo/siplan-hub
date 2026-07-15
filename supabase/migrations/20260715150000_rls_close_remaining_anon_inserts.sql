-- SEGURANCA: fecha as duas ultimas escritas anonimas do schema.
--
-- Encontradas depois de fechar as outras oito. Ambas eram TO public com
-- WITH CHECK (true) -- ou seja, um estranho sem conta conseguia injetar
-- registro. Passaram batido na primeira varredura porque eu filtrei por `qual`,
-- e em policy de INSERT a condicao vive em `with_check`; `qual` e sempre nulo.
--
-- Confirmado em producao antes de corrigir, dentro de uma transacao com
-- rollback: como anon, o INSERT em conversion_logs falhou com
-- "violates check constraint conversion_logs_type_check" -- uma restricao de
-- DADO, nao de permissao. Ou seja, o RLS deixou passar. Depois do ALTER, o
-- mesmo INSERT falha com "violates row-level security policy", que e o esperado.
--
-- Nao afeta usuario logado: a expressao segue `true`, so o role muda.

ALTER POLICY "Users can insert conversion logs"
  ON public.conversion_logs TO authenticated;

ALTER POLICY "Users can insert homologation events"
  ON public.homologation_events TO authenticated;
