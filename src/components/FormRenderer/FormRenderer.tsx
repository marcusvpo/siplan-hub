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
import { RichTextContent } from "@/components/ui/rich-text-content";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { isAdherenceImpactDescriptionTitle } from "@/lib/adherence-technical-opinion";
import {
  normalizeTitledImageAttachments,
  TitledImageAttachment,
} from "@/lib/form-image-attachments";
import { supabase } from "@/integrations/supabase/client";
import { UploadCloud, X, Loader2, AlertTriangle, CheckCircle2, AlertCircle, ImagePlus, Plus, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FORM_IMAGES_BUCKET = "form-images";

const uploadFormImage = async (file: File, projectId: string, fieldId: string) => {
  if (!file.type.startsWith("image/")) {
    throw new Error(`O arquivo ${file.name} não é uma imagem válida.`);
  }

  const fileExt = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
  const randomName = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).substring(2, 15);
  const safeProjectId = projectId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const safeFieldId = fieldId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const filePath = `${safeProjectId}/${safeFieldId}/${randomName}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(FORM_IMAGES_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from(FORM_IMAGES_BUCKET).getPublicUrl(filePath);

  return publicUrl;
};

const removeFormImage = async (url: string) => {
  const bucketUrlPart = `/storage/v1/object/public/${FORM_IMAGES_BUCKET}/`;
  const index = url.indexOf(bucketUrlPart);
  if (index === -1) return;

  const encodedPath = url.substring(index + bucketUrlPart.length).split("?")[0];
  const filePath = decodeURIComponent(encodedPath);
  const { error } = await supabase.storage.from(FORM_IMAGES_BUCKET).remove([filePath]);

  if (error) {
    console.warn("Could not delete from storage bucket:", error);
  }
};

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
  const compact = Boolean(props.registry.formContext?.compact);

  return (
    <div className={cn(compact ? "space-y-1 py-0.5" : "space-y-1.5 py-1", classNames)}>
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

const isAdherenceSectionSchema = (schema: unknown): boolean => {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return false;

  const properties = (schema as Record<string, unknown>).properties;
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) return false;

  return Object.values(properties).some((fieldSchema) => {
    if (!fieldSchema || typeof fieldSchema !== "object" || Array.isArray(fieldSchema)) return false;

    const fieldProperties = (fieldSchema as Record<string, unknown>).properties;
    return Boolean(
      fieldProperties
      && typeof fieldProperties === "object"
      && !Array.isArray(fieldProperties)
      && "impacto" in fieldProperties,
    );
  });
};

const getFirstAdherenceSectionKey = (schema: Record<string, unknown>): string | undefined => {
  const properties = schema.properties;
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) return undefined;

  return Object.entries(properties).find(([, fieldSchema]) =>
    isAdherenceSectionSchema(fieldSchema),
  )?.[0];
};

interface FormRendererContext {
  projectId?: string;
  firstAdherenceSectionKey?: string;
  compact?: boolean;
}

// Custom Object Field Template to render collapsible card-like layouts or nice sections
const CustomObjectFieldTemplate = (props: ObjectFieldTemplateProps) => {
  const { title, description, properties, schema, fieldPathId, registry } = props;
  const formContext = registry.formContext as FormRendererContext | undefined;
  const sectionKey = fieldPathId.path.at(-1);
  const isAdherenceSection = isAdherenceSectionSchema(schema);
  const isFirstAdherenceSection = sectionKey === formContext?.firstAdherenceSectionKey;
  const compact = Boolean(formContext?.compact);
  const [isOpen, setIsOpen] = React.useState(isFirstAdherenceSection);

  const fields = (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-2",
      compact ? "gap-x-4 gap-y-2.5" : "gap-x-6 gap-y-4",
    )}>
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
  );

  if (isAdherenceSection) {
    const sectionTitle = title || "Seção";

    return (
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="min-w-0"
        data-testid="adherence-collapsible-section"
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full min-w-0 items-center justify-between border-b text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              compact
                ? "min-h-11 gap-2 py-1.5 sm:min-h-10"
                : "min-h-12 gap-3 py-2",
            )}
            aria-label={`${isOpen ? "Recolher" : "Expandir"} seção ${sectionTitle}`}
          >
            <span className="min-w-0">
              <span className={cn(
                "block break-words font-bold tracking-tight text-foreground/90",
                compact ? "text-sm" : "text-sm sm:text-base",
              )}>
                {sectionTitle}
              </span>
              {description && (
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  {description}
                </span>
              )}
            </span>
            <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="hidden sm:inline">{properties.length} {properties.length === 1 ? "item" : "itens"}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isOpen && "rotate-180",
                )}
                aria-hidden="true"
              />
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className={compact ? "pt-2.5" : "pt-4"}>
          {fields}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {title && (
        <div className={cn("border-b", compact ? "mb-2 pb-1.5" : "mb-3 pb-2")}>
          <h3 className={cn("font-bold tracking-tight text-foreground/90", compact ? "text-sm" : "text-base")}>
            {title}
          </h3>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {fields}
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
  const { id, required, readonly, disabled, value, onChange, placeholder, options, label } = props;
  const compact = Boolean(props.registry.formContext?.compact);
  const isImpactDescription =
    typeof label === "string" && isAdherenceImpactDescriptionTitle(label);

  if (isImpactDescription) {
    return (
      <RichTextEditor
        content={typeof value === "string" ? value : ""}
        onChange={onChange}
        placeholder={placeholder || (options?.placeholder as string)}
        editable={!disabled && !readonly}
        compact={compact}
      />
    );
  }

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

  const urls = React.useMemo(() => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string" && v.length > 0);
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === "string" && v.length > 0);
      } catch {
        // Not JSON
      }
      if (value.startsWith("http://") || value.startsWith("https://") || value.includes("/storage/")) {
        return value.split(",").map(s => s.trim()).filter(s => s.length > 0);
      }
    }
    return [];
  }, [value]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newUrls = [...urls];
    let uploadedCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!file.type.startsWith("image/")) {
          toast({
            title: "Arquivo inválido",
            description: `O arquivo ${file.name} não é uma imagem válida.`,
            variant: "destructive",
          });
          continue;
        }

        const publicUrl = await uploadFormImage(file, projectId, id);
        newUrls.push(publicUrl);
        uploadedCount += 1;
      }

      if (uploadedCount > 0) {
        onChange(newUrls);
        toast({
          title: "Sucesso",
          description: `${uploadedCount} foto(s) enviada(s) com sucesso.`,
          className: "bg-green-500 text-white border-green-600",
        });
      }
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
      await removeFormImage(urlToDelete);

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

// Helper to format text input as DD/MM/YYYY date mask
const formatToDateMask = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

interface AdherenceImageAttachmentsProps {
  value: unknown;
  onChange: (attachments: TitledImageAttachment[]) => void;
  projectId: string;
  fieldId: string;
  readonly?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

const AdherenceImageAttachments = ({
  value,
  onChange,
  projectId,
  fieldId,
  readonly,
  disabled,
  compact,
}: AdherenceImageAttachmentsProps) => {
  const { toast } = useToast();
  const attachments = React.useMemo(
    () =>
      normalizeTitledImageAttachments(value).filter(
        (attachment) => attachment.title.trim() || attachment.url.trim(),
      ),
    [value],
  );
  const attachmentsRef = React.useRef(attachments);
  attachmentsRef.current = attachments;
  const [uploadingIndex, setUploadingIndex] = React.useState<number | null>(null);
  const addInputRef = React.useRef<HTMLInputElement>(null);
  const isLocked = Boolean(readonly || disabled);
  const visibleAttachments = isLocked
    ? attachments.filter((attachment) => attachment.url.trim())
    : attachments;

  const commitAttachments = (nextAttachments: TitledImageAttachment[]) => {
    attachmentsRef.current = nextAttachments;
    onChange(nextAttachments);
  };

  const handleUpdateAttachment = (
    index: number,
    updates: Partial<TitledImageAttachment>,
  ) => {
    const nextAttachments = [...attachmentsRef.current];
    if (!nextAttachments[index]) return;
    nextAttachments[index] = { ...nextAttachments[index], ...updates };
    commitAttachments(nextAttachments);
  };

  const handleRemoveAttachment = async (index: number) => {
    const nextAttachments = [...attachmentsRef.current];
    const [removed] = nextAttachments.splice(index, 1);
    commitAttachments(nextAttachments);

    if (removed?.url) {
      await removeFormImage(removed.url);
    }
  };

  const handleReplaceFileChange = async (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingIndex(index);
    try {
      const previousUrl = attachmentsRef.current[index]?.url;
      const publicUrl = await uploadFormImage(file, projectId, `${fieldId}-image-${index}`);
      handleUpdateAttachment(index, { url: publicUrl });

      if (previousUrl && previousUrl !== publicUrl) {
        await removeFormImage(previousUrl);
      }

      toast({
        title: "Imagem anexada",
        description: "Agora informe um título para identificar a imagem.",
      });
    } catch (error) {
      console.error("Error uploading adherence image:", error);
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Não foi possível enviar a imagem.",
        variant: "destructive",
      });
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleAddFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingIndex(-1);
    try {
      const attachmentIndex = attachmentsRef.current.length;
      const publicUrl = await uploadFormImage(
        file,
        projectId,
        `${fieldId}-image-${attachmentIndex}`,
      );
      commitAttachments([
        ...attachmentsRef.current,
        { title: "", url: publicUrl },
      ]);
      toast({
        title: "Imagem anexada",
        description: "Informe um título para identificar a imagem.",
      });
    } catch (error) {
      console.error("Error uploading adherence image:", error);
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Não foi possível enviar a imagem.",
        variant: "destructive",
      });
    } finally {
      setUploadingIndex(null);
    }
  };

  if (isLocked && visibleAttachments.length === 0) return null;

  const addButton = !isLocked && (
    <>
      <input
        ref={addInputRef}
        id={`${fieldId}-add-image`}
        type="file"
        accept="image/*"
        disabled={uploadingIndex !== null}
        onChange={handleAddFileChange}
        className="sr-only"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => addInputRef.current?.click()}
        disabled={uploadingIndex !== null}
        className="h-10 w-full gap-1.5 text-xs min-[360px]:w-auto sm:h-8"
      >
        {uploadingIndex === -1 ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {uploadingIndex === -1 ? "Enviando..." : "Adicionar imagem"}
      </Button>
    </>
  );

  if (visibleAttachments.length === 0) {
    return (
      <div className="flex min-w-0 justify-end" data-testid="adherence-image-attachments">
        {addButton}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-w-0 border-t border-dashed",
        compact ? "space-y-2 pt-2" : "space-y-2.5 pt-3",
      )}
      data-testid="adherence-image-attachments"
    >
      <div className="flex flex-col gap-2 min-[360px]:flex-row min-[360px]:items-center min-[360px]:justify-between">
        <Label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <ImagePlus className="h-3.5 w-3.5" />
          Imagens do item
        </Label>
        {addButton}
      </div>

      <div className={cn(
        "grid min-w-0 grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
        compact ? "gap-2" : "gap-2.5",
      )}>
        {visibleAttachments.map((attachment, index) => {
          const inputId = `${fieldId}-upload-${index}`;
          const isUploading = uploadingIndex === index;

          return (
            <div
              key={`${attachment.url}-${index}`}
              className="relative min-w-0 overflow-hidden rounded-lg border bg-card p-2 shadow-sm"
              data-testid="adherence-image-card"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
                {attachment.url ? (
                  <img
                    src={attachment.url}
                    alt={attachment.title || `Imagem ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                    Imagem pendente
                  </div>
                )}

                {!isLocked && (
                  <>
                    <label
                      htmlFor={inputId}
                      className="absolute inset-x-0 bottom-0 cursor-pointer bg-black/65 px-2 py-1.5 text-center text-[10px] font-semibold text-white"
                    >
                      {isUploading ? "Enviando..." : "Trocar"}
                    </label>
                    <input
                      id={inputId}
                      type="file"
                      accept="image/*"
                      disabled={uploadingIndex !== null}
                      onChange={(event) => handleReplaceFileChange(index, event)}
                      className="sr-only"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      onClick={() => handleRemoveAttachment(index)}
                      className="absolute right-1 top-1 h-7 w-7 bg-background/90 text-muted-foreground shadow hover:bg-destructive hover:text-destructive-foreground"
                      aria-label={`Remover imagem ${index + 1}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>

              <div className="mt-1.5 min-w-0">
                {isLocked ? (
                  <p className="break-words px-0.5 text-[11px] font-medium leading-4">
                    {attachment.title || "Sem título"}
                  </p>
                ) : (
                  <>
                    <Label htmlFor={`${fieldId}-title-${index}`} className="sr-only">
                      Título da imagem
                    </Label>
                    <Input
                      id={`${fieldId}-title-${index}`}
                      value={attachment.title}
                      onChange={(event) => handleUpdateAttachment(index, { title: event.target.value })}
                      placeholder="Título da imagem"
                      className={cn(
                        "h-8 min-w-0 px-2 text-xs",
                        attachment.url && !attachment.title.trim() && "border-amber-500 focus-visible:ring-amber-500",
                      )}
                    />
                  </>
                )}

                {attachment.url && !attachment.title.trim() && !isLocked && (
                  <p className="mt-1 text-[9px] font-medium leading-3 text-amber-600">
                    Informe um título.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Custom Adherence Question Field
const AdherenceQuestionField = (props: FieldProps) => {
  const { schema, uiSchema, formData, onChange, readonly, disabled, fieldPathId, registry } = props;

  const utiliza = formData?.utiliza ?? false;
  const valor = formData?.valor ?? "";
  const detalhes = formData?.detalhes ?? "";
  const imagens = normalizeTitledImageAttachments(formData?.imagens);
  const allowsImages = Boolean(schema.properties && "imagens" in schema.properties);
  const projectId = registry.formContext?.projectId || "global";
  const compact = Boolean(registry.formContext?.compact);
  
  // Resolve impact level: defaults to "NÃO". If not present, fall back to "SIM" if currently marked as having impact.
  const nivel_impacto = formData?.nivel_impacto ?? (formData?.impacto ? "SIM" : "NÃO");
  const impacto = nivel_impacto === "SIM" || nivel_impacto === "ATENÇÃO";
  const isText = schema.properties && "valor" in schema.properties;
  const isDate = schema.properties && "valor" in schema.properties && 
    ((schema.properties.valor as Record<string, unknown>).format === "date" || uiSchema?.valor?.["ui:widget"] === "date");

  const handleUpdate = (updatedFields: Partial<{ utiliza: boolean; valor: string; detalhes: string; nivel_impacto: string; impacto: boolean; imagens: TitledImageAttachment[] }>) => {
    if (readonly || disabled) return;
    
    const currentUtiliza = "utiliza" in updatedFields ? updatedFields.utiliza : utiliza;
    const currentValor = "valor" in updatedFields ? updatedFields.valor : valor;
    const currentDetalhes = "detalhes" in updatedFields ? updatedFields.detalhes : detalhes;
    const currentImages = "imagens" in updatedFields ? updatedFields.imagens : imagens;
    const currentNivelImpacto = "nivel_impacto" in updatedFields ? updatedFields.nivel_impacto! : nivel_impacto;
    const currentImpacto = currentNivelImpacto === "SIM" || currentNivelImpacto === "ATENÇÃO";

    const updatedFormData = {
        ...formData,
        utiliza: currentUtiliza,
        valor: currentValor,
        detalhes: currentDetalhes,
        nivel_impacto: currentNivelImpacto,
        impacto: currentImpacto,
      };

    if (allowsImages) {
      updatedFormData.imagens = currentImages;
    }

    onChange(
      updatedFormData,
      fieldPathId.path
    );
  };

  return (
    <div
      className={cn(
        "border transition-all duration-200 shadow-sm",
        compact
          ? "my-1 space-y-2.5 rounded-lg p-3"
          : "my-2 space-y-4 rounded-xl p-4",
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
      <div className={cn("flex items-start justify-between", compact ? "gap-2" : "gap-3")}>
        <div className="font-semibold text-sm text-foreground/90 leading-snug">
          {schema.title}
        </div>
        <span className={cn(
          "rounded-full py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0 border",
          compact ? "px-2" : "px-2.5",
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
      <div className={cn(
        "grid grid-cols-1 md:grid-cols-12",
        compact ? "gap-3" : "gap-6",
      )}>
        {/* Left column: Answer */}
        <div className={cn(compact ? "space-y-1" : "space-y-1.5", "md:col-span-3")}>
          {isText ? (
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Resposta:</Label>
              {isDate ? (
                <Input
                  type="text"
                  value={valor}
                  onChange={(e) => {
                    const maskedValue = formatToDateMask(e.target.value);
                    handleUpdate({ valor: maskedValue });
                  }}
                  disabled={disabled || readonly}
                  className="bg-background text-xs h-9 border-muted-foreground/20 focus-visible:ring-primary focus-visible:border-primary"
                  placeholder="DD/MM/YYYY"
                  maxLength={10}
                />
              ) : (
                <Textarea
                  value={valor}
                  onChange={(e) => handleUpdate({ valor: e.target.value })}
                  disabled={disabled || readonly}
                  className="bg-background text-xs min-h-[60px] border-muted-foreground/20 focus-visible:ring-primary focus-visible:border-primary"
                  placeholder="Digite a resposta..."
                />
              )}
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
                     "h-10 rounded-none px-3 text-xs font-bold transition-colors border-r border-muted-foreground/25 sm:h-7",
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
                      "h-10 rounded-none px-3 text-xs font-bold transition-colors sm:h-7",
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
        <div className={cn(compact ? "space-y-2" : "space-y-3", "md:col-span-9")}>
          <div className={compact ? "space-y-1" : "space-y-1.5"}>
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
                    "h-10 rounded-none px-3 text-xs font-bold transition-colors border-r border-muted-foreground/25 sm:h-7",
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
                    "h-10 rounded-none px-3 text-xs font-bold transition-colors border-r border-muted-foreground/25 sm:h-7",
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
                    "h-10 rounded-none px-3 text-xs font-bold transition-colors sm:h-7",
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

          <div className={compact ? "space-y-1" : "space-y-1.5"}>
            <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Observações / Justificativa
            </Label>
            {readonly || disabled ? (
              <div
                className={cn(
                  "min-h-14 rounded-md border bg-background px-3 py-2",
                  nivel_impacto === "SIM"
                    ? "border-rose-300 text-rose-700 dark:text-rose-300"
                    : nivel_impacto === "ATENÇÃO"
                      ? "border-amber-300 text-amber-700 dark:text-amber-300"
                      : "border-muted-foreground/20",
                )}
              >
                <RichTextContent
                  content={detalhes}
                  emptyText="Nenhuma observação informada."
                  className="text-xs font-medium"
                />
              </div>
            ) : (
              <RichTextEditor
                content={detalhes}
                onChange={(content) => handleUpdate({ detalhes: content })}
                placeholder="Descreva as observações ou justificativa..."
                compact={compact}
                className={cn(
                  compact ? "min-h-[112px] text-xs transition-colors" : "min-h-[160px] text-xs transition-colors",
                  nivel_impacto === "SIM"
                    ? "border-rose-300 text-rose-700 dark:text-rose-300"
                    : nivel_impacto === "ATENÇÃO"
                      ? "border-amber-300 text-amber-700 dark:text-amber-300"
                      : "border-muted-foreground/20",
                )}
              />
            )}
          </div>
        </div>
      </div>

      {allowsImages && (
        <AdherenceImageAttachments
          value={imagens}
          onChange={(attachments) => handleUpdate({ imagens: attachments })}
          projectId={projectId}
          fieldId={fieldPathId.$id}
          readonly={readonly}
          disabled={disabled}
          compact={compact}
        />
      )}
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

const ImpactedItemsList = ({ items, compact }: { items: ImpactedItem[]; compact?: boolean }) => {
  return (
    <div className={cn(
      "border-2 border-rose-200 bg-rose-500/5 dark:border-rose-900/50 dark:bg-transparent animate-in fade-in duration-200",
      compact ? "space-y-2.5 rounded-lg p-3" : "space-y-4 rounded-xl p-5",
    )}>
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
                <RichTextContent content={item.detalhes} className="text-xs" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AdherenceImpactSummary = ({ schema, formData, compact }: { schema: Record<string, unknown>; formData: Record<string, unknown>; compact?: boolean }) => {
  const impactedItems = React.useMemo(() => getImpactedItems(schema, formData), [schema, formData]);
  const verdict = formData?.finalVerdict as string | undefined;

  if (verdict === "Não Aderente / Impeditivo") {
    return (
      <div className={compact ? "my-4 space-y-2.5" : "my-6 space-y-4"}>
        <div className={cn(
          "border-2 border-dashed border-rose-500/30 bg-rose-500/5 dark:bg-transparent flex items-start animate-in fade-in duration-200",
          compact ? "gap-2.5 rounded-lg p-3" : "gap-3.5 rounded-xl p-4",
        )}>
          <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-rose-800 dark:text-rose-400">Implantação Não Aderente / Impeditivo</h4>
            <p className="text-xs text-rose-600/90 dark:text-rose-400/80 leading-relaxed">
              O parecer final indica que este sistema possui impedimentos e não está aderente. O formulário não está pronto para ser homologado.
            </p>
          </div>
        </div>
        {impactedItems.length > 0 && <ImpactedItemsList items={impactedItems} compact={compact} />}
      </div>
    );
  }

  if (verdict === "Aderente com Restrições") {
    return (
      <div className={compact ? "my-4 space-y-2.5" : "my-6 space-y-4"}>
        <div className={cn(
          "border-2 border-dashed border-amber-500/30 bg-amber-500/5 dark:bg-transparent flex items-start animate-in fade-in duration-200",
          compact ? "gap-2.5 rounded-lg p-3" : "gap-3.5 rounded-xl p-4",
        )}>
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400">Implantação Aderente com Restrições</h4>
            <p className="text-xs text-amber-600/90 dark:text-amber-400/80 leading-relaxed">
              O parecer final indica que o sistema possui restrições para implantação. Revise os pontos críticos antes de homologar.
            </p>
          </div>
        </div>
        {impactedItems.length > 0 && <ImpactedItemsList items={impactedItems} compact={compact} />}
      </div>
    );
  }

  if (impactedItems.length === 0) {
    return (
      <div className={cn(
        "border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 dark:bg-transparent flex items-start animate-in fade-in duration-200",
        compact ? "my-4 gap-2.5 rounded-lg p-3" : "my-6 gap-3.5 rounded-xl p-4",
      )}>
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
    <div className={compact ? "my-4" : "my-6"}>
      <ImpactedItemsList items={impactedItems} compact={compact} />
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
  compact?: boolean;
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
  compact = false,
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
  const firstAdherenceSectionKey = React.useMemo(
    () => getFirstAdherenceSectionKey(schema),
    [schema],
  );

  return (
    <div
      className={cn("rjsf-tailwind-form", compact ? "space-y-4" : "space-y-6")}
      data-density={compact ? "compact" : "comfortable"}
    >
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
        formContext={{ projectId, firstAdherenceSectionKey, compact }}
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
        <AdherenceImpactSummary schema={schema} formData={formData} compact={compact} />
      )}
    </div>
  );
}
