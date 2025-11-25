export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      project_files: {
        Row: {
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string | null
          project_id: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type?: string | null
          project_id: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string | null
          project_id?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          adherence_dev_estimated_date: string | null
          adherence_dev_ticket: string | null
          adherence_end_date: string | null
          adherence_has_product_gap: boolean | null
          adherence_observations: string | null
          adherence_responsible: string | null
          adherence_start_date: string | null
          adherence_status: string
          client_name: string
          conversion_observations: string | null
          conversion_responsible: string | null
          conversion_source_system: string | null
          conversion_status: string
          created_at: string
          environment_approved_by_infra: boolean | null
          environment_observations: string | null
          environment_os_version: string | null
          environment_real_date: string | null
          environment_responsible: string | null
          environment_status: string
          id: string
          implementation_observations: string | null
          implementation_remote_install_date: string | null
          implementation_responsible: string | null
          implementation_status: string
          implementation_switch_type: string | null
          implementation_training_end_date: string | null
          implementation_training_start_date: string | null
          infra_blocking_reason: string | null
          infra_end_date: string | null
          infra_observations: string | null
          infra_responsible: string | null
          infra_start_date: string | null
          infra_status: string
          last_update_by: string
          next_follow_up_date: string | null
          post_end_date: string | null
          post_observations: string | null
          post_responsible: string | null
          post_start_date: string | null
          post_status: string
          project_leader: string
          system_type: string
          ticket_number: string
          updated_at: string
        }
        Insert: {
          adherence_dev_estimated_date?: string | null
          adherence_dev_ticket?: string | null
          adherence_end_date?: string | null
          adherence_has_product_gap?: boolean | null
          adherence_observations?: string | null
          adherence_responsible?: string | null
          adherence_start_date?: string | null
          adherence_status?: string
          client_name: string
          conversion_observations?: string | null
          conversion_responsible?: string | null
          conversion_source_system?: string | null
          conversion_status?: string
          created_at?: string
          environment_approved_by_infra?: boolean | null
          environment_observations?: string | null
          environment_os_version?: string | null
          environment_real_date?: string | null
          environment_responsible?: string | null
          environment_status?: string
          id?: string
          implementation_observations?: string | null
          implementation_remote_install_date?: string | null
          implementation_responsible?: string | null
          implementation_status?: string
          implementation_switch_type?: string | null
          implementation_training_end_date?: string | null
          implementation_training_start_date?: string | null
          infra_blocking_reason?: string | null
          infra_end_date?: string | null
          infra_observations?: string | null
          infra_responsible?: string | null
          infra_start_date?: string | null
          infra_status?: string
          last_update_by: string
          next_follow_up_date?: string | null
          post_end_date?: string | null
          post_observations?: string | null
          post_responsible?: string | null
          post_start_date?: string | null
          post_status?: string
          project_leader: string
          system_type: string
          ticket_number: string
          updated_at?: string
        }
        Update: {
          adherence_dev_estimated_date?: string | null
          adherence_dev_ticket?: string | null
          adherence_end_date?: string | null
          adherence_has_product_gap?: boolean | null
          adherence_observations?: string | null
          adherence_responsible?: string | null
          adherence_start_date?: string | null
          adherence_status?: string
          client_name?: string
          conversion_observations?: string | null
          conversion_responsible?: string | null
          conversion_source_system?: string | null
          conversion_status?: string
          created_at?: string
          environment_approved_by_infra?: boolean | null
          environment_observations?: string | null
          environment_os_version?: string | null
          environment_real_date?: string | null
          environment_responsible?: string | null
          environment_status?: string
          id?: string
          implementation_observations?: string | null
          implementation_remote_install_date?: string | null
          implementation_responsible?: string | null
          implementation_status?: string
          implementation_switch_type?: string | null
          implementation_training_end_date?: string | null
          implementation_training_start_date?: string | null
          infra_blocking_reason?: string | null
          infra_end_date?: string | null
          infra_observations?: string | null
          infra_responsible?: string | null
          infra_start_date?: string | null
          infra_status?: string
          last_update_by?: string
          next_follow_up_date?: string | null
          post_end_date?: string | null
          post_observations?: string | null
          post_responsible?: string | null
          post_start_date?: string | null
          post_status?: string
          project_leader?: string
          system_type?: string
          ticket_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      timeline_events: {
        Row: {
          author: string
          id: string
          message: string
          metadata: Json | null
          project_id: string
          timestamp: string
          type: string
        }
        Insert: {
          author: string
          id?: string
          message: string
          metadata?: Json | null
          project_id: string
          timestamp?: string
          type: string
        }
        Update: {
          author?: string
          id?: string
          message?: string
          metadata?: Json | null
          project_id?: string
          timestamp?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
