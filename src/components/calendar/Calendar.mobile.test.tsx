import { DndContext } from "@dnd-kit/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCalendarStore } from "@/stores/calendarStore";
import type { CalendarEvent } from "@/types/calendar";
import Calendar from "@/pages/Calendar";
import { CalendarGrid } from "./CalendarGrid";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => true,
}));

vi.mock("@/hooks/useProjectsV2", () => ({
  useProjectsV2: () => ({ projects: [], isLoading: false }),
}));

vi.mock("@/hooks/useVacations", () => ({
  useVacations: () => ({
    vacations: [],
    checkVacationConflict: vi.fn(() => null),
  }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const longClientName =
  "Cartório com nome muito extenso para permanecer totalmente legível no calendário mobile";

const event: CalendarEvent = {
  id: "calendar-mobile-event",
  resourceId: "ricardo-vieira",
  title: `Implantação: ${longClientName}`,
  clientName: longClientName,
  start: new Date("2026-08-10T12:00:00"),
  end: new Date("2026-08-12T12:00:00"),
  type: "implementation",
  status: "confirmed",
  color: "bg-sky-500",
};

describe("Calendário no mobile", () => {
  beforeEach(() => {
    useCalendarStore.setState({
      currentDate: new Date("2026-08-10T12:00:00"),
      viewMode: "month",
      isInteractiveMode: false,
      interactiveEvents: [],
      realEvents: [],
      hiddenResourceIds: [],
    });
  });

  it("reorganiza controles, equipe e legenda sem ampliar a página", () => {
    render(<Calendar />);

    expect(screen.getByTestId("calendar-page")).toHaveClass(
      "min-w-0",
      "overflow-visible",
      "md:overflow-hidden",
    );
    expect(screen.getByTestId("calendar-controls")).toHaveClass(
      "grid",
      "grid-cols-1",
      "min-w-0",
    );
    expect(screen.getByLabelText("Visualização do calendário")).toHaveClass(
      "h-10",
      "flex-1",
      "md:w-[100px]",
    );
    expect(screen.getByTestId("calendar-team-dock")).toHaveClass(
      "flex-col",
      "min-w-0",
      "md:flex-row",
    );
    expect(screen.getByTestId("calendar-legend")).toHaveClass(
      "flex",
      "flex-wrap",
      "min-w-0",
    );
    expect(screen.getByTestId("calendar-mobile-agenda")).toBeInTheDocument();
    expect(screen.queryByTestId("calendar-desktop-grid")).not.toBeInTheDocument();
  });

  it("troca a grade comprimida por uma agenda vertical com textos completos", () => {
    const onEventClick = vi.fn();
    useCalendarStore.setState({ realEvents: [event] });

    render(
      <DndContext>
        <CalendarGrid onEventClick={onEventClick} />
      </DndContext>,
    );

    expect(screen.getByTestId("calendar-mobile-agenda")).toHaveClass(
      "min-w-0",
      "space-y-3",
    );
    expect(screen.getAllByTestId("calendar-mobile-day")).toHaveLength(1);
    expect(screen.getByTestId("calendar-mobile-event")).toHaveClass(
      "min-w-0",
    );
    expect(screen.getByTestId("calendar-mobile-event-title")).toHaveClass(
      "break-words",
    );
    expect(screen.getByTestId("calendar-mobile-event-title")).toHaveTextContent(
      longClientName,
    );
    expect(screen.getByText("Ricardo Vieira")).toBeInTheDocument();
    expect(screen.getByText("10/08 a 12/08/2026")).toBeInTheDocument();

    fireEvent.click(screen.getAllByText(longClientName)[0]);
    expect(onEventClick).toHaveBeenCalledWith(event);
  });

  it("mantém datas vazias como alvos no Playground mobile", () => {
    useCalendarStore.setState({ isInteractiveMode: true });

    render(
      <DndContext>
        <CalendarGrid />
      </DndContext>,
    );

    expect(screen.getAllByTestId("calendar-mobile-day")).toHaveLength(42);
    expect(
      screen.getAllByText("Arraste um integrante da equipe para esta data.")[0],
    ).toBeInTheDocument();
  });
});
