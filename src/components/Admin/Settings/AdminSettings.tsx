import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAdminSettings,
  ProjectHealthSettings,
} from "@/hooks/useAdminSettings";
import { Save } from "lucide-react";
import { useState, useEffect } from "react";

const STAGE_LABELS: Record<string, string> = {
  infra: "Infraestrutura",
  adherence: "Aderência",
  environment: "Ambiente",
  conversion: "Conversão",
  implementation: "Implantação",
  post: "Pós-Implantação",
};

export function AdminSettings() {
  const { healthSettings, loading, updateHealthSettings } = useAdminSettings();
  const [formData, setFormData] = useState<ProjectHealthSettings>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (healthSettings) {
      setFormData(healthSettings);
    }
  }, [healthSettings]);

  const handleChange = (key: string, value: string) => {
    const numValue = parseInt(value) || 0;
    const newSettings = { ...formData, [key]: numValue };
    setFormData(newSettings);
    setHasChanges(true);
  };

  const handleSave = () => {
    updateHealthSettings(formData);
    setHasChanges(false);
  };

  if (loading) {
    return <div>Carregando configurações...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Saúde dos Projetos</CardTitle>
          <CardDescription>
            Defina o tempo máximo (em dias) para que um projeto seja considerado
            saudável em cada etapa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(STAGE_LABELS).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`setting-${key}`}>{label} (dias)</Label>
                <Input
                  id={`setting-${key}`}
                  type="number"
                  min="0"
                  value={formData[key] || 0}
                  onChange={(e) => handleChange(key, e.target.value)}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={!hasChanges}>
              <Save className="mr-2 h-4 w-4" />
              Salvar Alterações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
