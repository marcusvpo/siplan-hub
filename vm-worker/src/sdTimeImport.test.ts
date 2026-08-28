import assert from "node:assert/strict";
import test from "node:test";
import { mapEllevoHour } from "./sdTimeImportMapper.js";

test("mapeia um tempo do 0800 com origem estável e contexto do chamado", () => {
  const item = mapEllevoHour({
    id_lancamento_0800: 1234,
    numero_chamado: 749736,
    sequencia_tramite: 5,
    titulo_chamado: "Não dá para recepcionar a remessa",
    atividade: "Análise",
    id_analista_0800: 11890,
    nome_analista: "Marcos Fernandes - Siplan",
    login_analista: "marcos.fernandes",
    id_grupo_analista_0800: 11186,
    grupo_analista: "SD - Protesto",
    horario_inicio: "08:25",
    horario_fim: "09:10",
    minutos: 45,
    descricao_tramite: "Validação realizada.",
    hora_extra: false,
    retrabalho: "N",
    tipo_tempo: "N",
    considera_contrato: true,
  });

  assert.equal(item.external_id, "1234");
  assert.equal(item.title, "#749736 — Não dá para recepcionar a remessa");
  assert.equal(item.start, "08:25");
  assert.equal(item.end, "09:10");
  assert.match(item.description ?? "", /Atividade no 0800: Análise/);
  assert.equal(item.metadata.ellevo_login, "marcos.fernandes");
  assert.equal(item.metadata.ellevo_group, "SD - Protesto");
});
