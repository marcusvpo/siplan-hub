import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const layout = readSource("src/components/Layout/MainLayout.tsx");
const moduleOverview = readSource("src/pages/ModuleOverview.tsx");
const adherenceEditor = readSource("src/components/checklist/ChecklistEditor.tsx");
const questionBuilder = readSource("src/components/FormRenderer/VisualQuestionBuilder.tsx");
const formRenderer = readSource("src/components/FormRenderer/FormRenderer.tsx");
const adherenceForm = readSource("src/pages/ProjectAdherenceForm.tsx");
const finishedAdherences = readSource("src/pages/implantadores/AderenciasFinalizadas.tsx");
const homologation = readSource("src/pages/implantadores/ImplantadoresHomologation.tsx");
const training = readSource("src/pages/implantadores/TreinamentoPlaceholder.tsx");
const transition = readSource("src/pages/implantadores/TransicaoPlaceholder.tsx");
const richTextEditor = readSource("src/components/ui/rich-text-editor.tsx");

describe("responsividade das telas de Implantadores", () => {
  it("mantém a visão geral dentro da largura do PWA", () => {
    expect(moduleOverview).toContain('data-testid="module-overview"');
    expect(moduleOverview).toContain("overflow-x-hidden");
    expect(moduleOverview).toContain("grid-cols-1");
  });

  it("compacta o editor de aderência e seus modais", () => {
    expect(adherenceEditor).toContain('data-testid="checklist-editor-mobile-layout"');
    expect(adherenceEditor).toContain("overflow-x-hidden");
    expect(adherenceEditor).toContain("h-[calc(100dvh-1rem)]");
    expect(questionBuilder).toContain("min-w-0 space-y-4");
    expect(questionBuilder).toContain('data-testid="adherence-images-bulk-actions"');
    expect(questionBuilder).toContain("min-[360px]:grid-cols-2");
    expect(formRenderer).toContain('data-testid="adherence-image-attachments"');
    expect(formRenderer).toContain('data-testid="adherence-collapsible-section"');
    expect(formRenderer).toContain("flex w-full min-w-0");
    expect(formRenderer).toContain("min-h-11 gap-2 py-1.5 sm:min-h-10");
    expect(formRenderer).toContain("<RichTextEditor");
    expect(formRenderer).toContain("grid min-w-0 grid-cols-1");
    expect(adherenceForm).toContain("compact");
    expect(adherenceForm).toContain("pb-[calc(0.75rem+env(safe-area-inset-bottom))]");
    expect(adherenceForm).toContain("lg:grid-cols-[minmax(180px,2fr)_repeat(5,minmax(90px,1fr))]");
    expect(adherenceForm).toContain('data-testid="adherence-draft-save-status"');
    expect(adherenceForm).toContain("Salvar rascunho");
    expect(adherenceForm).toContain("min-[420px]:grid-cols-2");
    expect(richTextEditor).toContain("h-[calc(100dvh-1rem)]");
  });

  it("preserva o preenchimento parcial da aderência como rascunho", () => {
    expect(adherenceForm).toContain("queueDraftSave");
    expect(adherenceForm).toContain("await saveQueueRef.current");
    expect(adherenceForm).toContain('window.addEventListener("beforeunload"');
    expect(adherenceForm).toContain("O preenchimento pode ser continuado depois sem finalizar o formulário.");
  });

  it("substitui a tabela de aderências por cartões paginados no celular", () => {
    expect(finishedAdherences).toContain('data-testid="adherence-finished-mobile-list"');
    expect(finishedAdherences).toContain("isMobile ? 3 : 8");
    expect(finishedAdherences).toContain('className="hidden overflow-x-auto md:block"');
  });

  it("empilha fila, contexto e parecer da homologação", () => {
    expect(homologation).toContain('data-testid="implantadores-homologation-mobile-layout"');
    expect(homologation).toContain("flex-col overflow-y-auto lg:flex-row");
    expect(homologation).toContain("max-h-[calc(100dvh-1rem)]");
    expect(layout).toContain('location.pathname === "/implantadores/homologation"');
  });

  it("adapta treinamento e todo o fluxo de transição sem rolagem lateral", () => {
    expect(training).toContain('data-testid="implantadores-training-mobile-layout"');
    expect(transition).toContain('data-testid="implantadores-transition-mobile-layout"');
    expect(transition).toContain('data-testid="transition-tickets-mobile-list"');
    expect(transition).toContain("grid-cols-2 gap-1 overflow-hidden");
    expect(transition).toContain("[&_table]:table-fixed");
  });
});
