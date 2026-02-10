import { useState, useRef } from "react";
import { ConversionPost } from "@/hooks/useConversionPosts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImagePlus, Send, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface NewPostFormProps {
  onSubmit: (params: {
    content: string;
    imageUrls?: string[];
    postType?: ConversionPost["postType"];
    stage?: string;
    authorName: string;
  }) => Promise<ConversionPost | null>;
  uploadImage: (file: File) => Promise<string | null>;
  authorName: string;
  queueId?: string;
}

const STAGE_OPTIONS = [
  { value: "analysis", label: "Análise" },
  { value: "development", label: "Desenvolvimento" },
  { value: "testing", label: "Testes" },
  { value: "delivery", label: "Entrega" },
];

export function NewPostForm({
  onSubmit,
  uploadImage,
  authorName,
}: NewPostFormProps) {
  const [content, setContent] = useState("");
  const [postType, setPostType] =
    useState<ConversionPost["postType"]>("update");
  const [stage, setStage] = useState<string>("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((f) => {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name} excede 5MB`);
        return false;
      }
      return true;
    });

    setImageFiles((prev) => [...prev, ...validFiles]);
    validFiles.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(f);
    });

    if (fileRef.current) fileRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Escreva algo para publicar");
      return;
    }

    setSubmitting(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of imageFiles) {
        const url = await uploadImage(file);
        if (url) uploadedUrls.push(url);
      }

      await onSubmit({
        content: content.trim(),
        imageUrls: uploadedUrls,
        postType,
        stage: stage || undefined,
        authorName,
      });

      setContent("");
      setPostType("update");
      setStage("");
      setImageFiles([]);
      setImagePreviews([]);
      toast.success("Publicação criada");
    } catch {
      toast.error("Erro ao publicar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border border-border rounded-lg p-3 bg-card space-y-3">
      <Textarea
        placeholder="Registrar atualização sobre esta conversão..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[80px] resize-none border-0 p-0 focus-visible:ring-0 text-sm"
        disabled={submitting}
      />

      {/* Image previews */}
      {imagePreviews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {imagePreviews.map((preview, i) => (
            <div
              key={i}
              className="relative h-14 w-14 rounded-md overflow-hidden border"
            >
              <img
                src={preview}
                alt=""
                className="h-full w-full object-cover"
              />
              <button
                onClick={() => removeImage(i)}
                className="absolute top-0 right-0 bg-black/60 rounded-bl-md p-0.5"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 border-t pt-2">
        <Select
          value={postType}
          onValueChange={(v) => setPostType(v as ConversionPost["postType"])}
        >
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="update">Atualização</SelectItem>
            <SelectItem value="stage_change">Mudança de Etapa</SelectItem>
            <SelectItem value="issue">Problema</SelectItem>
            <SelectItem value="resolution">Resolução</SelectItem>
            <SelectItem value="note">Nota</SelectItem>
          </SelectContent>
        </Select>

        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Etapa (opcional)" />
          </SelectTrigger>
          <SelectContent>
            {STAGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleImageSelect}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => fileRef.current?.click()}
          disabled={submitting}
        >
          <ImagePlus className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        <Button
          size="sm"
          className="h-8 gap-1"
          onClick={handleSubmit}
          disabled={submitting || !content.trim()}
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Publicar
        </Button>
      </div>
    </div>
  );
}
