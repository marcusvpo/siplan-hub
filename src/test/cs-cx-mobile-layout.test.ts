import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const overview = readSource("src/pages/cs-cx/CsCxOverview.tsx");
const requests = readSource("src/pages/cs-cx/CsCxRequests.tsx");
const offices = readSource("src/pages/cs-cx/CsCxRegistryOffices.tsx");
const contacts = readSource("src/pages/cs-cx/CsCxContacts.tsx");
const appointments = readSource("src/pages/cs-cx/CsCxAppointments.tsx");
const routines = readSource("src/pages/cs-cx/CsCxRoutines.tsx");
const visits = readSource("src/pages/cs-cx/CsCxVisits.tsx");
const nps = readSource("src/pages/cs-cx/CsCxNps.tsx");
const reports = readSource("src/pages/cs-cx/CsCxReports.tsx");
const admin = readSource("src/pages/cs-cx/CsCxAdmin.tsx");
const invitations = readSource("src/components/cs-cx/NpsSurveyManagement.tsx");
const analytics = readSource("src/components/cs-cx/NpsAnalytics.tsx");
const attention = readSource("src/components/cs-cx/ContactAttentionDashboard.tsx");

describe("responsividade das telas do CS/CX", () => {
  it("mantém todas as páginas principais dentro da largura do PWA", () => {
    const pages = [
      overview,
      requests,
      offices,
      contacts,
      appointments,
      routines,
      visits,
      nps,
      reports,
      admin,
    ];

    pages.forEach((page) => {
      expect(page).toContain("overflow-x-hidden");
      expect(page).toContain("min-w-0");
      expect(page).toContain("safe-area-inset-bottom");
    });
  });

  it("troca as tabelas operacionais por cartões no celular", () => {
    expect(requests).toContain('data-testid="cs-cx-requests-mobile-list"');
    expect(offices).toContain('data-testid="cs-cx-offices-mobile-list"');
    expect(contacts).toContain('data-testid="cs-cx-contacts-mobile-list"');
    expect(appointments).toContain('data-testid="cs-cx-appointments-mobile-list"');
    expect(routines).toContain('data-testid="cs-cx-routines-mobile-list"');
    expect(routines).toContain('data-testid="cs-cx-routines-history-mobile-list"');
  });

  it("oferece uma etapa única no Kanban e uma agenda vertical no celular", () => {
    expect(requests).toContain('data-testid="cs-cx-requests-mobile-status"');
    expect(requests).toContain("statuses.filter((statusConfig) => !isMobile");
    expect(appointments).toContain('data-testid="cs-cx-calendar-mobile-agenda"');
  });

  it("compacta NPS, relatórios e seus detalhamentos", () => {
    expect(nps).toContain('data-testid="cs-cx-nps-responses-mobile-list"');
    expect(nps).toContain('data-testid="cs-cx-nps-history-mobile-list"');
    expect(invitations).toContain('data-testid="cs-cx-nps-invitations-mobile-list"');
    expect(analytics).toContain('data-testid="cs-cx-nps-drilldown-mobile-list"');
    expect(reports).toContain('data-testid="cs-cx-reports-mobile-list"');
    expect(reports).toContain("<ReportPaginationBar");
  });

  it("adapta os painéis auxiliares e modais à viewport dinâmica", () => {
    expect(attention).toContain('data-testid="cs-cx-attention-mobile-list"');
    expect(attention).toContain("h-[calc(100dvh-1rem)]");
    expect(analytics).toContain("h-[calc(100dvh-1rem)]");
    expect(admin).toContain('data-testid="cs-cx-admin-page"');
  });
});
