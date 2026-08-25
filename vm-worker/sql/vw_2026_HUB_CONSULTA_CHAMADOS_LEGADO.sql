-- Aplicar no banco Siplan_AcessoIA com uma credencial autorizada para DDL.
-- A aplicacao e o worker usam apenas SELECT nesta view.
CREATE OR ALTER VIEW dbo.vw_2026_HUB_CONSULTA_CHAMADOS_LEGADO
AS
SELECT DISTINCT
  c.NumeroChamado,
  c.CardCode0800 AS codigoCliente,
  cliente.NomeCliente,
  cliente.NomeCliente AS RazaoSocialCliente,
  c.TituloChamado,
  CAST(c.DescricaoChamado AS nvarchar(max)) AS descricaotramite,
  c.natureza AS Natureza,
  c.StatusChamado,
  c.Software,
  c.Produto,
  c.DataAberturaChamado,
  c.DataEncerramentoChamado AS SolDataFechamento
FROM dbo.vw_2026_ChamadosTodosStatus AS c
CROSS APPLY (
  VALUES (
    CASE
      WHEN CHARINDEX(' - Chamado:', c.ClienteChamado) > 0
        THEN LEFT(c.ClienteChamado, CHARINDEX(' - Chamado:', c.ClienteChamado) - 1)
      ELSE c.ClienteChamado
    END
  )
) AS cliente (NomeCliente)
WHERE LTRIM(RTRIM(c.Produto)) IN ('Siplan', 'Control-M', 'Global');
