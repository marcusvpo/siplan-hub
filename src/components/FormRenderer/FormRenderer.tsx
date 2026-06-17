import React from "react";
import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";
import {
  WidgetProps,
  FieldTemplateProps,
  ObjectFieldTemplateProps,
  ArrayFieldTemplateProps,
  FieldProps,
} from "@rjsf/utils";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { UploadCloud, X, Loader2, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Custom Field Template to render Shadcn labels and error messages
const CustomFieldTemplate = (props: FieldTemplateProps) => {
  const {
    id,
    classNames,
    label,
    help,
    required,
    description,
    errors,
    children,
    displayLabel,
    disabled,
    readonly,
  } = props;

  return (
    <div className={cn("space-y-1.5 py-1", classNames)}>
      {displayLabel && label && (
        <Label
          htmlFor={id}
          className={cn(
            "text-sm font-semibold tracking-wide text-foreground flex items-center gap-1",
            disabled || readonly ? "opacity-60" : ""
          )}
        >
          {label}
          {required && <span className="text-destructive font-bold">*</span>}
        </Label>
      )}
      {description && (
        <div className="text-xs text-muted-foreground/80 leading-normal">
          {description}
        </div>
      )}
      <div className="relative mt-1">{children}</div>
      {errors && (
        <p className="text-xs text-rose-500 font-medium mt-1 animate-in fade-in slide-in-from-top-1">
          {errors}
        </p>
      )}
      {help && <p className="text-[11px] text-muted-foreground mt-1">{help}</p>}
    </div>
  );
};

// Custom Object Field Template to render collapsible card-like layouts or nice sections
const CustomObjectFieldTemplate = (props: ObjectFieldTemplateProps) => {
  const { title, description, properties } = props;
  return (
    <div className="space-y-4">
      {title && (
        <div className="border-b pb-2 mb-3">
          <h3 className="text-base font-bold tracking-tight text-foreground/90">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {properties.map((element) => {
          // Check if field is full width
          const isFullWidth =
            element.content.props?.schema?.type === "object" ||
            element.content.props?.schema?.type === "array" ||
            element.content.props?.uiSchema?.["ui:widget"] === "textarea" ||
            element.content.props?.uiSchema?.["ui:options"]?.["fullWidth"] === true;

          return (
            <div
              key={element.name}
              className={cn(isFullWidth ? "col-span-1 md:col-span-2" : "col-span-1")}
            >
              {element.content}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Custom Array Field Template
interface ArrayFieldTemplateItem {
  key: string;
  children: React.ReactNode;
  hasRemove: boolean;
  onDropIndexClick: (index: number) => (event: unknown) => void;
}

const CustomArrayFieldTemplate = (props: ArrayFieldTemplateProps) => {
  const { title, items, canAdd, onAddClick, disabled, readonly } = props;
  const description = props.schema?.description;
  const templateItems = (items as unknown) as ArrayFieldTemplateItem[];

  return (
    <div className="space-y-3 p-4 bg-muted/20 border rounded-xl">
      {title && (
        <div className="flex justify-between items-center mb-1">
          <div>
            <h4 className="text-sm font-bold text-foreground">{title}</h4>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {canAdd && !(disabled || readonly) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddClick}
              className="h-8 px-3 text-xs"
            >
              + Adicionar
            </Button>
          )}
        </div>
      )}
      <div className="space-y-3">
        {templateItems.map((element, index) => (
          <div
            key={element.key}
            className="flex items-start gap-3 p-3 bg-card border rounded-lg shadow-sm relative group"
          >
            <div className="flex-1">{element.children}</div>
            {element.hasRemove && !(disabled || readonly) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={element.onDropIndexClick(index)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                title="Remover Item"
              >
                ✕
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// WIDGETS
const CustomTextWidget = (props: WidgetProps) => {
  const { id, required, readonly, disabled, value, onChange, placeholder, options } = props;
  return (
    <Input
      id={id}
      value={value === undefined || value === null ? "" : value}
      required={required}
      disabled={disabled}
      readOnly={readonly}
      placeholder={placeholder || (options?.placeholder as string)}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
      className="bg-card h-10 border-muted-foreground/20 focus-visible:ring-primary focus-visible:border-primary"
    />
  );
};

const CustomNumberWidget = (props: WidgetProps) => {
  const { id, required, readonly, disabled, value, onChange, placeholder, options } = props;
  return (
    <Input
      id={id}
      type="number"
      value={value === undefined || value === null ? "" : value}
      required={required}
      disabled={disabled}
      readOnly={readonly}
      placeholder={placeholder || (options?.placeholder as string)}
      onChange={(e) => {
        const val = e.target.value;
        onChange(val === "" ? undefined : Number(val));
      }}
      className="bg-card h-10 border-muted-foreground/20"
    />
  );
};

const CustomTextareaWidget = (props: WidgetProps) => {
  const { id, required, readonly, disabled, value, onChange, placeholder, options } = props;
  return (
    <Textarea
      id={id}
      value={value === undefined || value === null ? "" : value}
      required={required}
      disabled={disabled}
      readOnly={readonly}
      placeholder={placeholder || (options?.placeholder as string)}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
      className="bg-card min-h-[100px] border-muted-foreground/20"
    />
  );
};

const CustomCheckboxWidget = (props: WidgetProps) => {
  const { id, required, readonly, disabled, value, onChange, label } = props;
  return (
    <div className="flex items-center space-x-2 py-1">
      <Checkbox
        id={id}
        checked={!!value}
        required={required}
        disabled={disabled || readonly}
        onCheckedChange={(checked) => onChange(checked === true)}
      />
      <Label
        htmlFor={id}
        className={cn(
          "text-sm font-medium cursor-pointer leading-none",
          disabled || readonly ? "opacity-60 cursor-not-allowed" : ""
        )}
      >
        {label}
      </Label>
    </div>
  );
};

const CustomSwitchWidget = (props: WidgetProps) => {
  const { id, required, readonly, disabled, value, onChange, label } = props;
  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 border rounded-lg py-2">
      <Label
        htmlFor={id}
        className={cn(
          "text-sm font-medium cursor-pointer leading-none pr-4",
          disabled || readonly ? "opacity-60 cursor-not-allowed" : ""
        )}
      >
        {label}
      </Label>
      <Switch
        id={id}
        checked={!!value}
        required={required}
        disabled={disabled || readonly}
        onCheckedChange={(checked) => onChange(checked)}
      />
    </div>
  );
};

const CustomSelectWidget = (props: WidgetProps) => {
  const { id, required, readonly, disabled, value, onChange, placeholder, options } = props;
  const enumOptions = (options.enumOptions || []) as { value: unknown; label: string }[];
  
  return (
    <Select
      value={value === undefined || value === null ? "" : String(value)}
      onValueChange={(val) => {
        // Find matching original option to preserve type if it is boolean/number
        const matched = enumOptions.find(o => String(o.value) === val);
        onChange(matched ? matched.value : val);
      }}
      disabled={disabled || readonly}
    >
      <SelectTrigger id={id} className="h-10 bg-card border-muted-foreground/20">
        <SelectValue placeholder={placeholder || "Selecione uma opção..."} />
      </SelectTrigger>
      <SelectContent>
        {enumOptions.map((option, idx) => (
          <SelectItem key={idx} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const CustomRadioWidget = (props: WidgetProps) => {
  const { id, required, readonly, disabled, value, onChange, options } = props;
  const enumOptions = (options.enumOptions || []) as { value: unknown; label: string }[];

  return (
    <RadioGroup
      value={value === undefined || value === null ? "" : String(value)}
      onValueChange={(val) => {
        const matched = enumOptions.find(o => String(o.value) === val);
        onChange(matched ? matched.value : val);
      }}
      disabled={disabled || readonly}
      className="flex flex-col gap-2 pt-1"
    >
      {enumOptions.map((option, idx) => {
        const optionId = `${id}-${idx}`;
        return (
          <div key={idx} className="flex items-center space-x-2">
            <RadioGroupItem value={String(option.value)} id={optionId} />
            <Label htmlFor={optionId} className="text-sm font-medium cursor-pointer">
              {option.label}
            </Label>
          </div>
        );
      })}
    </RadioGroup>
  );
};

// Custom Image Upload Widget (Supabase Storage)
const CustomImageUploadWidget = (props: WidgetProps) => {
  const { id, readonly, disabled, value, onChange, formContext } = props;
  const { toast } = useToast();
  const [isUploading, setIsUploading] = React.useState(false);
  const projectId = formContext?.projectId || "global";

  const urls = Array.isArray(value) ? value : [];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newUrls = [...urls];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate it's an image
        if (!file.type.startsWith("image/")) {
          toast({
            title: "Arquivo inválido",
            description: `O arquivo ${file.name} não é uma imagem válida.`,
            variant: "destructive"
          });
          continue;
        }

        const fileExt = file.name.split(".").pop();
        const randomName = Math.random().toString(36).substring(2, 15);
        const fileName = `${randomName}.${fileExt}`;
        const filePath = `${projectId}/${id}/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("form-images")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Retrieve public URL
        const { data: { publicUrl } } = supabase.storage
          .from("form-images")
          .getPublicUrl(filePath);

        newUrls.push(publicUrl);
      }

      onChange(newUrls);
      toast({
        title: "Sucesso",
        description: `${files.length} foto(s) enviada(s) com sucesso.`,
        className: "bg-green-500 text-white border-green-600"
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Não foi possível enviar a imagem.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset input value to allow selecting same file again if deleted
      e.target.value = "";
    }
  };

  const handleDeleteImage = async (urlToDelete: string) => {
    try {
      const bucketUrlPart = "/storage/v1/object/public/form-images/";
      const index = urlToDelete.indexOf(bucketUrlPart);
      if (index !== -1) {
        const filePath = urlToDelete.substring(index + bucketUrlPart.length);
        
        const { error: removeError } = await supabase.storage
          .from("form-images")
          .remove([filePath]);

        if (removeError) {
          console.warn("Could not delete from storage bucket:", removeError);
        }
      }

      const updatedUrls = urls.filter(u => u !== urlToDelete);
      onChange(updatedUrls);
      toast({
        title: "Foto excluída",
        description: "A imagem foi removida com sucesso.",
      });
    } catch (err) {
      console.error("Error deleting file:", err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Thumbnail grid */}
      {urls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {urls.map((url, idx) => (
            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border group shadow-sm bg-muted/20">
              <img 
                src={url} 
                alt={`Imagem ${idx + 1}`} 
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              {!(disabled || readonly) && (
                <button
                  type="button"
                  onClick={() => handleDeleteImage(url)}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-150"
                  title="Excluir Imagem"
                >
                  <X className="h-6 w-6 text-white hover:text-rose-500 hover:scale-110 transition-transform" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button area */}
      {!(disabled || readonly) && (
        <div className="relative">
          <input
            type="file"
            id={`file-upload-${id}`}
            accept="image/*"
            multiple
            disabled={isUploading}
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className={cn(
            "border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2",
            isUploading ? "bg-muted/40 opacity-70 cursor-not-allowed" : "bg-muted/10 cursor-pointer"
          )}>
            {isUploading ? (
              <>
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                <span className="text-xs font-semibold text-muted-foreground">Enviando imagens...</span>
              </>
            ) : (
              <>
                <UploadCloud className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-foreground">Clique ou arraste fotos aqui</span>
                  <p className="text-[10px] text-muted-foreground/80">Formatos suportados: PNG, JPG, GIF. Múltiplos arquivos permitidos.</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Gather all custom widgets
const customWidgets = {
  TextWidget: CustomTextWidget,
  TextareaWidget: CustomTextareaWidget,
  CheckboxWidget: CustomCheckboxWidget,
  CheckboxesWidget: CustomCheckboxWidget,
  SelectWidget: CustomSelectWidget,
  RadioWidget: CustomRadioWidget,
  altNumberWidget: CustomNumberWidget,
  integerWidget: CustomNumberWidget,
  numberWidget: CustomNumberWidget,
  switch: CustomSwitchWidget,
  imageUpload: CustomImageUploadWidget,
};

// Custom Adherence Question Field
const AdherenceQuestionField = (props: FieldProps) => {
  const { schema, formData, onChange, readonly, disabled, fieldPathId } = props;

  const utiliza = formData?.utiliza ?? false;
  const valor = formData?.valor ?? "";
  const detalhes = formData?.detalhes ?? "";
  
  // Resolve impact level: defaults to "NÃO". If not present, fall back to "SIM" if currently marked as having impact.
  const nivel_impacto = formData?.nivel_impacto ?? (formData?.impacto ? "SIM" : "NÃO");
  const impacto = nivel_impacto === "SIM" || nivel_impacto === "ATENÇÃO";
  const isText = schema.properties && "valor" in schema.properties;

  const handleUpdate = (updatedFields: Partial<{ utiliza: boolean; valor: string; detalhes: string; nivel_impacto: string; impacto: boolean }>) => {
    if (readonly || disabled) return;
    
    const currentUtiliza = "utiliza" in updatedFields ? updatedFields.utiliza : utiliza;
    const currentValor = "valor" in updatedFields ? updatedFields.valor : valor;
    const currentDetalhes = "detalhes" in updatedFields ? updatedFields.detalhes : detalhes;
    const currentNivelImpacto = "nivel_impacto" in updatedFields ? updatedFields.nivel_impacto! : nivel_impacto;
    const currentImpacto = currentNivelImpacto === "SIM" || currentNivelImpacto === "ATENÇÃO";

    onChange(
      {
        utiliza: currentUtiliza,
        valor: currentValor,
        detalhes: currentDetalhes,
        nivel_impacto: currentNivelImpacto,
        impacto: currentImpacto,
      },
      fieldPathId.path
    );
  };

  return (
    <div
      className={cn(
        "p-4 rounded-xl border transition-all duration-200 space-y-4 shadow-sm my-2",
        nivel_impacto === "SIM"
          ? "bg-rose-50/40 border-rose-200 dark:bg-rose-950/10 dark:border-rose-900/50"
          : nivel_impacto === "ATENÇÃO"
            ? "bg-amber-50/40 border-amber-200 dark:bg-amber-950/10 dark:border-amber-900/50"
            : (utiliza || (isText && valor))
              ? "bg-emerald-50/20 border-emerald-200/60 dark:bg-emerald-950/5 dark:border-emerald-900/30"
              : "bg-card border-border hover:border-muted-foreground/30"
      )}
    >
      {/* Title & Status Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="font-semibold text-sm text-foreground/90 leading-snug">
          {schema.title}
        </div>
        <span className={cn(
          "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 border",
          nivel_impacto === "SIM"
            ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
            : nivel_impacto === "ATENÇÃO"
              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
        )}>
          {nivel_impacto === "SIM" 
            ? "Não Aderente" 
            : nivel_impacto === "ATENÇÃO" 
              ? "Ponto de Atenção" 
              : "Aderente"}
        </span>
      </div>

      {/* Answer Area & Observations Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left column: Answer */}
        <div className="space-y-1.5">
          {isText ? (
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Resposta:</Label>
              <Textarea
                value={valor}
                onChange={(e) => handleUpdate({ valor: e.target.value })}
                disabled={disabled || readonly}
                className="bg-background text-xs min-h-[60px] border-muted-foreground/20 focus-visible:ring-primary focus-visible:border-primary"
                placeholder="Digite a resposta..."
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Utiliza?</Label>
              {readonly || disabled ? (
                <span className={cn(
                  "inline-block px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider border",
                  utiliza 
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                    : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                )}>
                  {utiliza ? "Sim" : "Não"}
                </span>
              ) : (
                <div className="flex rounded-md overflow-hidden border border-muted-foreground/25 w-fit bg-background">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUpdate({ utiliza: true })}
                    className={cn(
                      "h-8 px-4 rounded-none text-xs font-bold transition-colors border-r border-muted-foreground/25",
                      utiliza 
                        ? "bg-emerald-600 text-white hover:bg-emerald-600 hover:text-white" 
                        : "bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    Sim
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUpdate({ utiliza: false })}
                    className={cn(
                      "h-8 px-4 rounded-none text-xs font-bold transition-colors",
                      !utiliza 
                        ? "bg-rose-600 text-white hover:bg-rose-600 hover:text-white" 
                        : "bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    Não
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: Impact selector and observations */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Possui impacto?
            </Label>
            {readonly || disabled ? (
              <span className={cn(
                "inline-block px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider border",
                nivel_impacto === "SIM"
                  ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                  : nivel_impacto === "ATENÇÃO"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              )}>
                {nivel_impacto}
              </span>
            ) : (
              <div className="flex rounded-md overflow-hidden border border-muted-foreground/25 w-fit bg-background">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUpdate({ nivel_impacto: "NÃO" })}
                  className={cn(
                    "h-8 px-4 rounded-none text-xs font-bold transition-colors border-r border-muted-foreground/25",
                    nivel_impacto === "NÃO"
                      ? "bg-emerald-600 text-white hover:bg-emerald-600 hover:text-white"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  NÃO
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUpdate({ nivel_impacto: "SIM" })}
                  className={cn(
                    "h-8 px-4 rounded-none text-xs font-bold transition-colors border-r border-muted-foreground/25",
                    nivel_impacto === "SIM"
                      ? "bg-rose-600 text-white hover:bg-rose-600 hover:text-white"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  SIM
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUpdate({ nivel_impacto: "ATENÇÃO" })}
                  className={cn(
                    "h-8 px-4 rounded-none text-xs font-bold transition-colors",
                    nivel_impacto === "ATENÇÃO"
                      ? "bg-amber-500 text-white hover:bg-amber-500 hover:text-white"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  ATENÇÃO
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Observações / Justificativa
            </Label>
            <Textarea
              value={detalhes}
              onChange={(e) => handleUpdate({ detalhes: e.target.value })}
              disabled={disabled || readonly}
              className={cn(
                "bg-background text-xs min-h-[60px] border transition-colors",
                nivel_impacto === "SIM"
                  ? "border-rose-300 focus-visible:ring-rose-500 focus-visible:border-rose-500 text-rose-700 dark:text-rose-300 font-medium"
                  : nivel_impacto === "ATENÇÃO"
                    ? "border-amber-300 focus-visible:ring-amber-500 focus-visible:border-amber-500 text-amber-700 dark:text-amber-300 font-medium"
                    : "border-muted-foreground/20 focus-visible:ring-primary focus-visible:border-primary"
              )}
              placeholder="Descreva as observações ou justificativa..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

interface ImpactedItem {
  sectionTitle: string;
  questionTitle: string;
  detalhes: string;
  nivel_impacto?: string;
}

interface AdherenceQuestionValue {
  utiliza?: boolean;
  valor?: string;
  detalhes?: string;
  nivel_impacto?: string;
  impacto?: boolean;
}

const getImpactedItems = (
  schema: Record<string, unknown> | undefined,
  formData: Record<string, unknown> | undefined
): ImpactedItem[] => {
  const items: ImpactedItem[] = [];
  if (!schema || !schema.properties || !formData) return items;

  const traverse = (
    currentSchema: Record<string, unknown>,
    currentData: Record<string, unknown>,
    currentSectionTitle: string
  ) => {
    if (!currentSchema || !currentSchema.properties || !currentData) return;

    const properties = currentSchema.properties as Record<string, Record<string, unknown>>;

    Object.keys(properties).forEach((key) => {
      const propSchema = properties[key];
      const propData = currentData[key] as AdherenceQuestionValue | Record<string, unknown> | undefined;
      if (!propSchema) return;

      if (propSchema.type === "object" && !("impacto" in ((propSchema.properties as Record<string, unknown>) || {}))) {
        traverse(
          propSchema,
          (propData || {}) as Record<string, unknown>,
          (propSchema.title as string) || currentSectionTitle
        );
      } else if (propData && (propData as AdherenceQuestionValue).impacto === true) {
        items.push({
          sectionTitle: currentSectionTitle,
          questionTitle: (propSchema.title as string) || "Pergunta",
          detalhes: (propData as AdherenceQuestionValue).detalhes || "Nenhum detalhe informado.",
          nivel_impacto: (propData as AdherenceQuestionValue).nivel_impacto ?? "SIM",
        });
      }
    });
  };

  traverse(schema, formData, "Geral");
  return items;
};

const checkHasAdherenceQuestions = (uiSchema: Record<string, unknown> | undefined): boolean => {
  if (!uiSchema) return false;
  
  const search = (obj: unknown): boolean => {
    if (typeof obj !== 'object' || obj === null) return false;
    const record = obj as Record<string, unknown>;
    if (record['ui:field'] === 'adherenceQuestion') return true;
    for (const key of Object.keys(record)) {
      if (search(record[key])) return true;
    }
    return false;
  };
  
  return search(uiSchema);
};

const ImpactedItemsList = ({ items }: { items: ImpactedItem[] }) => {
  return (
    <div className="p-5 border-2 border-rose-200 bg-rose-500/5 dark:border-rose-900/50 dark:bg-rose-950/10 rounded-xl space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center gap-2 border-b border-rose-200/50 dark:border-rose-900/30 pb-2.5">
        <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
        <h4 className="text-sm font-extrabold text-rose-800 dark:text-rose-400 uppercase tracking-wide">
          Itens com impacto:
        </h4>
        <span className="text-[10px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full ml-1">
          {items.length}
        </span>
      </div>

      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
        {items.map((item, idx) => {
          const isAttention = item.nivel_impacto === "ATENÇÃO";
          return (
            <div key={idx} className="space-y-1 border-b border-rose-100 dark:border-rose-950/30 pb-2.5 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="font-semibold text-muted-foreground uppercase bg-muted px-1.5 py-0.2 rounded border">
                  {item.sectionTitle}
                </span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border",
                  isAttention 
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                )}>
                  {isAttention ? "Ponto de Atenção" : "Não Aderente"}
                </span>
              </div>
              <p className="text-xs font-bold text-foreground/90">{item.questionTitle}</p>
              <div className={cn(
                "border-l-4 pl-3 py-1 text-xs font-medium italic rounded-r-md",
                isAttention 
                  ? "border-amber-500 bg-amber-500/5 text-amber-700 dark:text-amber-300 font-semibold"
                  : "border-rose-500 bg-rose-500/5 text-rose-700 dark:text-rose-300 font-semibold"
              )}>
                {item.detalhes}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AdherenceImpactSummary = ({ schema, formData }: { schema: Record<string, unknown>; formData: Record<string, unknown> }) => {
  const impactedItems = React.useMemo(() => getImpactedItems(schema, formData), [schema, formData]);
  const verdict = formData?.finalVerdict as string | undefined;

  if (verdict === "Não Aderente / Impeditivo") {
    return (
      <div className="space-y-4 my-6">
        <div className="p-4 border-2 border-dashed border-rose-500/30 bg-rose-500/5 rounded-xl flex items-start gap-3.5 animate-in fade-in duration-200">
          <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-rose-800 dark:text-rose-400">Implantação Não Aderente / Impeditivo</h4>
            <p className="text-xs text-rose-600/90 dark:text-rose-400/80 leading-relaxed">
              O parecer final indica que este sistema possui impedimentos e não está aderente. O formulário não está pronto para ser homologado.
            </p>
          </div>
        </div>
        {impactedItems.length > 0 && <ImpactedItemsList items={impactedItems} />}
      </div>
    );
  }

  if (verdict === "Aderente com Restrições") {
    return (
      <div className="space-y-4 my-6">
        <div className="p-4 border-2 border-dashed border-amber-500/30 bg-amber-500/5 rounded-xl flex items-start gap-3.5 animate-in fade-in duration-200">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400">Implantação Aderente com Restrições</h4>
            <p className="text-xs text-amber-600/90 dark:text-amber-400/80 leading-relaxed">
              O parecer final indica que o sistema possui restrições para implantação. Revise os pontos críticos antes de homologar.
            </p>
          </div>
        </div>
        {impactedItems.length > 0 && <ImpactedItemsList items={impactedItems} />}
      </div>
    );
  }

  if (impactedItems.length === 0) {
    return (
      <div className="p-4 border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 rounded-xl flex items-start gap-3.5 my-6 animate-in fade-in duration-200">
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Implantação 100% Aderente!</h4>
          <p className="text-xs text-emerald-600/90 dark:text-emerald-400/80 leading-relaxed">
            Nenhum item com impacto na implantação foi identificado para este sistema. O formulário está pronto para ser homologado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-6">
      <ImpactedItemsList items={impactedItems} />
    </div>
  );
};

const customFields = {
  adherenceQuestion: AdherenceQuestionField,
};

interface FormRendererProps {
  projectId?: string;
  schema: Record<string, unknown>;
  uiSchema?: Record<string, unknown>;
  formData: Record<string, unknown>;
  onChange?: (data: { formData: Record<string, unknown> }) => void;
  onSubmit?: (data: { formData: Record<string, unknown> }) => void;
  readonly?: boolean;
  disabled?: boolean;
  showSubmit?: boolean;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export function FormRenderer({
  projectId,
  schema,
  uiSchema = {},
  formData,
  onChange,
  onSubmit,
  readonly = false,
  disabled = false,
  showSubmit = true,
  submitLabel = "Salvar Formulário",
  isSubmitting = false,
}: FormRendererProps) {
  // RJSF expects a wrapper for submit button
  const formRef = React.useRef<Form>(null);

  const handleSubmit = ({ formData: submittedData }: { formData?: Record<string, unknown> }) => {
    if (onSubmit) {
      onSubmit({ formData: submittedData || {} });
    }
  };

  const handleFormChange = ({ formData: changedData }: { formData?: Record<string, unknown> }) => {
    if (onChange) {
      onChange({ formData: changedData || {} });
    }
  };

  // Setup ui:widget: "switch" mappings from options to custom switch widget
  const processedUiSchema = React.useMemo(() => {
    const updated = { ...uiSchema };
    return updated;
  }, [uiSchema]);

  const hasAdherenceQuestions = React.useMemo(() => checkHasAdherenceQuestions(uiSchema), [uiSchema]);

  return (
    <div className="rjsf-tailwind-form space-y-6">
      <Form
        ref={formRef}
        schema={schema}
        uiSchema={processedUiSchema}
        formData={formData}
        onChange={handleFormChange}
        onSubmit={handleSubmit}
        validator={validator}
        widgets={customWidgets}
        fields={customFields}
        formContext={{ projectId }}
        templates={{
          FieldTemplate: CustomFieldTemplate,
          ObjectFieldTemplate: CustomObjectFieldTemplate,
          ArrayFieldTemplate: CustomArrayFieldTemplate,
        }}
        disabled={disabled}
        readonly={readonly}
        showErrorList={false} // Don't show top error list, show inline errors
        noHtml5Validate={true} // Use JS validations instead of browser tooltips
      >
        {showSubmit && !readonly && !disabled ? (
          <div className="pt-6 border-t mt-6 flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="px-6 py-2">
              {isSubmitting ? (
                <>
                  <span className="mr-2 animate-spin">⏳</span>
                  Processando...
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </div>
        ) : (
          // Render nothing for default submit button
          <div className="hidden" />
        )}
      </Form>

      {hasAdherenceQuestions && (
        <AdherenceImpactSummary schema={schema} formData={formData} />
      )}
    </div>
  );
}
