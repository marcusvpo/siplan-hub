import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const layout = readSource("src/components/Layout/MainLayout.tsx");
const knowledge = readSource("src/pages/assistants/KnowledgeEditorPage.tsx");
const knowledgeNavigator = readSource("src/components/knowledge/ArticleNavigator.tsx");
const editor = readSource("src/components/knowledge/MarkdownTiptapEditor.tsx");
const logs = readSource("src/pages/admin/PosAiLogs.tsx");
const visitorAnalytics = readSource("src/components/Admin/PosAiVisitorAnalytics.tsx");
const linksChats = readSource("src/pages/assistants/PosAiLinksChats.tsx");
const linksManager = readSource("src/components/Admin/PosAiChatLinksManager.tsx");
const usersManager = readSource("src/components/Admin/PosAiChatUsersManager.tsx");

describe("responsividade das telas de Assistentes", () => {
  it("abre o índice de conhecimento em uma gaveta no celular", () => {
    expect(knowledge).toContain('data-testid="assistants-knowledge-mobile-layout"');
    expect(knowledge).toContain("open={isMobileNavigatorOpen}");
    expect(knowledge).toContain('side="left"');
    expect(knowledge).toContain("md:hidden");
    expect(knowledge).toContain("hidden shrink-0");
    expect(knowledge).toContain("100dvh");
    expect(layout).toContain('location.pathname === "/assistentes/conhecimento"');
    expect(knowledgeNavigator).toContain("pointer-events-none absolute left-2.5");
    expect(knowledgeNavigator).toContain("pl-9 pr-8");
    expect(knowledgeNavigator).not.toContain("pl-8.5");
  });

  it("mantém editor, cabeçalho e modais de conhecimento dentro do viewport", () => {
    expect(knowledge).toContain("grid-cols-3");
    expect(knowledge).toContain("sm:hidden\">Publicar");
    expect(editor).toContain("min-w-0 max-w-[850px] overflow-hidden");
    expect(editor).toContain("[&_pre]:max-w-full");
    expect(editor).toContain("p-3 shadow-sm sm:min-h-[500px]");
  });

  it("troca os registros e usuários analíticos por cartões no mobile", () => {
    expect(logs).toContain('data-testid="assistants-logs-mobile-layout"');
    expect(logs).toContain('data-testid="pos-ai-logs-mobile-list"');
    expect(logs).toContain("hidden max-h-[600px] overflow-x-auto md:block");
    expect(visitorAnalytics).toContain('data-testid="pos-ai-analytics-users-mobile-list"');
    expect(visitorAnalytics).toContain("hidden overflow-x-auto md:block");
    expect(logs).toContain("max-h-[calc(100dvh-1rem)]");
  });

  it("compacta abas, filtros e conversas da central de links", () => {
    expect(linksChats).toContain('data-testid="assistants-links-chats-mobile-layout"');
    expect(linksChats).toContain("overflow-x-hidden");
    expect(linksChats).toContain("grid grid-cols-2 items-center");
    expect(linksChats).toContain("sm:hidden\">Links</span>");
    expect(linksChats).toContain("max-h-[calc(100dvh-1rem)]");
    expect(linksManager).toContain("grid min-w-0 grid-cols-2");
  });

  it("substitui a tabela de usuários por cartões com ações tocáveis", () => {
    expect(usersManager).toContain('data-testid="pos-ai-users-mobile-list"');
    expect(usersManager).toContain("hidden overflow-x-auto rounded-xl border md:block");
    expect(usersManager).toContain("grid grid-cols-3 gap-1.5");
    expect(usersManager).toContain("h-9 min-w-0");
  });
});
