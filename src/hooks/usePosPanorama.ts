import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Chamado0800,
  mapChamado0800,
  isNaturezaIgnorada,
  softwareMatchesSystemType,
} from "@/hooks/useChamados0800";

export interface TemaAgregado {
  tema: string;
  chamados: number;
  /** quantos cartórios distintos abriram chamado deste tema (recorrência) */
  cartorios: number;
  nomes: string[];
}

export interface PosPanoramaData {
  chamados: Chamado0800[];
  totalCartorios: number;
  temas: TemaAgregado[];
  semTema: number;
  porNatureza: { natureza: string; total: number }[];
  lastSyncedAt?: string;
}

/**
 * Panorama Pós-Implantação (visão geral do Dashboard): agrega os chamados 0800
 * do espelho por produto e período — temas recorrentes entre cartórios (gerados
 * por IA no worker), naturezas e volumes. Fonte: public.chamados_0800; naturezas
 * internas (nova implantação/comercial) ficam de fora.
 *
 * @param produto "todos" ou um system_type ("Orion TN", "Orion PRO"...)
 * @param inicio  data mínima de abertura (yyyy-mm-dd); null = sem corte
 */
export function usePosPanorama(produto: string, inicio: string | null) {
  return useQuery<PosPanoramaData>({
    queryKey: ["posPanorama", produto, inicio],
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase
        .from("chamados_0800")
        .select("*")
        .order("data_abertura", { ascending: false })
        .limit(5000);
      if (inicio) q = q.gte("data_abertura", inicio);
      const { data, error } = await q;
      if (error) throw error;

      let chamados = (data ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((c: any) => !isNaturezaIgnorada(c.natureza))
        .map(mapChamado0800);
      if (produto !== "todos") {
        chamados = chamados.filter((c) => softwareMatchesSystemType(c.software, produto));
      }

      const cartorios = new Set(chamados.map((c) => c.nomeCliente).filter(Boolean));

      const temasMap = new Map<string, { chamados: number; nomes: Set<string> }>();
      let semTema = 0;
      for (const c of chamados) {
        if (!c.tema || c.tema === "não classificado") {
          semTema++;
          continue;
        }
        const atual = temasMap.get(c.tema) ?? { chamados: 0, nomes: new Set<string>() };
        atual.chamados++;
        if (c.nomeCliente) atual.nomes.add(c.nomeCliente);
        temasMap.set(c.tema, atual);
      }
      const temas: TemaAgregado[] = [...temasMap.entries()]
        .map(([tema, v]) => ({
          tema,
          chamados: v.chamados,
          cartorios: v.nomes.size,
          nomes: [...v.nomes].sort(),
        }))
        // Recorrencia entre cartorios primeiro; volume desempata.
        .sort((a, b) => b.cartorios - a.cartorios || b.chamados - a.chamados);

      const natMap = new Map<string, number>();
      for (const c of chamados) {
        const k = c.natureza || "Sem natureza";
        natMap.set(k, (natMap.get(k) ?? 0) + 1);
      }
      const porNatureza = [...natMap.entries()]
        .map(([natureza, total]) => ({ natureza, total }))
        .sort((a, b) => b.total - a.total);

      const lastSyncedAt = chamados.reduce<string | undefined>(
        (max, c) => (c.syncedAt && (!max || c.syncedAt > max) ? c.syncedAt : max),
        undefined
      );

      return {
        chamados,
        totalCartorios: cartorios.size,
        temas,
        semTema,
        porNatureza,
        lastSyncedAt,
      };
    },
  });
}
