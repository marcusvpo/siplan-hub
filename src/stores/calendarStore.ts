import { create } from "zustand";
import { CalendarEvent, CalendarViewMode } from "@/types/calendar";
import { addDays, startOfDay } from "date-fns";

interface CalendarState {
  currentDate: Date;
  viewMode: CalendarViewMode;
  isInteractiveMode: boolean;
  interactiveEvents: CalendarEvent[];
  realEvents: CalendarEvent[];
  hiddenResourceIds: string[];
  
  // Actions
  setCurrentDate: (date: Date) => void;
  setViewMode: (mode: CalendarViewMode) => void;
  setInteractiveMode: (isInteractive: boolean) => void;
  addInteractiveEvent: (event: CalendarEvent) => void;
  updateInteractiveEvent: (event: CalendarEvent) => void;
  removeInteractiveEvent: (eventId: string) => void;
  setRealEvents: (events: CalendarEvent[]) => void;
  toggleResourceVisibility: (id: string) => void;
  importRealDataToSandbox: () => void;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  currentDate: startOfDay(new Date()),
  viewMode: "month",
  isInteractiveMode: false,
  interactiveEvents: [],
  realEvents: [],
  hiddenResourceIds: [],

  setCurrentDate: (date) => set({ currentDate: date }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setInteractiveMode: (isInteractive) => set({ isInteractiveMode: isInteractive }),
  
  toggleResourceVisibility: (id) =>
    set((state) => ({
      hiddenResourceIds: state.hiddenResourceIds.includes(id)
        ? state.hiddenResourceIds.filter((hiddenId) => hiddenId !== id)
        : [...state.hiddenResourceIds, id],
    })),

  addInteractiveEvent: (event) => 
    set((state) => ({ interactiveEvents: [...state.interactiveEvents, event] })),
    
  updateInteractiveEvent: (updatedEvent) =>
    set((state) => ({
      interactiveEvents: state.interactiveEvents.map((evt) =>
        evt.id === updatedEvent.id ? updatedEvent : evt
      ),
    })),
    
  removeInteractiveEvent: (eventId) =>
    set((state) => ({
      interactiveEvents: state.interactiveEvents.filter((evt) => evt.id !== eventId),
    })),

  setRealEvents: (events) => set({ realEvents: events }),
    
  importRealDataToSandbox: () =>
    set((state) => ({ interactiveEvents: [...state.realEvents] })),
}));
