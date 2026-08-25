import type { CsCxRegistryOffice } from "@/hooks/useCsCxCore";
import {
  generateCsCxPdfReport,
  type CsCxReportBlock,
} from "@/lib/cs-cx-experience-pdf";

export function buildCsCxRegistryOfficesReport(
  offices: CsCxRegistryOffice[],
): CsCxReportBlock[] {
  const rows = [...offices]
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"))
    .map((office): [string, string] => {
      const responsibles = office.responsibles
        .map(
          (responsible) =>
            responsible.profile?.full_name ||
            responsible.profile?.email ||
            "Responsável não identificado",
        )
        .join(", ");
      const products = office.products
        .map((item) => item.product?.name)
        .filter((name): name is string => Boolean(name))
        .join(", ");

      return [
        office.name,
        [
          `SAP: ${office.sap_code || "não informado"}`,
          `Status: ${office.active ? "Ativo" : "Inativo"}`,
          `Responsáveis: ${responsibles || "não informados"}`,
          `Produtos: ${products || "não informados"}`,
          `Contato: ${office.contact_details || "não informado"}`,
        ].join(" · "),
      ];
    });

  return [
    {
      title: "LISTAGEM DE CARTÓRIOS",
      subtitle: `${offices.length} cartório(s) no recorte atual · ordem alfabética`,
      rows,
    },
  ];
}

export async function printCsCxRegistryOfficesReport(
  offices: CsCxRegistryOffice[],
  filterDescription: string,
  targetWindow?: Window | null,
) {
  const active = offices.filter((office) => office.active).length;

  await generateCsCxPdfReport(
    "LISTAGEM DE CARTÓRIOS",
    filterDescription,
    [
      { label: "Cartórios", value: offices.length },
      { label: "Ativos", value: active },
      { label: "Inativos", value: offices.length - active },
      {
        label: "Produtos distintos",
        value: new Set(
          offices.flatMap((office) =>
            office.products.map((item) => item.product_id),
          ),
        ).size,
      },
    ],
    buildCsCxRegistryOfficesReport(offices),
    `listagem-cartorios-${localIsoDate()}.pdf`,
    { mode: "print", targetWindow },
  );
}

function localIsoDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
