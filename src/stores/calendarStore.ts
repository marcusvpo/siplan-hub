import { create } from "zustand";
import {
  CalendarDisplayTab,
  CalendarEvent,
  CalendarStatusFilter,
  CalendarSystemFilter,
  CalendarViewMode,
} from "@/types/calendar";
import { startOfDay } from "date-fns";

export interface CalendarState {
  currentDate: Date;
  viewMode: CalendarViewMode;
  isInteractiveMode: boolean;
  interactiveEvents: CalendarEvent[];
  realEvents: CalendarEvent[];
  hiddenResourceIds: string[];
  selectedYear: number;
  selectedQuarter: 1 | 2 | 3 | 4;
  displayTab: CalendarDisplayTab;
  searchQuery: string;
  systemFilter: CalendarSystemFilter;
  statusFilter: CalendarStatusFilter;
  onlyActiveMembers: boolean;

  // Actions
  setCurrentDate: (date: Date) => void;
  setViewMode: (mode: CalendarViewMode) => void;
  setInteractiveMode: (isInteractive: boolean) => void;
  addInteractiveEvent: (event: CalendarEvent) => void;
  updateInteractiveEvent: (event: CalendarEvent) => void;
  removeInteractiveEvent: (eventId: string) => void;
  setRealEvents: (events: CalendarEvent[]) => void;
  toggleResourceVisibility: (id: string) => void;
  clearHiddenResources: () => void;
  importRealDataToSandbox: () => void;
  setSelectedYear: (year: number) => void;
  setSelectedQuarter: (quarter: 1 | 2 | 3 | 4) => void;
  setDisplayTab: (tab: CalendarDisplayTab) => void;
  setSearchQuery: (query: string) => void;
  setSystemFilter: (filter: CalendarSystemFilter) => void;
  setStatusFilter: (filter: CalendarStatusFilter) => void;
  setOnlyActiveMembers: (onlyActive: boolean) => void;
  resetFilters: () => void;
}

const initialNow = new Date();
const initialQuarter = (Math.floor(initialNow.getMonth() / 3) + 1) as
  | 1
  | 2
  | 3
  | 4;

export const useCalendarStore = create<CalendarState>((set) => ({
  currentDate: startOfDay(initialNow),
  viewMode: "quarter",
  isInteractiveMode: false,
  interactiveEvents: [],
  realEvents: [],
  hiddenResourceIds: [],
  selectedYear: initialNow.getFullYear(),
  selectedQuarter: initialQuarter,
  displayTab: "timeline",
  searchQuery: "",
  systemFilter: "all",
  statusFilter: "all",
  onlyActiveMembers: false,

  setCurrentDate: (date) => {
    const normalized = startOfDay(date);
    const year = normalized.getFullYear();
    const quarter = (Math.floor(normalized.getMonth() / 3) + 1) as
      | 1
      | 2
      | 3
      | 4;
    set({
      currentDate: normalized,
      selectedYear: year,
      selectedQuarter: quarter,
    });
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  setInteractiveMode: (isInteractive) =>
    set({ isInteractiveMode: isInteractive }),

  toggleResourceVisibility: (id) =>
    set((state) => ({
      hiddenResourceIds: state.hiddenResourceIds.includes(id)
        ? state.hiddenResourceIds.filter((hiddenId) => hiddenId !== id)
        : [...state.hiddenResourceIds, id],
    })),

  clearHiddenResources: () => set({ hiddenResourceIds: [] }),

  addInteractiveEvent: (event) =>
    set((state) => ({
      interactiveEvents: [...state.interactiveEvents, event],
    })),

  updateInteractiveEvent: (updatedEvent) =>
    set((state) => ({
      interactiveEvents: state.interactiveEvents.map((evt) =>
        evt.id === updatedEvent.id ? updatedEvent : evt
      ),
    })),

  removeInteractiveEvent: (eventId) =>
    set((state) => ({
      interactiveEvents: state.interactiveEvents.filter(
        (evt) => evt.id !== eventId
      ),
    })),

  setRealEvents: (events) => set({ realEvents: events }),

  importRealDataToSandbox: () =>
    set((state) => ({ interactiveEvents: [...state.realEvents] })),

  setSelectedYear: (year) =>
    set((state) => {
      const startMonthOfQuarter = (state.selectedQuarter - 1) * 3;
      return {
        selectedYear: year,
        currentDate: startOfDay(new Date(year, startMonthOfQuarter, 1)),
      };
    }),

  setSelectedQuarter: (quarter) =>
    set((state) => {
      const startMonthOfQuarter = (quarter - 1) * 3;
      return {
        selectedQuarter: quarter,
        currentDate: startOfDay(
          new Date(state.selectedYear, startMonthOfQuarter, 1)
        ),
      };
    }),

  setDisplayTab: (tab) => set({ displayTab: tab }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSystemFilter: (filter) => set({ systemFilter: filter }),

  setStatusFilter: (filter) => set({ statusFilter: filter }),

  setOnlyActiveMembers: (onlyActive) => set({ onlyActiveMembers: onlyActive }),

  resetFilters: () =>
    set({
      searchQuery: "",
      systemFilter: "all",
      statusFilter: "all",
      onlyActiveMembers: false,
      hiddenResourceIds: [],
    }),
}));
