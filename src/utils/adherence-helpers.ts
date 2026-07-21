export interface ImpactedItem {
  sectionTitle: string;
  questionTitle: string;
  detalhes: string;
  nivel_impacto: string;
}

/**
 * Normaliza e extrai todos os itens marcados com impacto/impeditivo no formulário de aderência.
 */
export const getImpactedItems = (schema: any, formData: any): ImpactedItem[] => {
  const items: ImpactedItem[] = [];
  if (!schema || !schema.properties || !formData) return items;

  const traverse = (currentSchema: any, currentData: any, currentSectionTitle: string) => {
    if (!currentSchema || !currentSchema.properties || !currentData) return;

    Object.keys(currentSchema.properties).forEach((key) => {
      const propSchema = currentSchema.properties[key];
      const propData = currentData[key];
      if (!propSchema) return;

      const hasImpactProp = propSchema.properties && ("impacto" in propSchema.properties || "nivel_impacto" in propSchema.properties);

      if (propSchema.type === "object" && !hasImpactProp) {
        traverse(propSchema, propData, propSchema.title || currentSectionTitle);
      } else if (propData && typeof propData === "object") {
        const isImpact = propData.impacto === true || propData.nivel_impacto === "SIM" || propData.nivel_impacto === "ATENÇÃO";
        if (isImpact) {
          items.push({
            sectionTitle: currentSectionTitle,
            questionTitle: propSchema.title || "Pergunta",
            detalhes: propData.detalhes || "Nenhum detalhe informado.",
            nivel_impacto: propData.nivel_impacto ?? (propData.impacto ? "SIM" : "NÃO"),
          });
        }
      }
    });
  };

  traverse(schema, formData, "Geral");
  return items;
};

/**
 * Verifica se um projeto possui GAP ou impedimento/bloqueio na Análise de Aderência.
 */
export const hasAdherenceGap = (project?: { stages?: { adherence?: { hasProductGap?: boolean; gapDescription?: string; status?: string } } } | null): boolean => {
  if (!project || !project.stages?.adherence) return false;
  const adherence = project.stages.adherence;

  if (adherence.hasProductGap === true) return true;
  if (adherence.gapDescription && adherence.gapDescription.trim().length > 0) return true;

  const status = (adherence.status || "").toLowerCase();
  if (
    status === "blocked" ||
    status === "waiting_adjustment" ||
    status === "reproved" ||
    status === "impediment" ||
    status === "paused"
  ) {
    return true;
  }

  return false;
};
