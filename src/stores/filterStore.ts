import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SortOrder = 'alpha-asc' | 'alpha-desc' | 'uat-asc' | 'uat-desc' | 'created-asc' | 'created-desc' | 'progress-asc' | 'progress-desc';
export type ViewPreset = 'all' | 'active' | 'post' | 'paused' | 'done' | 'custom';
export type HealthFilter = 'all' | 'ok' | 'warning' | 'critical';
export type StageFilter = 'all' | 'infra' | 'adherence' | 'conversion' | 'environment' | 'implementation' | 'post';

export interface SavedFilter {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  filters: FilterState;
  createdAt: Date;
}

export interface FilterState {
  searchQuery: string;
  viewPreset: ViewPreset;
  healthScore: HealthFilter;
  currentStage: StageFilter;
  projectLeader: string;
  systemType: string;
  sortOrder: SortOrder;
  dateFrom: string;
  dateTo: string;
}

interface FilterStore extends FilterState {
  savedFilters: SavedFilter[];
  activeFilterId: string | null;
  isFilterPanelOpen: boolean;
  
  // Actions
  setSearchQuery: (query: string) => void;
  setViewPreset: (preset: ViewPreset) => void;
  setHealthScore: (score: HealthFilter) => void;
  setCurrentStage: (stage: StageFilter) => void;
  setProjectLeader: (leader: string) => void;
  setSystemType: (type: string) => void;
  setSortOrder: (order: SortOrder) => void;
  setDateFrom: (date: string) => void;
  setDateTo: (date: string) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  
  // Filter management
  saveFilter: (name: string, icon?: string, color?: string) => void;
  loadFilter: (id: string) => void;
  updateFilter: (id: string, updates: Partial<SavedFilter>) => void;
  deleteFilter: (id: string) => void;
  resetFilters: () => void;
  
  // UI
  setFilterPanelOpen: (open: boolean) => void;
  toggleFilterPanel: () => void;
  
  // Quick presets
  applyQuickPreset: (preset: 'active' | 'paused' | 'done') => void;
  
  // Deprecated - for backwards compatibility
  status: string;
  setStatus: (status: string) => void;
}

const defaultFilters: FilterState = {
  searchQuery: "",
  viewPreset: "active",
  healthScore: "all",
  currentStage: "all",
  projectLeader: "",
  systemType: "",
  sortOrder: "uat-desc",
  dateFrom: "",
  dateTo: "",
};

export const useFilterStore = create<FilterStore>()(
  persist(
    (set, get) => ({
      ...defaultFilters,
      savedFilters: [],
      activeFilterId: null,
      isFilterPanelOpen: false,
      
      // Deprecated
      status: "all",
      setStatus: (status) => set({ status }),

      setSearchQuery: (query) => set({ searchQuery: query, activeFilterId: null }),
      setViewPreset: (preset) => set({ viewPreset: preset, activeFilterId: null }),
      setHealthScore: (score) => set({ healthScore: score, activeFilterId: null }),
      setCurrentStage: (stage) => set({ currentStage: stage, activeFilterId: null }),
      setProjectLeader: (leader) => set({ projectLeader: leader, activeFilterId: null }),
      setSystemType: (type) => set({ systemType: type, activeFilterId: null }),
      setSortOrder: (order) => set({ sortOrder: order }),
      setDateFrom: (date) => set({ dateFrom: date, activeFilterId: null }),
      setDateTo: (date) => set({ dateTo: date, activeFilterId: null }),
      
      setFilters: (filters) => set((state) => ({ ...state, ...filters, activeFilterId: null })),

      saveFilter: (name, icon, color) => {
        const state = get();
        const filters: FilterState = {
          searchQuery: state.searchQuery,
          viewPreset: state.viewPreset,
          healthScore: state.healthScore,
          currentStage: state.currentStage,
          projectLeader: state.projectLeader,
          systemType: state.systemType,
          sortOrder: state.sortOrder,
          dateFrom: state.dateFrom,
          dateTo: state.dateTo,
        };
        
        const newFilter: SavedFilter = {
          id: crypto.randomUUID(),
          name,
          icon,
          color,
          filters,
          createdAt: new Date(),
        };
        set({ savedFilters: [...state.savedFilters, newFilter], activeFilterId: newFilter.id });
      },

      loadFilter: (id) => {
        const filter = get().savedFilters.find((f) => f.id === id);
        if (filter) {
          set({ ...filter.filters, activeFilterId: id });
        }
      },

      updateFilter: (id, updates) => {
        set({
          savedFilters: get().savedFilters.map((f) =>
            f.id === id ? { ...f, ...updates } : f
          ),
        });
      },

      deleteFilter: (id) => {
        const state = get();
        set({
          savedFilters: state.savedFilters.filter((f) => f.id !== id),
          activeFilterId: state.activeFilterId === id ? null : state.activeFilterId,
        });
      },

      resetFilters: () => set({ ...defaultFilters, activeFilterId: null }),
      
      setFilterPanelOpen: (open) => set({ isFilterPanelOpen: open }),
      toggleFilterPanel: () => set((state) => ({ isFilterPanelOpen: !state.isFilterPanelOpen })),
      
      applyQuickPreset: (preset) => {
        set({
          ...defaultFilters,
          viewPreset: preset,
          activeFilterId: null,
        });
      },
    }),
    {
      name: 'siplan_filters_v2',
    }
  )
);
