import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TeamMember } from '@/types/team';

interface TeamStore {
  members: TeamMember[];
  addMember: (member: Omit<TeamMember, 'id'>) => void;
  updateMember: (id: string, member: Partial<TeamMember>) => void;
  removeMember: (id: string) => void;
  getMember: (id: string) => TeamMember | undefined;
}

export const useTeamStore = create<TeamStore>()(
  persist(
    (set, get) => ({
      members: [
        { id: '1', name: 'Ana Silva', role: 'Gerente de Projetos', email: 'ana.silva@siplan.com', active: true },
        { id: '2', name: 'Bruno Santos', role: 'Desenvolvedor', email: 'bruno.santos@siplan.com', active: true },
        { id: '3', name: 'Carlos Oliveira', role: 'Analista de Infra', email: 'carlos.oliveira@siplan.com', active: true },
        { id: '4', name: 'Daniela Souza', role: 'Consultora de Implantação', email: 'daniela.souza@siplan.com', active: true },
        { id: '5', name: 'Eduardo Lima', role: 'Suporte', email: 'eduardo.lima@siplan.com', active: true },
      ],
      addMember: (member) => set((state) => ({
        members: [...state.members, { ...member, id: crypto.randomUUID() }]
      })),
      updateMember: (id, member) => set((state) => ({
        members: state.members.map((m) => (m.id === id ? { ...m, ...member } : m))
      })),
      removeMember: (id) => set((state) => ({
        members: state.members.filter((m) => m.id !== id)
      })),
      getMember: (id) => get().members.find((m) => m.id === id),
    }),
    {
      name: 'team-storage',
    }
  )
);
