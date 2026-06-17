import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, ArrowUp, ArrowDown, Settings2, ListPlus, Image, FileText, Binary, CheckSquare, Type, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Visual representation of a form question
export interface VisualQuestion {
  id: string;
  title: string;
  type: "text" | "textarea" | "number" | "boolean" | "select" | "checkboxes" | "images" | "section" | "boolean_adherence" | "textarea_adherence";
  required: boolean;
  options?: string[]; // Used for select or checkboxes
}

interface VisualQuestionBuilderProps {
  questions: VisualQuestion[];
  onChange: (questions: VisualQuestion[]) => void;
  kind?: 'adherence' | 'commercial_checklist' | 'homologation_checklist';
}

export function VisualQuestionBuilder({
  questions,
  onChange,
  kind,
}: VisualQuestionBuilderProps) {
  const theme = {
    adherence: {
      text: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/5 dark:bg-amber-950/10",
      border: "border-amber-500/20 dark:border-amber-900/40",
      accent: "amber",
      borderLeft: "border-l-amber-500 dark:border-l-amber-600",
      button: "border-amber-200 text-amber-600 hover:bg-amber-50/50 dark:border-amber-900/40 dark:text-amber-400 dark:hover:bg-amber-950/20",
      addBtn: "hover:border-amber-500 hover:bg-amber-500/5 text-amber-600 dark:text-amber-400 hover:text-amber-700",
      inputFocus: "focus-visible:ring-amber-500",
      bulletBg: "bg-amber-500",
    },
    homologation_checklist: {
      text: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-500/5 dark:bg-indigo-950/10",
      border: "border-indigo-500/20 dark:border-indigo-900/40",
      accent: "indigo",
      borderLeft: "border-l-indigo-500 dark:border-l-indigo-600",
      button: "border-indigo-200 text-indigo-600 hover:bg-indigo-50/50 dark:border-indigo-900/40 dark:text-indigo-400 dark:hover:bg-indigo-950/20",
      addBtn: "hover:border-indigo-500 hover:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700",
      inputFocus: "focus-visible:ring-indigo-500",
      bulletBg: "bg-indigo-500",
    },
    commercial_checklist: {
      text: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-500/5 dark:bg-violet-950/10",
      border: "border-violet-500/20 dark:border-violet-900/40",
      accent: "violet",
      borderLeft: "border-l-violet-500 dark:border-l-violet-600",
      button: "border-violet-200 text-violet-600 hover:bg-violet-50/50 dark:border-violet-900/40 dark:text-violet-400 dark:hover:bg-violet-950/20",
      addBtn: "hover:border-violet-500 hover:bg-violet-500/5 text-violet-600 dark:text-violet-400 hover:text-violet-700",
      inputFocus: "focus-visible:ring-violet-500",
      bulletBg: "bg-violet-500",
    }
  }[kind || "adherence"];
  
  // Add a new blank question
  const handleAddQuestion = () => {
    const newQuestion: VisualQuestion = {
      id: Math.random().toString(36).substring(2, 9),
      title: "Nova Pergunta",
      type: "text",
      required: false,
    };
    onChange([...questions, newQuestion]);
  };

  // Remove a question
  const handleRemoveQuestion = (id: string) => {
    onChange(questions.filter((q) => q.id !== id));
  };

  // Update a question field
  const handleUpdateQuestion = (id: string, updates: Partial<VisualQuestion>) => {
    onChange(
      questions.map((q) => {
        if (q.id !== id) return q;
        
        // If type changed to select/checkboxes and there are no options, initialize them
        const updated = { ...q, ...updates };
        if (
          (updates.type === "select" || updates.type === "checkboxes") &&
          (!updated.options || updated.options.length === 0)
        ) {
          updated.options = ["Opção 1"];
        }

        return updated;
      })
    );
  };

  // Reorder questions
  const handleMoveQuestion = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === questions.length - 1) return;

    const newQuestions = [...questions];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    
    // Swap
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[targetIndex];
    newQuestions[targetIndex] = temp;

    onChange(newQuestions);
  };

  // OPTIONS MANAGEMENT (for enum / multiselect fields)
  const handleAddOption = (questionId: string) => {
    onChange(
      questions.map((q) => {
        if (q.id !== questionId) return q;
        const currentOptions = q.options || [];
        return {
          ...q,
          options: [...currentOptions, `Opção ${currentOptions.length + 1}`],
        };
      })
    );
  };

  const handleUpdateOption = (questionId: string, optionIndex: number, newValue: string) => {
    onChange(
      questions.map((q) => {
        if (q.id !== questionId) return q;
        const currentOptions = [...(q.options || [])];
        currentOptions[optionIndex] = newValue;
        return {
          ...q,
          options: currentOptions,
        };
      })
    );
  };

  const handleRemoveOption = (questionId: string, optionIndex: number) => {
    onChange(
      questions.map((q) => {
        if (q.id !== questionId) return q;
        const currentOptions = (q.options || []).filter((_, idx) => idx !== optionIndex);
        return {
          ...q,
          options: currentOptions.length > 0 ? currentOptions : ["Opção 1"], // keep at least 1 option
        };
      })
    );
  };

  const getIconForType = (type: VisualQuestion["type"]) => {
    switch (type) {
      case "section":
        return <Settings2 className={`h-4 w-4 ${theme.text}`} />;
      case "boolean_adherence":
        return <CheckSquare className="h-4 w-4 text-emerald-500" />;
      case "textarea_adherence":
        return <FileText className="h-4 w-4 text-sky-500" />;
      case "text":
        return <Type className="h-4 w-4 text-sky-500" />;
      case "textarea":
        return <FileText className="h-4 w-4 text-sky-500" />;
      case "number":
        return <Binary className="h-4 w-4 text-sky-500" />;
      case "boolean":
        return <CheckSquare className="h-4 w-4 text-emerald-500" />;
      case "select":
        return <ListPlus className={`h-4 w-4 ${theme.text}`} />;
      case "checkboxes":
        return <ListPlus className={`h-4 w-4 ${theme.text}`} />;
      case "images":
        return <Image className="h-4 w-4 text-rose-500" />;
      default:
        return <HelpCircle className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Questions list */}
      <div className="space-y-4">
        {questions.length === 0 ? (
          <div className="p-8 border border-dashed rounded-xl flex flex-col items-center justify-center text-center space-y-3 bg-muted/10">
            <Settings2 className="h-8 w-8 text-muted-foreground animate-pulse" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold">Nenhuma pergunta cadastrada</h4>
              <p className="text-xs text-muted-foreground max-w-xs">
                Clique no botão abaixo para adicionar a primeira pergunta ao formulário.
              </p>
            </div>
          </div>
        ) : (
          questions.map((q, index) => (
            <Card
              key={q.id}
              className={cn(
                "border-muted hover:border-muted-foreground/30 shadow-sm hover:shadow group overflow-hidden transition-all duration-200 bg-card/60 relative",
                q.type === "section"
                  ? `${theme.border} ${theme.bg} border-l-4 ${theme.borderLeft}`
                  : "border-l-4 border-l-muted-foreground/25"
              )}
            >
              <CardContent className="p-5 space-y-4">
                {/* Header row: Question Title & Reordering */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 w-full sm:max-w-md">
                    <span className="text-xs font-bold bg-muted px-2 py-1 rounded border text-muted-foreground min-w-[24px] text-center">
                      {index + 1}
                    </span>
                    <Input
                      value={q.title}
                      onChange={(e) => handleUpdateQuestion(q.id, { title: e.target.value })}
                      placeholder={q.type === "section" ? "Título da Seção (Ex: 1. Setor de Firmas)" : "Título da Pergunta"}
                      className={cn(
                        "font-bold text-sm bg-card border-muted-foreground/30 focus-visible:ring-primary h-9 flex-1",
                        q.type === "section" ? `${theme.text} ${theme.inputFocus}` : ""
                      )}
                    />
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1.5 ml-auto sm:ml-0 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveQuestion(index, "up")}
                      disabled={index === 0}
                      className="h-8 w-8 hover:bg-muted"
                      title="Mover para Cima"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveQuestion(index, "down")}
                      disabled={index === questions.length - 1}
                      className="h-8 w-8 hover:bg-muted"
                      title="Mover para Baixo"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <div className="h-4 w-px bg-muted mx-1" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveQuestion(q.id)}
                      className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                      title="Excluir Pergunta"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Configuration row: Type select & Required Toggle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 bg-muted/10 p-3.5 rounded-lg border">
                  {/* Type Selector */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Tipo de Pergunta</Label>
                    <Select
                      value={q.type}
                      onValueChange={(val) =>
                        handleUpdateQuestion(q.id, { type: val as VisualQuestion["type"] })
                      }
                    >
                      <SelectTrigger className="h-9 bg-card border-muted-foreground/30">
                        <div className="flex items-center gap-2">
                          {getIconForType(q.type)}
                          <SelectValue placeholder="Selecione o tipo..." />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="section">Cabeçalho de Seção</SelectItem>
                        <SelectItem value="boolean_adherence">Pergunta Aderência (Sim/Não)</SelectItem>
                        <SelectItem value="textarea_adherence">Pergunta Aderência (Texto Livre)</SelectItem>
                        <SelectItem value="text">Texto Curto (Input)</SelectItem>
                        <SelectItem value="textarea">Texto Longo (Textarea)</SelectItem>
                        <SelectItem value="number">Número (Inteiro/Decimal)</SelectItem>
                        <SelectItem value="boolean">Sim / Não (Interruptor)</SelectItem>
                        <SelectItem value="select">Seleção Única (Dropdown)</SelectItem>
                        <SelectItem value="checkboxes">Múltipla Escolha (Caixas de Seleção)</SelectItem>
                        <SelectItem value="images">Galeria de Imagens (Upload de fotos)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Required Switch */}
                  {q.type !== "section" && (
                    <div className="flex items-center justify-between sm:justify-end sm:gap-4 py-2 sm:py-0">
                      <div className="flex flex-col">
                        <Label htmlFor={`req-${q.id}`} className="text-xs font-semibold text-muted-foreground cursor-pointer">
                          Obrigatória?
                        </Label>
                        <span className="text-[10px] text-muted-foreground/75 mt-0.5">Torna o preenchimento mandatório</span>
                      </div>
                      <Switch
                        id={`req-${q.id}`}
                        checked={q.required}
                        onCheckedChange={(checked) => handleUpdateQuestion(q.id, { required: checked })}
                      />
                    </div>
                  )}
                </div>

                {/* Options section (renders if type is select or checkboxes) */}
                {(q.type === "select" || q.type === "checkboxes") && (
                  <div className={`pl-4 border-l-2 ${theme.border} space-y-2`}>
                    <Label className={`text-xs font-bold ${theme.text} tracking-wide uppercase flex items-center gap-1`}>
                      Opções da Pergunta
                    </Label>
                    <div className="space-y-2 max-w-md">
                      {(q.options || []).map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <span className={cn("h-1.5 w-1.5 rounded-full opacity-50 shrink-0", theme.bulletBg)} />
                          <Input
                            value={opt}
                            onChange={(e) => handleUpdateOption(q.id, optIdx, e.target.value)}
                            placeholder={`Opção ${optIdx + 1}`}
                            className={cn("h-8 text-xs bg-card border-muted-foreground/20", theme.inputFocus)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={(q.options || []).length <= 1}
                            onClick={() => handleRemoveOption(q.id, optIdx)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Remover Opção"
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddOption(q.id)}
                        className={cn("h-8 text-[11px] gap-1 px-3 border border-muted hover:bg-muted/50", theme.button)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Adicionar Opção
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add question button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleAddQuestion}
        className={cn("w-full py-6 border-dashed border-2 transition-all text-xs font-bold gap-2 hover:bg-muted/50", theme.addBtn)}
      >
        <Plus className="h-4 w-4" />
        Adicionar Nova Pergunta
      </Button>
    </div>
  );
}

// SERIALIZATION HELPERS
export function convertVisualToJSONSchema(
  questions: VisualQuestion[],
  title: string,
  description: string
) {
  const hasAdherence = questions.some(q => q.type === "section" || q.type === "boolean_adherence" || q.type === "textarea_adherence");

  if (hasAdherence) {
    const properties: Record<string, any> = {};
    let currentSectionKey = "";
    let currentSectionTitle = "";
    let currentSectionProps: Record<string, any> = {};
    let sectionCount = 0;

    const saveCurrentSection = () => {
      if (currentSectionKey) {
        properties[currentSectionKey] = {
          type: "object",
          title: currentSectionTitle,
          properties: currentSectionProps,
        };
      }
    };

    questions.forEach((q) => {
      if (q.type === "section") {
        saveCurrentSection();
        sectionCount++;
        currentSectionKey = `sec_${sectionCount}`;
        currentSectionTitle = q.title;
        currentSectionProps = {};
      } else if (q.type === "boolean_adherence" || q.type === "textarea_adherence") {
        if (!currentSectionKey) {
          sectionCount++;
          currentSectionKey = `sec_${sectionCount}`;
          currentSectionTitle = "Geral";
          currentSectionProps = {};
        }

        const isText = q.type === "textarea_adherence";
        let qKey = `q_${sectionCount}_${Object.keys(currentSectionProps).length + 1}`;

        if (isText) {
          currentSectionProps[qKey] = {
            type: "object",
            title: q.title,
            properties: {
              valor: { type: "string", title: "Resposta" },
              impacto: { type: "boolean", title: "Possui algum impacto?", default: false },
              detalhes: { type: "string", title: "Detalhes do Impacto" }
            }
          };
        } else {
          currentSectionProps[qKey] = {
            type: "object",
            title: q.title,
            properties: {
              utiliza: { type: "boolean", title: "Utiliza?", default: false },
              impacto: { type: "boolean", title: "Possui algum impacto?", default: false },
              detalhes: { type: "string", title: "Detalhes do Impacto" }
            }
          };
        }
      } else {
        // Flat root-level question
        const qKey = q.id.startsWith("q_") ? q.id : `q_${q.id}`;
        if (q.type === "text") {
          properties[qKey] = { type: "string", title: q.title };
        } else if (q.type === "textarea") {
          properties[qKey] = { type: "string", title: q.title };
        } else if (q.type === "number") {
          properties[qKey] = { type: "number", title: q.title };
        } else if (q.type === "boolean") {
          properties[qKey] = { type: "boolean", title: q.title, default: false };
        } else if (q.type === "select") {
          properties[qKey] = {
            type: "string",
            title: q.title,
            enum: q.options && q.options.length > 0 ? q.options : ["Opção 1"],
          };
        } else if (q.type === "checkboxes") {
          properties[qKey] = {
            type: "array",
            title: q.title,
            items: {
              type: "string",
              enum: q.options && q.options.length > 0 ? q.options : ["Opção 1"],
            },
            uniqueItems: true,
          };
        } else if (q.type === "images") {
          properties[qKey] = {
            type: "array",
            title: q.title,
            items: {
              type: "string",
            },
          };
        }
      }
    });

    saveCurrentSection();

    const required: string[] = [];
    questions.forEach((q) => {
      if (q.required && q.type !== "section" && q.type !== "boolean_adherence" && q.type !== "textarea_adherence") {
        const qKey = q.id.startsWith("q_") ? q.id : `q_${q.id}`;
        required.push(qKey);
      }
    });

    return {
      title,
      description,
      type: "object",
      required: required.length > 0 ? required : undefined,
      properties,
    };
  }

  // Flat Schema fallback
  const properties: Record<string, any> = {};
  const required: string[] = [];

  questions.forEach((q) => {
    const key = `q_${q.id}`;

    if (q.required) {
      required.push(key);
    }

    if (q.type === "text") {
      properties[key] = {
        type: "string",
        title: q.title,
      };
    } else if (q.type === "textarea") {
      properties[key] = {
        type: "string",
        title: q.title,
      };
    } else if (q.type === "number") {
      properties[key] = {
        type: "number",
        title: q.title,
      };
    } else if (q.type === "boolean") {
      properties[key] = {
        type: "boolean",
        title: q.title,
        default: false,
      };
    } else if (q.type === "select") {
      properties[key] = {
        type: "string",
        title: q.title,
        enum: q.options && q.options.length > 0 ? q.options : ["Opção 1"],
      };
    } else if (q.type === "checkboxes") {
      properties[key] = {
        type: "array",
        title: q.title,
        items: {
          type: "string",
          enum: q.options && q.options.length > 0 ? q.options : ["Opção 1"],
        },
        uniqueItems: true,
      };
    } else if (q.type === "images") {
      properties[key] = {
        type: "array",
        title: q.title,
        items: {
          type: "string",
        },
      };
    }
  });

  return {
    title,
    description,
    type: "object",
    required: required.length > 0 ? required : undefined,
    properties,
  };
}

export function convertVisualToUISchema(questions: VisualQuestion[]) {
  const hasAdherence = questions.some(q => q.type === "section" || q.type === "boolean_adherence" || q.type === "textarea_adherence");

  if (hasAdherence) {
    const uiSchema: Record<string, any> = {};
    let sectionCount = 0;
    let currentSectionKey = "";
    let currentSectionUi: Record<string, any> = {};

    const saveCurrentSection = () => {
      if (currentSectionKey) {
        uiSchema[currentSectionKey] = currentSectionUi;
      }
    };

    questions.forEach((q) => {
      if (q.type === "section") {
        saveCurrentSection();
        sectionCount++;
        currentSectionKey = `sec_${sectionCount}`;
        currentSectionUi = {};
      } else if (q.type === "boolean_adherence" || q.type === "textarea_adherence") {
        if (!currentSectionKey) {
          sectionCount++;
          currentSectionKey = `sec_${sectionCount}`;
          currentSectionUi = {};
        }

        const isText = q.type === "textarea_adherence";
        const qIdx = Object.keys(currentSectionUi).length + 1;
        const qKey = `q_${sectionCount}_${qIdx}`;

        if (isText) {
          let placeholder = "Informe o modelo/layout utilizado...";
          if (q.title.toLowerCase().includes("cnab")) {
            placeholder = "Informe o modelo/layout utilizado (Ex: CNAB 240 / CNAB 400) e o banco correspondente:";
          } else if (q.title.toLowerCase().includes("fiscal")) {
            placeholder = "A serventia utiliza emissor próprio ou nacional? Detalhe o modelo de emissão atual:";
          } else if (q.title.toLowerCase().includes("espaço")) {
            placeholder = "Caminho exato (diretório/unidade) onde estão salvas no servidor atual:";
          }

          currentSectionUi[qKey] = {
            "ui:field": "adherenceQuestion",
            valor: {
              "ui:widget": "textarea",
              "ui:options": { placeholder }
            }
          };
        } else {
          currentSectionUi[qKey] = {
            "ui:field": "adherenceQuestion"
          };
        }
      } else {
        const qKey = q.id.startsWith("q_") ? q.id : `q_${q.id}`;
        if (q.type === "textarea") {
          uiSchema[qKey] = { "ui:widget": "textarea" };
        } else if (q.type === "checkboxes") {
          uiSchema[qKey] = { "ui:widget": "checkboxes" };
        } else if (q.type === "images") {
          uiSchema[qKey] = { "ui:widget": "imageUpload" };
        } else if (q.type === "boolean") {
          uiSchema[qKey] = { "ui:widget": "switch" };
        }
      }
    });

    saveCurrentSection();
    return uiSchema;
  }

  // Flat uiSchema fallback
  const uiSchema: Record<string, any> = {};

  questions.forEach((q) => {
    const key = `q_${q.id}`;

    if (q.type === "textarea") {
      uiSchema[key] = {
        "ui:widget": "textarea",
      };
    } else if (q.type === "checkboxes") {
      uiSchema[key] = {
        "ui:widget": "checkboxes",
      };
    } else if (q.type === "images") {
      uiSchema[key] = {
        "ui:widget": "imageUpload",
      };
    } else if (q.type === "boolean") {
      uiSchema[key] = {
        "ui:widget": "switch",
      };
    }
  });

  return uiSchema;
}

export function parseJSONSchemaToVisual(schema: any, uiSchema: any): VisualQuestion[] {
  if (!schema || !schema.properties) return [];

  const questions: VisualQuestion[] = [];
  const requiredList = schema.required || [];

  // Check if it is a nested section schema (e.g. Orion TN template)
  const isNested = Object.keys(schema.properties).some(key => {
    const prop = schema.properties[key];
    return prop && prop.type === "object" && prop.properties && !("impacto" in prop.properties);
  });

  if (isNested) {
    Object.keys(schema.properties).forEach((secKey) => {
      const section = schema.properties[secKey];
      if (!section) return;

      const isSec = section.type === "object" && section.properties && !("impacto" in section.properties);

      if (isSec) {
        // Add section title as a virtual question of type "section"
        questions.push({
          id: secKey,
          title: section.title || "Cabeçalho de Seção",
          type: "section",
          required: false,
        });

        // Add each nested question
        Object.keys(section.properties).forEach((qKey) => {
          const qProp = section.properties[qKey];
          if (!qProp || !qProp.properties) return;

          const isText = "valor" in qProp.properties;
          questions.push({
            id: `${secKey}_${qKey}`,
            title: qProp.title || "Pergunta sem título",
            type: isText ? "textarea_adherence" : "boolean_adherence",
            required: false,
          });
        });
      } else {
        // Flat root-level question
        const prop = section;
        const ui = uiSchema?.[secKey] || {};
        const id = secKey.startsWith("q_") ? secKey.replace("q_", "") : secKey;

        let type: VisualQuestion["type"] = "text";
        let options: string[] = [];

        if (prop.type === "boolean") {
          type = "boolean";
        } else if (prop.type === "number" || prop.type === "integer") {
          type = "number";
        } else if (prop.type === "string") {
          if (ui["ui:widget"] === "textarea") {
            type = "textarea";
          } else if (prop.enum) {
            type = "select";
            options = [...prop.enum];
          } else {
            type = "text";
          }
        } else if (prop.type === "array") {
          if (ui["ui:widget"] === "imageUpload" || ui["ui:widget"] === "file") {
            type = "images";
          } else if (ui["ui:widget"] === "checkboxes" || prop.items?.enum) {
            type = "checkboxes";
            options = prop.items?.enum ? [...prop.items.enum] : [];
          } else {
            type = "checkboxes";
          }
        }

        questions.push({
          id,
          title: prop.title || "Pergunta sem título",
          type,
          required: requiredList.includes(secKey),
          options: options.length > 0 ? options : undefined,
        });
      }
    });

    return questions;
  }

  // Fallback flat parsing
  Object.keys(schema.properties).forEach((key) => {
    const prop = schema.properties[key];
    const ui = uiSchema?.[key] || {};
    const id = key.startsWith("q_") ? key.replace("q_", "") : key;

    let type: VisualQuestion["type"] = "text";
    let options: string[] = [];

    if (prop.type === "boolean") {
      type = "boolean";
    } else if (prop.type === "number" || prop.type === "integer") {
      type = "number";
    } else if (prop.type === "string") {
      if (ui["ui:widget"] === "textarea") {
        type = "textarea";
      } else if (prop.enum) {
        type = "select";
        options = [...prop.enum];
      } else {
        type = "text";
      }
    } else if (prop.type === "array") {
      if (ui["ui:widget"] === "imageUpload" || ui["ui:widget"] === "file") {
        type = "images";
      } else if (ui["ui:widget"] === "checkboxes" || prop.items?.enum) {
        type = "checkboxes";
        options = prop.items?.enum ? [...prop.items.enum] : [];
      } else {
        type = "checkboxes";
      }
    }

    questions.push({
      id,
      title: prop.title || "Pergunta sem título",
      type,
      required: requiredList.includes(key),
      options: options.length > 0 ? options : undefined,
    });
  });

  return questions;
}
