import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Clock3,
  Copy,
  FileEdit,
  ImageUp,
  Link2,
  Loader2,
  Palette,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Send,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useCsCxRegistryOffices } from "@/hooks/useCsCxCore";
import { useCsCxContacts } from "@/hooks/useCsCxEngagement";
import {
  effectiveInvitationStatus,
  useCsCxNpsSurveys,
} from "@/hooks/useCsCxNpsSurveys";
import { useCsCxRecordPermissions } from "@/hooks/useCsCxRecordPermissions";
import { useToast } from "@/hooks/use-toast";
import {
  DEFAULT_NPS_QUESTIONS,
  DEFAULT_NPS_THEME,
  npsThemeForegroundColor,
  npsThemeTint,
  newNpsQuestion,
  normalizeNpsTheme,
  publicNpsAssetUrl,
  validateNpsBackgroundFile,
  validateNpsQuestionnaire,
} from "@/lib/cs-cx-nps-survey";
import { cn } from "@/lib/utils";
import type {
  CsCxNpsQuestionnaire,
  NpsQuestion,
  NpsQuestionnaireTheme,
  NpsQuestionType,
} from "@/types/cs-cx-nps-survey";

const PAGE_SIZE = 5;
const QUESTION_TYPES: Array<{
  value: Exclude<NpsQuestionType, "nps">;
  label: string;
}> = [
  { value: "rating", label: "Nota (0 a 10)" },
  { value: "text", label: "Texto curto" },
  { value: "textarea", label: "Texto longo" },
  { value: "single_choice", label: "Escolha única" },
  { value: "multiple_choice", label: "Múltipla escolha" },
];

export function NpsInvitationsPanel({
  requestOpen,
  onRequestOpenChange,
}: {
  requestOpen: boolean;
  onRequestOpenChange: (open: boolean) => void;
}) {
  const { invitations, questionnaires, createInvitation, cancelInvitation } =
    useCsCxNpsSurveys();
  const { offices } = useCsCxRegistryOffices();
  const { contacts } = useCsCxContacts();
  const { canCreate, canEditRecord } =
    useCsCxRecordPermissions("cs_cx_nps");
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [officeId, setOfficeId] = useState("");
  const [contactId, setContactId] = useState("none");
  const [questionnaireId, setQuestionnaireId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [validDays, setValidDays] = useState("15");
  const [generatedLink, setGeneratedLink] = useState("");
  const activeQuestionnaires = questionnaires.filter((item) => item.is_active);
  const filteredContacts = contacts.filter(
    (contact) => contact.registry_office_id === officeId,
  );
  const totalPages = Math.max(1, Math.ceil(invitations.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = invitations.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => {
    if (!requestOpen) return;
    setGeneratedLink("");
    setOfficeId("");
    setContactId("none");
    setRecipientName("");
    setRecipientEmail("");
    setValidDays("15");
    setQuestionnaireId(
      activeQuestionnaires.find((item) => item.is_default)?.id ??
        activeQuestionnaires[0]?.id ??
        "",
    );
  }, [requestOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (requestOpen && !questionnaireId && activeQuestionnaires.length > 0) {
      setQuestionnaireId(
        activeQuestionnaires.find((item) => item.is_default)?.id ??
          activeQuestionnaires[0]?.id ??
          "",
      );
    }
  }, [requestOpen, questionnaireId, activeQuestionnaires]);

  function selectContact(value: string) {
    setContactId(value);
    if (value === "none") return;
    const contact = filteredContacts.find((item) => item.id === value);
    if (contact) {
      setRecipientName(contact.contact_person);
      const possibleEmail = contact.contact_details?.match(
        /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i,
      )?.[0];
      if (possibleEmail) setRecipientEmail(possibleEmail);
    }
  }

  async function generateLink() {
    try {
      const expiresAt = new Date(
        Date.now() + Number(validDays) * 86_400_000,
      ).toISOString();
      const invitation = await createInvitation.mutateAsync({
        questionnaire_id: questionnaireId,
        registry_office_id: officeId,
        contact_id: contactId === "none" ? undefined : contactId,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        expires_at: expiresAt,
      });
      const link = publicNpsUrl(invitation.public_token);
      setGeneratedLink(link);
      await copyText(link);
      toast({
        title: "Link de NPS criado",
        description:
          "O link individual foi copiado para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Não foi possível gerar o link",
        description: messageOf(error),
        variant: "destructive",
      });
    }
  }

  async function copyInvitation(token: string) {
    try {
      await copyText(publicNpsUrl(token));
      toast({ title: "Link copiado" });
    } catch (error) {
      toast({
        title: "Não foi possível copiar",
        description: messageOf(error),
        variant: "destructive",
      });
    }
  }

  async function cancel(id: string) {
    try {
      await cancelInvitation.mutateAsync(id);
      toast({ title: "Solicitação cancelada" });
    } catch (error) {
      toast({
        title: "Não foi possível cancelar",
        description: messageOf(error),
        variant: "destructive",
      });
    }
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table className="[&_td]:px-3 [&_td]:py-2 [&_th]:h-9 [&_th]:px-3">
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Destinatário</TableHead>
                <TableHead>Questionário</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((invitation) => {
                const status = effectiveInvitationStatus(invitation);
                return (
                  <TableRow key={invitation.id}>
                    <TableCell className="max-w-64 truncate font-medium">
                      {invitation.registry_office?.name}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{invitation.recipient_name}</p>
                      {invitation.recipient_email && (
                        <p className="text-xs text-muted-foreground">
                          {invitation.recipient_email}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="max-w-56 truncate">
                      {invitation.questionnaire?.title ??
                        invitation.questionnaire_snapshot.title}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDate(invitation.created_at)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDate(invitation.expires_at)}
                    </TableCell>
                    <TableCell>
                      <InvitationBadge status={status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Copiar link NPS"
                          onClick={() =>
                            copyInvitation(invitation.public_token)
                          }
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {canEditRecord(invitation.created_by) &&
                          status === "PENDENTE" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            aria-label="Cancelar solicitação NPS"
                            onClick={() => cancel(invitation.id)}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!invitations.length && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-28 text-center text-sm text-muted-foreground"
                  >
                    Nenhuma solicitação criada. Use “Solicitar NPS” para gerar o
                    primeiro link.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            total={invitations.length}
            onChange={setPage}
          />
        </CardContent>
      </Card>

      <Dialog open={requestOpen} onOpenChange={onRequestOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Solicitar NPS</DialogTitle>
            <DialogDescription>
              Gere um link individual e de uso único para o cliente responder.
            </DialogDescription>
          </DialogHeader>
          {generatedLink ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <Check className="h-4 w-4" />
                  Link criado com sucesso
                </div>
                <p className="mt-1 text-xs text-emerald-700">
                  Ele já foi copiado e pode ser enviado por WhatsApp ou e-mail.
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={generatedLink}
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Copiar link gerado"
                  onClick={() => copyText(generatedLink)}
                >
                  <Clipboard className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cartório/cliente">
                <Select
                  value={officeId}
                  onValueChange={(value) => {
                    setOfficeId(value);
                    setContactId("none");
                    setRecipientName("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {offices
                      .filter((office) => office.active)
                      .map((office) => (
                        <SelectItem key={office.id} value={office.id}>
                          {office.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Contato cadastrado">
                <Select
                  value={contactId}
                  disabled={!officeId}
                  onValueChange={selectContact}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Informar manualmente</SelectItem>
                    {filteredContacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.contact_person}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Destinatário">
                <Input
                  value={recipientName}
                  onChange={(event) => setRecipientName(event.target.value)}
                  placeholder="Nome de quem responderá"
                  maxLength={300}
                />
              </Field>
              <Field label="E-mail (opcional)">
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(event) => setRecipientEmail(event.target.value)}
                  placeholder="cliente@cartorio.com.br"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Questionário">
                  <Select
                    value={questionnaireId}
                    onValueChange={setQuestionnaireId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeQuestionnaires.length === 0 ? (
                        <SelectItem value="_none" disabled>
                          Nenhum questionário ativo disponível
                        </SelectItem>
                      ) : (
                        activeQuestionnaires.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.title}
                            {item.is_default ? " · Padrão" : ""}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Validade">
                <Select value={validDays} onValueChange={setValidDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="15">15 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="60">60 dias</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onRequestOpenChange(false)}
            >
              {generatedLink ? "Fechar" : "Cancelar"}
            </Button>
            {!generatedLink && (
              <Button
                disabled={
                  !canCreate ||
                  !officeId ||
                  !questionnaireId ||
                  !recipientName.trim() ||
                  createInvitation.isPending
                }
                onClick={generateLink}
              >
                {createInvitation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="mr-2 h-4 w-4" />
                )}
                Gerar e copiar link
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function NpsQuestionnairesPanel() {
  const {
    questionnaires,
    saveQuestionnaire,
    uploadQuestionnaireBackground,
    setQuestionnaireActive,
    setDefaultQuestionnaire,
  } = useCsCxNpsSurveys();
  const { canCreate, canEditRecord } =
    useCsCxRecordPermissions("cs_cx_nps");
  const { toast } = useToast();
  const [editing, setEditing] = useState<CsCxNpsQuestionnaire | "new" | null>(
    null,
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<NpsQuestion[]>(
    DEFAULT_NPS_QUESTIONS,
  );
  const [isDefault, setIsDefault] = useState(false);
  const [theme, setTheme] = useState<NpsQuestionnaireTheme>(DEFAULT_NPS_THEME);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [backgroundPreviewUrl, setBackgroundPreviewUrl] = useState<
    string | null
  >(null);
  const [newType, setNewType] =
    useState<Exclude<NpsQuestionType, "nps">>("text");

  useEffect(() => {
    if (!backgroundFile || typeof URL.createObjectURL !== "function") {
      setBackgroundPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(backgroundFile);
    setBackgroundPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [backgroundFile]);

  function openEditor(item: CsCxNpsQuestionnaire | "new") {
    setEditing(item);
    setTitle(item === "new" ? "" : item.title);
    setDescription(item === "new" ? "" : (item.description ?? ""));
    setQuestions(
      item === "new"
        ? DEFAULT_NPS_QUESTIONS.map((question) => ({ ...question }))
        : item.questions.map((question) => ({
            ...question,
            options: question.options ? [...question.options] : undefined,
          })),
    );
    setIsDefault(item === "new" ? !questionnaires.length : item.is_default);
    setTheme(
      item === "new" ? { ...DEFAULT_NPS_THEME } : normalizeNpsTheme(item.theme),
    );
    setBackgroundFile(null);
  }

  function updateQuestion(id: string, updates: Partial<NpsQuestion>) {
    setQuestions((items) =>
      items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  }
  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    [next[index], next[target]] = [next[target], next[index]];
    setQuestions(next);
  }
  function selectBackground(file: File | null) {
    if (!file) return;
    const validation = validateNpsBackgroundFile(file);
    if (validation) {
      toast({
        title: "Imagem inválida",
        description: validation,
        variant: "destructive",
      });
      return;
    }
    setBackgroundFile(file);
  }
  async function save() {
    const validation = validateNpsQuestionnaire({
      title,
      description,
      questions,
      theme,
    });
    if (validation) {
      toast({
        title: "Revise o questionário",
        description: validation,
        variant: "destructive",
      });
      return;
    }
    try {
      const backgroundImagePath = backgroundFile
        ? await uploadQuestionnaireBackground.mutateAsync(backgroundFile)
        : theme.background_image_path;
      await saveQuestionnaire.mutateAsync({
        id: editing === "new" ? undefined : editing?.id,
        title,
        description,
        questions,
        theme: {
          ...theme,
          background_image_path: backgroundImagePath,
        },
        is_active: editing === "new" ? true : editing!.is_active,
        is_default: isDefault,
      });
      setEditing(null);
      toast({ title: "Questionário salvo" });
    } catch (error) {
      toast({
        title: "Não foi possível salvar",
        description: messageOf(error),
        variant: "destructive",
      });
    }
  }

  const previewBackgroundUrl =
    backgroundPreviewUrl ?? publicNpsAssetUrl(theme.background_image_path);

  return (
    <>
      <div className="mb-3 flex justify-end">
        {canCreate && (
          <Button size="sm" onClick={() => openEditor("new")}>
            <Plus className="mr-2 h-4 w-4" />
            Novo questionário
          </Button>
        )}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {questionnaires.map((item) => (
          <Card key={item.id} className={cn(!item.is_active && "opacity-65")}>
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border border-black/10"
                    style={{
                      backgroundColor: normalizeNpsTheme(item.theme)
                        .primary_color,
                    }}
                    aria-label={`Cor do questionário ${item.title}`}
                  />
                  <h3 className="truncate font-bold">{item.title}</h3>
                  {item.is_default && (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                      <Star className="mr-1 h-3 w-3" />
                      Padrão
                    </Badge>
                  )}
                  <Badge variant={item.is_active ? "outline" : "secondary"}>
                    {item.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {item.description || "Sem descrição"}
                </p>
                <p className="mt-2 text-xs font-medium">
                  {item.questions.length} pergunta(s)
                </p>
              </div>
              {canEditRecord(item.created_by) && (
                <div className="flex shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Editar questionário"
                    onClick={() => openEditor(item)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {!item.is_default && item.is_active && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Definir questionário padrão"
                      onClick={() => setDefaultQuestionnaire.mutate(item.id)}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={item.is_default}
                    aria-label={
                      item.is_default
                        ? "Questionário padrão não pode ser desativado"
                        : item.is_active
                          ? "Desativar questionário"
                          : "Ativar questionário"
                    }
                    onClick={() =>
                      setQuestionnaireActive.mutate({
                        id: item.id,
                        active: !item.is_active,
                      })
                    }
                  >
                    {item.is_active ? (
                      <PowerOff className="h-4 w-4" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing === "new"
                ? "Novo questionário NPS"
                : "Editar questionário NPS"}
            </DialogTitle>
            <DialogDescription>
              Convites já criados preservam a versão anterior das perguntas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Título">
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={160}
                />
              </Field>
              <div className="flex items-end gap-2 pb-2">
                <Switch
                  id="default-questionnaire"
                  checked={isDefault}
                  disabled={editing !== "new" && editing?.is_default}
                  onCheckedChange={setIsDefault}
                />
                <Label htmlFor="default-questionnaire">
                  Usar como questionário padrão
                </Label>
              </div>
              <div className="sm:col-span-2">
                <Field label="Descrição">
                  <Textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </Field>
              </div>
            </div>
            <Card className="overflow-hidden border-slate-200">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <h3 className="text-sm font-bold">Aparência da pesquisa</h3>
                    <p className="text-xs text-muted-foreground">
                      Personalização aplicada somente aos novos convites.
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(280px,1fr)]">
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ColorControl
                        id="nps-primary-color"
                        label="Cor principal"
                        value={theme.primary_color}
                        onChange={(value) =>
                          setTheme((current) => ({
                            ...current,
                            primary_color: value,
                          }))
                        }
                      />
                      <ColorControl
                        id="nps-background-color"
                        label="Cor de fundo"
                        value={theme.background_color}
                        onChange={(value) =>
                          setTheme((current) => ({
                            ...current,
                            background_color: value,
                          }))
                        }
                      />
                    </div>
                    <Field label="Imagem de fundo (JPG, PNG ou WEBP, até 5 MB)">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <label
                            htmlFor="nps-background-image"
                            className="cursor-pointer"
                          >
                            <ImageUp className="mr-2 h-4 w-4" />
                            Escolher imagem
                          </label>
                        </Button>
                        <Input
                          id="nps-background-image"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          onChange={(event) =>
                            selectBackground(event.target.files?.[0] ?? null)
                          }
                        />
                        {previewBackgroundUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => {
                              setBackgroundFile(null);
                              setTheme((current) => ({
                                ...current,
                                background_image_path: null,
                              }));
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remover imagem
                          </Button>
                        )}
                      </div>
                    </Field>
                    {previewBackgroundUrl && (
                      <Field
                        label={`Cobertura clara sobre a imagem: ${theme.background_overlay}%`}
                      >
                        <Input
                          type="range"
                          min="0"
                          max="90"
                          step="5"
                          value={theme.background_overlay}
                          onChange={(event) =>
                            setTheme((current) => ({
                              ...current,
                              background_overlay: Number(event.target.value),
                            }))
                          }
                        />
                      </Field>
                    )}
                  </div>
                  <NpsThemePreview
                    title={title || "Título da pesquisa"}
                    theme={theme}
                    backgroundUrl={previewBackgroundUrl}
                  />
                </div>
              </CardContent>
            </Card>
            <div className="space-y-3">
              {questions.map((question, index) => (
                <Card
                  key={question.id}
                  className={cn(
                    "border-l-4",
                    question.type === "nps"
                      ? "border-l-rose-500 bg-rose-50/30"
                      : "border-l-slate-300",
                  )}
                >
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                      <Input
                        className="font-medium"
                        value={question.title}
                        onChange={(event) =>
                          updateQuestion(question.id, {
                            title: event.target.value,
                          })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={index === questions.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      {question.type !== "nps" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          aria-label="Remover pergunta"
                          onClick={() =>
                            setQuestions((items) =>
                              items.filter((item) => item.id !== question.id),
                            )
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="outline">
                        {questionTypeLabel(question.type)}
                      </Badge>
                      <label className="flex items-center gap-2 text-xs">
                        <Checkbox
                          checked={question.required}
                          disabled={question.type === "nps"}
                          onCheckedChange={(checked) =>
                            updateQuestion(question.id, {
                              required: Boolean(checked),
                            })
                          }
                        />
                        Obrigatória
                      </label>
                    </div>
                    {["single_choice", "multiple_choice"].includes(
                      question.type,
                    ) && (
                      <Field label="Opções (uma por linha)">
                        <Textarea
                          value={(question.options ?? []).join("\n")}
                          onChange={(event) =>
                            updateQuestion(question.id, {
                              options: event.target.value.split("\n"),
                            })
                          }
                        />
                      </Field>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3 sm:flex-row sm:items-center">
              <Select
                value={newType}
                onValueChange={(value) =>
                  setNewType(value as Exclude<NpsQuestionType, "nps">)
                }
              >
                <SelectTrigger className="sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() =>
                  setQuestions((items) => [...items, newNpsQuestion(newType)])
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar pergunta
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              disabled={
                saveQuestionnaire.isPending ||
                uploadQuestionnaireBackground.isPending
              }
              onClick={save}
            >
              {saveQuestionnaire.isPending ||
              uploadQuestionnaireBackground.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileEdit className="mr-2 h-4 w-4" />
              )}
              Salvar questionário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ColorControl({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <Input
          id={id}
          type="color"
          aria-label={label}
          className="h-9 w-12 cursor-pointer p-1"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#E11D48"}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
        <Input
          aria-label={`${label} hexadecimal`}
          value={value}
          maxLength={7}
          className="h-9 font-mono uppercase"
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
      </div>
    </Field>
  );
}

function NpsThemePreview({
  title,
  theme,
  backgroundUrl,
}: {
  title: string;
  theme: NpsQuestionnaireTheme;
  backgroundUrl: string | null;
}) {
  const normalized = normalizeNpsTheme(theme);
  return (
    <div>
      <Label>Pré-visualização</Label>
      <div
        className="relative mt-1 min-h-52 overflow-hidden rounded-xl border bg-cover bg-center p-5"
        style={{
          backgroundColor: normalized.background_color,
          backgroundImage: backgroundUrl
            ? `url("${backgroundUrl}")`
            : undefined,
        }}
      >
        {backgroundUrl && (
          <div
            className="absolute inset-0 bg-white"
            style={{ opacity: normalized.background_overlay / 100 }}
          />
        )}
        <div className="relative overflow-hidden rounded-lg border bg-white shadow-md">
          <div
            className="h-1.5"
            style={{ backgroundColor: normalized.primary_color }}
          />
          <div className="space-y-3 p-4">
            <span
              className="inline-flex rounded-full px-2 py-1 text-[10px] font-bold"
              style={{
                backgroundColor: npsThemeTint(normalized.primary_color, 0.1),
                color: normalized.primary_color,
              }}
            >
              Pesquisa de satisfação
            </span>
            <p className="line-clamp-2 text-base font-black text-slate-950">
              {title}
            </p>
            <div className="h-8 rounded-md border border-slate-200 bg-slate-50" />
            <span
              className="inline-flex rounded-md px-3 py-2 text-[10px] font-bold text-white"
              style={{
                backgroundColor: normalized.primary_color,
                color: npsThemeForegroundColor(normalized.primary_color),
              }}
            >
              Enviar avaliação
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InvitationBadge({
  status,
}: {
  status: ReturnType<typeof effectiveInvitationStatus>;
}) {
  const styles = {
    PENDENTE: "bg-blue-50 text-blue-700 border-blue-200",
    RESPONDIDO: "bg-emerald-50 text-emerald-700 border-emerald-200",
    EXPIRADO: "bg-amber-50 text-amber-700 border-amber-200",
    CANCELADO: "bg-slate-100 text-slate-600 border-slate-200",
  };
  const icons = {
    PENDENTE: Send,
    RESPONDIDO: Check,
    EXPIRADO: Clock3,
    CANCELADO: Ban,
  };
  const Icon = icons[status];
  return (
    <Badge variant="outline" className={styles[status]}>
      <Icon className="mr-1 h-3 w-3" />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
}
function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const first = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const last = Math.min(page * PAGE_SIZE, total);
  return (
    <div className="flex items-center justify-between border-t px-3 py-3 text-xs text-muted-foreground">
      <span>
        Mostrando {first}–{last} de {total} solicitações
      </span>
      <div className="flex items-center gap-2">
        <span>
          Página {page} de {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page <= 1}
          aria-label="Página anterior de solicitações"
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page >= totalPages}
          aria-label="Próxima página de solicitações"
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function publicNpsUrl(token: string) {
  const configured = String(import.meta.env.VITE_PUBLIC_APP_URL ?? "")
    .trim()
    .replace(/\/$/, "");
  return `${configured || window.location.origin}/nps/responder/${token}`;
}
async function copyText(value: string) {
  if (navigator.clipboard?.writeText)
    return navigator.clipboard.writeText(value);
  const input = document.createElement("textarea");
  input.value = value;
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
function questionTypeLabel(type: NpsQuestionType) {
  return type === "nps"
    ? "Escala NPS 0–10"
    : (QUESTION_TYPES.find((item) => item.value === type)?.label ?? type);
}
function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Erro inesperado.";
}
