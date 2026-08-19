export type NpsQuestionType =
  "nps" | "rating" | "text" | "textarea" | "single_choice" | "multiple_choice";

export interface NpsQuestion {
  id: string;
  type: NpsQuestionType;
  title: string;
  required: boolean;
  semantic_key?: "score" | "score_reason" | "improvement_suggestion";
  options?: string[];
}

export interface NpsQuestionnaireTheme {
  primary_color: string;
  background_color: string;
  background_image_path: string | null;
  background_overlay: number;
}

export interface NpsQuestionnaireSnapshot {
  title: string;
  description: string | null;
  questions: NpsQuestion[];
  theme?: NpsQuestionnaireTheme;
}

export interface CsCxNpsQuestionnaire extends NpsQuestionnaireSnapshot {
  id: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type NpsInvitationStatus =
  "PENDENTE" | "RESPONDIDO" | "EXPIRADO" | "CANCELADO";

export interface CsCxNpsInvitation {
  id: string;
  public_token: string;
  questionnaire_id: string;
  registry_office_id: string;
  contact_id: string | null;
  recipient_name: string;
  recipient_email: string | null;
  questionnaire_snapshot: NpsQuestionnaireSnapshot;
  status: NpsInvitationStatus;
  expires_at: string;
  responded_at: string | null;
  response_id: string | null;
  created_at: string;
  registry_office: { id: string; name: string } | null;
  contact: { id: string; contact_person: string } | null;
  questionnaire: { id: string; title: string } | null;
}

export interface PublicNpsInvitation {
  status: NpsInvitationStatus;
  office_name?: string;
  recipient_name?: string;
  expires_at?: string;
  questionnaire?: NpsQuestionnaireSnapshot;
}

export type NpsAnswerValue = string | string[] | number;
export type NpsAnswers = Record<string, NpsAnswerValue>;
