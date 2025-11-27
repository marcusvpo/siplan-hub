import { create } from 'zustand';
import { ProjectV2 } from '@/types/ProjectV2';

interface ProjectStore {
  selectedProject: ProjectV2 | null;
  setSelectedProject: (project: ProjectV2 | null) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  selectedProject: null,
  setSelectedProject: (project) => set({ selectedProject: project }),
}));

