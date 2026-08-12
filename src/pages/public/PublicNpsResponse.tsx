import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  CheckCircle2,
  Clock3,
  Frown,
  Loader2,
  LockKeyhole,
  Meh,
  Send,
  Smile,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  NpsAnswers,
  NpsQuestion,
  PublicNpsInvitation,
} from "@/types/cs-cx-nps-survey";

const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cs-cx-nps-public`;

export default function PublicNpsResponse() {
  const { token = "" } = useParams<{ token: string }>();
  const [answers, setAnswers] = useState<NpsAnswers>({});
  const [respondentName, setRespondentName] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const invitationQuery = useQuery({
    queryKey: ["public-nps", token],
    queryFn: () => loadInvitation(token),
    enabled: Boolean(token),
    retry: false,
  });
  const invitation = invitationQuery.data;
  const questions = invitation?.questionnaire?.questions ?? [];
  const missingRequired = questions.some(
    (question) => question.required && isEmptyAnswer(answers[question.id]),
  );
  const unavailable = invitation && invitation.status !== "PENDENTE";

  async function submit() {
    if (!invitation || missingRequired || !respondentName.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          respondent_name: respondentName,
          answers,
          website,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          payload.erro ?? "Não foi possível enviar sua avaliação.",
        );
      setSubmitted(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar sua avaliação.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (invitationQuery.isLoading)
    return (
      <PublicShell>
        <StateCard
          icon={Loader2}
          title="Carregando pesquisa"
          description="Estamos preparando seu questionário."
          spin
        />
      </PublicShell>
    );
  if (invitationQuery.error || !invitation)
    return (
      <PublicShell>
        <StateCard
          icon={LockKeyhole}
          title="Link inválido"
          description={
            messageOf(invitationQuery.error) ||
            "Este convite não foi encontrado."
          }
        />
      </PublicShell>
    );
  if (submitted)
    return (
      <PublicShell>
        <StateCard
          icon={CheckCircle2}
          title="Obrigado pela sua avaliação!"
          description="Sua resposta foi registrada diretamente no Siplan HUB e já está disponível para nossa equipe."
          success
        />
      </PublicShell>
    );
  if (unavailable)
    return (
      <PublicShell>
        <StateCard
          icon={invitation.status === "RESPONDIDO" ? CheckCircle2 : Clock3}
          title={statusTitle(invitation.status)}
          description={statusDescription(invitation.status)}
          success={invitation.status === "RESPONDIDO"}
        />
      </PublicShell>
    );

  return (
    <PublicShell>
      <Card className="overflow-hidden border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div className="h-1.5 bg-gradient-to-r from-rose-600 via-red-500 to-rose-400" />
        <CardContent className="space-y-7 p-5 sm:p-8">
          <div className="space-y-3 border-b border-slate-100 pb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
              <Star className="h-3.5 w-3.5" />
              Pesquisa de satisfação
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                {invitation.questionnaire?.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {invitation.questionnaire?.description}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <span className="text-slate-500">Cartório</span>
              <p className="font-bold text-slate-900">
                {invitation.office_name}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="respondent-name"
              className="text-sm font-bold text-slate-900"
            >
              Seu nome <span className="text-rose-600">*</span>
            </Label>
            <Input
              id="respondent-name"
              value={respondentName}
              onChange={(event) => setRespondentName(event.target.value)}
              placeholder={invitation.recipient_name || "Informe seu nome"}
              maxLength={300}
              className="h-11 border-slate-300 bg-white text-slate-950"
            />
          </div>
          <div className="hidden" aria-hidden="true">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </div>

          <div className="space-y-7">
            {questions.map((question, index) => (
              <QuestionField
                key={question.id}
                question={question}
                index={index}
                value={answers[question.id]}
                onChange={(value) =>
                  setAnswers((current) => ({
                    ...current,
                    [question.id]: value,
                  }))
                }
              />
            ))}
          </div>
          {submitError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              {submitError}
            </div>
          )}
          <Button
            className="h-11 w-full bg-rose-600 font-bold text-white hover:bg-rose-700 sm:w-auto sm:px-8"
            disabled={submitting || missingRequired || !respondentName.trim()}
            onClick={submit}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Enviar avaliação
          </Button>
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <LockKeyhole className="h-3.5 w-3.5" />
            Este link é individual e será encerrado após o envio.
          </p>
        </CardContent>
      </Card>
    </PublicShell>
  );
}

function QuestionField({
  question,
  index,
  value,
  onChange,
}: {
  question: NpsQuestion;
  index: number;
  value: NpsAnswers[string] | undefined;
  onChange: (value: NpsAnswers[string]) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex gap-2 text-sm font-bold text-slate-900">
        <span className="text-slate-400">{index + 1}.</span>
        <span>
          {question.title}
          {question.required && <span className="ml-1 text-rose-600">*</span>}
        </span>
      </div>
      {question.type === "nps" && (
        <NpsScale
          value={typeof value === "number" ? value : undefined}
          onChange={onChange}
        />
      )}
      {question.type === "rating" && (
        <RatingScale
          value={typeof value === "number" ? value : undefined}
          onChange={onChange}
        />
      )}
      {question.type === "text" && (
        <Input
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          maxLength={500}
          className="h-11 border-slate-300 bg-white text-slate-950"
        />
      )}
      {question.type === "textarea" && (
        <Textarea
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          maxLength={10_000}
          className="min-h-28 border-slate-300 bg-white text-slate-950"
        />
      )}
      {question.type === "single_choice" && (
        <RadioGroup
          value={typeof value === "string" ? value : ""}
          onValueChange={onChange}
          className="space-y-2"
        >
          {(question.options ?? []).map((option) => (
            <Label
              key={option}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 font-normal text-slate-800 hover:bg-slate-50"
            >
              <RadioGroupItem value={option} />
              {option}
            </Label>
          ))}
        </RadioGroup>
      )}
      {question.type === "multiple_choice" && (
        <div className="space-y-2">
          {(question.options ?? []).map((option) => {
            const selected = Array.isArray(value) ? value : [];
            return (
              <Label
                key={option}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 font-normal text-slate-800 hover:bg-slate-50"
              >
                <Checkbox
                  checked={selected.includes(option)}
                  onCheckedChange={(checked) =>
                    onChange(
                      checked
                        ? [...selected, option]
                        : selected.filter((item) => item !== option),
                    )
                  }
                />
                {option}
              </Label>
            );
          })}
        </div>
      )}
    </section>
  );
}

function NpsScale({
  value,
  onChange,
}: {
  value?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
        {Array.from({ length: 11 }, (_, score) => (
          <button
            key={score}
            type="button"
            aria-label={`Nota ${score}`}
            aria-pressed={value === score}
            onClick={() => onChange(score)}
            className={cn(
              "h-11 rounded-lg border text-sm font-black transition",
              value === score
                ? score >= 9
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : score >= 7
                    ? "border-amber-500 bg-amber-500 text-white"
                    : "border-rose-600 bg-rose-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-rose-300 hover:bg-rose-50",
            )}
          >
            {score}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[11px] font-medium text-slate-500">
        <span className="flex items-center gap-1">
          <Frown className="h-3.5 w-3.5" />
          Nada provável
        </span>
        <span className="hidden items-center gap-1 sm:flex">
          <Meh className="h-3.5 w-3.5" />
          Neutro
        </span>
        <span className="flex items-center gap-1">
          <Smile className="h-3.5 w-3.5" />
          Muito provável
        </span>
      </div>
    </div>
  );
}

function RatingScale({
  value,
  onChange,
}: {
  value?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
        {Array.from({ length: 11 }, (_, score) => (
          <button
            key={score}
            type="button"
            aria-label={`Nota ${score}`}
            aria-pressed={value === score}
            onClick={() => onChange(score)}
            className={cn(
              "h-11 rounded-lg border text-sm font-black transition",
              value === score
                ? "border-rose-600 bg-rose-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-rose-300 hover:bg-rose-50",
            )}
          >
            {score}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[11px] font-medium text-slate-500">
        <span>Nota mínima</span>
        <span>Nota máxima</span>
      </div>
    </div>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 font-black text-white">
            S
          </span>
          <span className="text-xl font-black tracking-tight">
            Siplan <span className="text-rose-600">HUB</span>
          </span>
        </div>
        {children}
        <p className="mt-6 text-center text-xs text-slate-400">
          © 2026 Siplan · Pesquisa segura de satisfação
        </p>
      </div>
    </div>
  );
}
function StateCard({
  icon: Icon,
  title,
  description,
  spin = false,
  success = false,
}: {
  icon: typeof Star;
  title: string;
  description: string;
  spin?: boolean;
  success?: boolean;
}) {
  return (
    <Card className="border-slate-200 bg-white shadow-xl">
      <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
        <span
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full",
            success
              ? "bg-emerald-50 text-emerald-600"
              : "bg-rose-50 text-rose-600",
          )}
        >
          <Icon className={cn("h-7 w-7", spin && "animate-spin")} />
        </span>
        <div>
          <h1 className="text-xl font-black text-slate-950">{title}</h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>
        {success && <Check className="h-5 w-5 text-emerald-600" />}
      </CardContent>
    </Card>
  );
}
function isEmptyAnswer(value: NpsAnswers[string] | undefined) {
  return (
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}
function statusTitle(status: PublicNpsInvitation["status"]) {
  return status === "RESPONDIDO"
    ? "Pesquisa já respondida"
    : status === "EXPIRADO"
      ? "Link expirado"
      : "Pesquisa indisponível";
}
function statusDescription(status: PublicNpsInvitation["status"]) {
  return status === "RESPONDIDO"
    ? "Obrigado! Este convite já recebeu uma resposta."
    : status === "EXPIRADO"
      ? "A validade deste convite terminou. Solicite um novo link à equipe Siplan."
      : "Este convite foi cancelado pela equipe Siplan.";
}
function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "";
}

async function loadInvitation(token: string) {
  const response = await fetch(
    `${functionUrl}?token=${encodeURIComponent(token)}`,
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload.erro ?? "Não foi possível abrir a pesquisa.");
  return payload as PublicNpsInvitation;
}
