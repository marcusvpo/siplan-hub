CREATE OR ALTER VIEW dbo.horas_analistas_0800
AS
SELECT
  tempo.TGID AS id_lancamento_0800,
  tempo.SolID AS numero_chamado,
  tramite.TraIDSeq AS sequencia_tramite,
  solicitacao.SolTitulo AS titulo_chamado,
  tipo.TTGasDescricao AS atividade,
  usuario.UsuID AS id_analista_0800,
  usuario.UsuNome AS nome_analista,
  LOWER(LTRIM(RTRIM(usuario.UsuUsuario))) AS login_analista,
  CONVERT(date, tempo.TGIntervaloDe) AS data_lancamento,
  tempo.TGIntervaloDe AS inicio,
  tempo.TGIntervaloAte AS fim,
  DATEDIFF(minute, tempo.TGIntervaloDe, tempo.TGIntervaloAte) AS minutos,
  NULLIF(LTRIM(RTRIM(tramite.DescricaoTextoPlano)), N'') AS descricao_tramite,
  tempo.TGExtra AS hora_extra,
  tempo.TraRetrabalho AS retrabalho,
  tempo.TGTipoTempo AS tipo_tempo,
  tempo.ConsideraContrato AS considera_contrato
FROM PlataformaEllevo.dbo.TempoGasto AS tempo
INNER JOIN PlataformaEllevo.dbo.Tramite AS tramite
  ON tramite.SolID = tempo.SolID
 AND tramite.TraID = tempo.TraID
INNER JOIN PlataformaEllevo.dbo.Solicitacao AS solicitacao
  ON solicitacao.SolID = tempo.SolID
INNER JOIN PlataformaEllevo.dbo.Usuario AS usuario
  ON usuario.UsuID = tempo.UsuID
LEFT JOIN PlataformaEllevo.dbo.TipoTempoGasto AS tipo
  ON tipo.TTGasID = tempo.TTGasID
WHERE tempo.TGValido = 1
  AND tempo.TGIntervaloDe IS NOT NULL
  AND tempo.TGIntervaloAte IS NOT NULL
  AND tempo.TGIntervaloAte > tempo.TGIntervaloDe;
