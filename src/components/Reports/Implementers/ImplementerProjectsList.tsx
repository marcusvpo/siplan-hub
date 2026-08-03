import React, { useState, useMemo } from 'react';
import type { ImplementerInvolvement } from '@/hooks/useImplementerReport';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';
import { ImplementerProjectCard } from './ImplementerProjectCard';

interface ImplementerProjectsListProps {
  involvements: ImplementerInvolvement[];
}

type SortOption = 'clientName' | 'createdAt' | 'status' | 'progress';

export const ImplementerProjectsList: React.FC<ImplementerProjectsListProps> = ({ involvements }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('clientName');

  const filteredAndSorted = useMemo(() => {
    let result = [...involvements];

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter((inv) => 
        (inv.project.clientName || '').toLowerCase().includes(lowerTerm) ||
        (inv.project.ticketNumber || '').toLowerCase().includes(lowerTerm)
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'clientName':
          return (a.project.clientName || '').localeCompare(b.project.clientName || '');
        case 'createdAt':
          const dateA = new Date(a.project.createdAt || 0).getTime();
          const dateB = new Date(b.project.createdAt || 0).getTime();
          return dateB - dateA;
        case 'status':
          return (a.project.globalStatus || '').localeCompare(b.project.globalStatus || '');
        case 'progress':
          return (b.project.overallProgress || 0) - (a.project.overallProgress || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [involvements, searchTerm, sortBy]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Detalhes das Implantações</CardTitle>
        <CardDescription>{involvements.length} projetos encontrados</CardDescription>
        
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou ticket..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="clientName">Nome Cliente</SelectItem>
              <SelectItem value="createdAt">Data Criação (Mais recentes)</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="progress">Progresso (Maior-Menor)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 px-6 pb-6 overflow-hidden">
        {filteredAndSorted.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Nenhum projeto encontrado.
          </div>
        ) : (
          filteredAndSorted.length > 5 ? (
            <ScrollArea className="h-[600px] pr-4 -mr-4">
              <div className="space-y-4">
                {filteredAndSorted.map((inv) => (
                  <ImplementerProjectCard
                    key={inv.project.id}
                    project={inv.project}
                    roles={inv.roles}
                  />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="space-y-4">
              {filteredAndSorted.map((inv) => (
                <ImplementerProjectCard
                  key={inv.project.id}
                  project={inv.project}
                  roles={inv.roles}
                />
              ))}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
};
