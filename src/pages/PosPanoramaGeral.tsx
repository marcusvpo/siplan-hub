import { PanoramaBase } from "@/pages/PosPanorama";

/**
 * Panorama Geral: mesma análise do Panorama Pós-Implantação, mas incluindo
 * projetos com pós FINALIZADO — visão histórica da carteira inteira para
 * medir a evolução das implantações ao longo do tempo.
 */
export default function PosPanoramaGeral() {
  return (
    <PanoramaBase
      escopo="todos"
      titulo="Panorama Geral"
      descricao="Todos os projetos com pós (em andamento e finalizados) — histórico completo de chamados dentro dos períodos de pós."
    />
  );
}
