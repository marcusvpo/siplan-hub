import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const dashboard = readSource("src/pages/conversion/OrionTNDashboard.tsx");
const projects = readSource("src/pages/conversion/OrionTNProjects.tsx");
const editor = readSource("src/pages/conversion/OrionTNModels.tsx");
const workspace = readSource(
  "src/components/ProjectManagement/ModelosEditor/ModelosEditorWorkspace.tsx",
);
const projectModal = readSource("src/components/ProjectManagement/ProjectModal.tsx");
const generalInfo = readSource(
  "src/components/ProjectManagement/Tabs/GeneralInfoTab.tsx",
);

describe("responsividade do Modelos Editor OrionTN", () => {
  it("troca a tabela recente do dashboard por cartões no celular", () => {
    expect(dashboard).toContain('data-testid="orion-models-dashboard"');
    expect(dashboard).toContain('data-testid="orion-dashboard-mobile-projects"');
    expect(dashboard).toContain("overflow-x-hidden");
    expect(dashboard).toContain("hidden w-full overflow-auto sm:block");
  });

  it("filtra e pagina os projetos em andamento com três itens no mobile", () => {
    expect(dashboard).toContain('aria-label="Filtrar cartórios em andamento"');
    expect(dashboard).toContain("isMobile ? 3 : 5");
    expect(dashboard).toContain("normalizeText(project.clientName).includes(query)");
    expect(dashboard).toContain('data-testid="orion-dashboard-project-pagination"');
    expect(dashboard).toContain('aria-label="Página anterior dos projetos"');
    expect(dashboard).toContain('aria-label="Próxima página dos projetos"');
    expect(dashboard).not.toContain(".slice(0, 10)");
  });

  it("pagina três projetos e usa cartões mobile na listagem", () => {
    expect(projects).toContain('data-testid="orion-models-projects"');
    expect(projects).toContain('data-testid="orion-project-mobile-list"');
    expect(projects).toContain('window.innerWidth < 768 ? 3 : 5');
    expect(projects).toContain("Página {currentPage} de {totalPages}");
    expect(projects).toContain("max-h-[calc(100dvh-1rem)]");
  });

  it("abre os projetos em uma gaveta sobreposta no editor mobile", () => {
    expect(editor).toContain('data-testid="orion-models-editor"');
    expect(editor).toContain('aria-label="Fechar lista de projetos"');
    expect(editor).toContain("absolute inset-y-0 left-0 z-40");
    expect(editor).toContain("if (isMobile) setIsSidebarOpen(false)");
    expect(editor).toContain("100dvh");
  });

  it("exibe nomes completos dos cartórios na gaveta mobile", () => {
    expect(editor).toContain("w-[calc(100%_-_1rem)] max-w-xs");
    expect(editor).toContain("whitespace-normal break-words");
    expect(editor).toContain("md:hidden");
    expect(editor).toContain("md:inline-block");
    expect(editor).toContain("md:items-center md:py-1.5");
  });

  it("empilha abas, arquivos, ações e limita os modais ao viewport", () => {
    expect(workspace).toContain('data-testid="orion-models-workspace"');
    expect(workspace).toContain("sm:flex-row sm:items-center sm:justify-between");
    expect(workspace).toContain("grid w-full grid-cols-2");
    expect(workspace).toContain("sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:p-1.5");
    expect(workspace).toContain("h-[calc(100dvh-1rem)]");
    expect(workspace).toContain("w-[calc(100vw-1rem)]");
  });

  it("mantém o modal compartilhado legível quando aberto pelas telas OrionTN", () => {
    expect(projectModal).toContain('data-testid="project-details-modal"');
    expect(projectModal).toContain("h-[calc(100dvh-1rem)]");
    expect(projectModal).toContain('aria-label="Seção do projeto"');
    expect(projectModal).toContain("flex shrink-0 flex-col items-stretch");
    expect(projectModal).toContain("hidden overflow-x-auto border-b");
    expect(projectModal).toContain("min-w-0 flex-1 overflow-y-auto");
  });

  it("troca a trilha horizontal de etapas por uma grade no celular", () => {
    expect(generalInfo).toContain('data-testid="project-stage-overview"');
    expect(generalInfo).toContain("grid max-w-5xl grid-cols-2");
    expect(generalInfo).toContain("hidden h-0.5 rounded-full bg-muted sm:block");
    expect(generalInfo).not.toContain('min-w-[500px] sm:min-w-full');
  });
});
