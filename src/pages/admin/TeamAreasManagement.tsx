import { useState } from "react";
import { Users, Save, UserCog } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTeamAreas } from "@/hooks/useTeamAreas";
import { TEAM_AREA_LABELS, type TeamArea } from "@/types/conversion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const AREA_COLORS: Record<TeamArea, string> = {
  implementation: "bg-blue-100 text-blue-700 border-blue-300",
  conversion: "bg-purple-100 text-purple-700 border-purple-300",
  commercial: "bg-green-100 text-green-700 border-green-300",
  support: "bg-amber-100 text-amber-700 border-amber-300",
};

export default function TeamAreasManagement() {
  const { areas, members, loading, updateMemberArea, getAreaStats, refetch } =
    useTeamAreas();
  const [pendingChanges, setPendingChanges] = useState<
    Record<string, TeamArea>
  >({});

  const stats = getAreaStats();

  const handleAreaChange = (memberId: string, newArea: TeamArea) => {
    setPendingChanges((prev) => ({
      ...prev,
      [memberId]: newArea,
    }));
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  const saveChanges = async () => {
    let successCount = 0;
    for (const [memberId, area] of Object.entries(pendingChanges)) {
      const success = await updateMemberArea(memberId, area);
      if (success) successCount++;
    }

    if (successCount === Object.keys(pendingChanges).length) {
      toast.success(`${successCount} alteração(ões) salva(s) com sucesso!`);
      setPendingChanges({});
      refetch();
    } else {
      toast.error("Algumas alterações falharam. Tente novamente.");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const getMemberCurrentArea = (
    memberId: string,
    originalArea: TeamArea,
  ): TeamArea => {
    return pendingChanges[memberId] || originalArea;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
            <UserCog className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gerenciamento de Áreas</h1>
            <p className="text-sm text-muted-foreground">
              Atribuir membros da equipe às áreas de trabalho
            </p>
          </div>
        </div>
        {hasChanges && (
          <Button onClick={saveChanges}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Alterações ({Object.keys(pendingChanges).length})
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.keys(TEAM_AREA_LABELS) as TeamArea[]).map((area) => (
          <Card
            key={area}
            className={cn(
              "border-l-4",
              `border-l-${area === "implementation" ? "blue" : area === "conversion" ? "purple" : area === "commercial" ? "green" : "amber"}-500`,
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats[area]}</p>
                  <p className="text-xs text-muted-foreground">
                    {TEAM_AREA_LABELS[area]}
                  </p>
                </div>
                <Badge className={cn("border", AREA_COLORS[area])}>
                  {area.slice(0, 3).toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Available Areas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Áreas Disponíveis</CardTitle>
          <CardDescription>
            Áreas cadastradas no sistema para atribuição de membros
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {areas.map((area) => (
              <Badge
                key={area.id}
                variant="outline"
                className="py-2 px-4 text-sm"
                style={{
                  borderColor: area.color || undefined,
                  backgroundColor: area.color ? `${area.color}15` : undefined,
                }}
              >
                {area.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membros da Equipe
          </CardTitle>
          <CardDescription>
            Clique na área para alterar. As mudanças são salvas ao clicar em
            \"Salvar Alterações\".
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum membro cadastrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Área Atual</TableHead>
                  <TableHead>Nova Área</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const currentArea = getMemberCurrentArea(
                    member.id,
                    member.area,
                  );
                  const hasChange = pendingChanges[member.id] !== undefined;

                  return (
                    <TableRow
                      key={member.id}
                      className={hasChange ? "bg-primary/5" : undefined}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatarUrl} />
                            <AvatarFallback className="text-xs">
                              {getInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{member.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.email}
                      </TableCell>
                      <TableCell>{member.role}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "border",
                            AREA_COLORS[member.area],
                            hasChange && "opacity-50 line-through",
                          )}
                        >
                          {TEAM_AREA_LABELS[member.area]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={currentArea}
                          onValueChange={(v) =>
                            handleAreaChange(member.id, v as TeamArea)
                          }
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(TEAM_AREA_LABELS) as TeamArea[]).map(
                              (area) => (
                                <SelectItem key={area} value={area}>
                                  {TEAM_AREA_LABELS[area]}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
