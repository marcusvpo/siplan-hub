import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedFilter {
  id: string;
  name: string;
  filters: FilterState;
}

export interface FilterState {
  searchQuery: string;
  status: string;
  healthScore: string;
  // Add other filters as needed
}

interface FilterStore extends FilterState {
  savedFilters: SavedFilter[];
  
  // Actions
  setSearchQuery: (query: string) => void;
  setStatus: (status: string) => void;
  setHealthScore: (score: string) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  saveFilter: (name: string) => void;
  loadFilter: (id: string) => void;
  deleteFilter: (id: string) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterStore>()(
  persist(
    (set, get) => ({
      searchQuery: "",
      status: "all",
      healthScore: "all",
      savedFilters: [],

      setSearchQuery: (query) => set({ searchQuery: query }),
      setStatus: (status) => set({ status }),
      setHealthScore: (score) => set({ healthScore: score }),
      
      setFilters: (filters) => set((state) => ({ ...state, ...filters })),

      saveFilter: (name) => {
        const { searchQuery, status, healthScore, savedFilters } = get();
        const newFilter: SavedFilter = {
          id: crypto.randomUUID(),
          name,
          filters: { searchQuery, status, healthScore },
        };
        set({ savedFilters: [...savedFilters, newFilter] });
      },

      loadFilter: (id) => {
        const filter = get().savedFilters.find((f) => f.id === id);
        if (filter) {
          set({ ...filter.filters });
        }
      },

      deleteFilter: (id) => {
        set({ savedFilters: get().savedFilters.filter((f) => f.id !== id) });
      },

      resetFilters: () => set({ searchQuery: "", status: "all", healthScore: "all" }),
    }),
    {
      name: 'siplan_filters', // unique name for localStorage key
    }
  )
);
