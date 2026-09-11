-- Corrige a documentacao da origem do analista apos validar o schema real da
-- view historica do Ellevo usada pela Consulta de Chamados.

comment on column public.chamados_processo_venda.analista_responsavel is
  'ResponsavelChamado atual informado pela view de chamados do Ellevo.';
