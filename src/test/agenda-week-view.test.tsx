import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgendaWeekView } from "@/components/agenda/AgendaWeekView";
import type { UnifiedAgendaEvent } from "@/types/agenda";

describe("AgendaWeekView Rendering Test", () => {
  it("renders events for the current week", () => {
    // 2026-10-28 is Wednesday of the week 2026-10-26 to 2026-11-01
    const testDate = new Date(2026, 9, 28);
    const mockEvents: UnifiedAgendaEvent[] = [
      {
        id: "evt-1",
        date: "2026-10-28",
        userName: "Ricardo Vieira",
        clientName: "Cartório Modelo SP",
        subject: "Implantação Orion Protesto",
        activityType: "implantacao",
        startTime: "08:30",
        endTime: "17:30",
        isAllDay: true,
        origin: "manual_entry",
        status: "Confirmada",
      },
    ];

    const { container } = render(
      <AgendaWeekView
        currentDate={testDate}
        events={mockEvents}
        selectedUserNames={["Ricardo Vieira"]}
        onCardClick={() => {}}
      />
    );

    // Check if client name is in the DOM
    const cardText = screen.queryByText(/Cartório Modelo SP/i);
    console.log("Found card in DOM:", !!cardText);
    expect(cardText).not.toBeNull();
  });
});
