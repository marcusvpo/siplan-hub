import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TeamAreaInfo, TeamMemberWithArea, TeamArea } from '@/types/conversion';

export function useTeamAreas() {
  const [areas, setAreas] = useState<TeamAreaInfo[]>([]);
  const [members, setMembers] = useState<TeamMemberWithArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAreas = useCallback(async () => {
    try {
      // Kept fetching team_areas for labels/colors config if needed
      // If team_areas is to be removed, we could hardcode this list
      const { data, error: fetchError } = await supabase
        .from('team_areas')
        .select('*')
        .eq('active', true)
        .order('label');

      if (fetchError) throw fetchError;

      const mapped: TeamAreaInfo[] = (data || []).map((area) => ({
        id: area.id,
        name: area.name as TeamArea,
        label: area.label,
        color: area.color ?? undefined,
        icon: area.icon ?? undefined,
        active: area.active ?? true,
        createdAt: new Date(area.created_at),
      }));

      setAreas(mapped);
    } catch (err) {
      console.error('Erro ao carregar áreas:', err);
    }
  }, []);

  const mapTeamToArea = (team: string | null): TeamArea => {
    switch (team) {
      case 'conversion': return 'conversion';
      case 'implementation': return 'implementation';
      case 'implementer': return 'implementation'; // Map implementer to implementation area
      case 'commercial': return 'commercial';
      case 'sd': 
      case 'infra': return 'support'; // Map SD and Infra to support area
      case 'support': // Legacy fallback
      case 'management': return 'support';
      default: return 'implementation'; // Default fallback
    }
  };

  const mapAreaToTeam = (area: TeamArea): string => {
    return area;
  };

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch from PROFILES instead of team_members
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, team')
        .order('full_name');

      if (fetchError) throw fetchError;

      const mapped: TeamMemberWithArea[] = (data || []).map((member) => ({
        id: member.id,
        name: member.full_name || member.email || 'Sem nome',
        email: member.email || '',
        role: member.role || 'user',
        area: mapTeamToArea(member.team),
        avatarUrl: undefined,
        active: true,
      }));

      setMembers(mapped);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar membros');
    } finally {
      setLoading(false);
    }
  }, []);

  const getMembersByArea = useCallback(
    (area: TeamArea) => {
      return members.filter((m) => m.area === area);
    },
    [members]
  );

  const updateMemberArea = useCallback(
    async (memberId: string, area: TeamArea) => {
      try {
        const teamValue = mapAreaToTeam(area);
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ team: teamValue })
          .eq('id', memberId);

        if (updateError) throw updateError;

        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, area } : m))
        );

        return true;
      } catch (err) {
        console.error('Erro ao atualizar área do membro:', err);
        return false;
      }
    },
    []
  );

  const createArea = useCallback(
    async (name: string, label: string, color?: string, icon?: string) => {
      // Keeping this as is for now, but note it touches team_areas table
      try {
        const { data, error: insertError } = await supabase
          .from('team_areas')
          .insert({ name, label, color, icon })
          .select()
          .single();

        if (insertError) throw insertError;

        await fetchAreas();
        return data?.id;
      } catch (err) {
        console.error('Erro ao criar área:', err);
        return null;
      }
    },
    [fetchAreas]
  );

  const getAreaStats = useCallback(() => {
    const stats: Record<TeamArea, number> = {
      implementation: 0,
      conversion: 0,
      commercial: 0,
      support: 0,
    };

    members.forEach((m) => {
      if (stats[m.area] !== undefined) {
        stats[m.area]++;
      }
    });

    return stats;
  }, [members]);

  useEffect(() => {
    fetchAreas();
    fetchMembers();
  }, [fetchAreas, fetchMembers]);

  return {
    areas,
    members,
    loading,
    error,
    getMembersByArea,
    updateMemberArea,
    createArea,
    getAreaStats,
    refetch: fetchMembers,
  };
}
