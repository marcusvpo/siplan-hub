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
      project_checklist: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          description: string | null
          id: string
          label: string
          project_id: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          label: string
          project_id?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          label?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_checklist_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
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
          adherence_analysis_complete: boolean | null
          adherence_conformity_standards: string | null
          adherence_dev_estimated_date: string | null
          adherence_dev_ticket: string | null
          adherence_end_date: string | null
          adherence_gap_description: string | null
          adherence_gap_priority: string | null
          adherence_has_product_gap: boolean | null
          adherence_observations: string | null
          adherence_responsible: string | null
          adherence_start_date: string | null
          adherence_status: string
          archived_at: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          client_primary_contact: string | null
          contract_value: number | null
          conversion_complexity: string | null
          conversion_data_volume_gb: number | null
          conversion_deviations: string | null
          conversion_homologation_complete: boolean | null
          conversion_homologation_date: string | null
          conversion_observations: string | null
          conversion_record_count: number | null
          conversion_responsible: string | null
          conversion_source_system: string | null
          conversion_status: string
          conversion_tool_used: string | null
          created_at: string
          custom_fields: Json | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          end_date_actual: string | null
          end_date_planned: string | null
          environment_approved_by_infra: boolean | null
          environment_observations: string | null
          environment_os_version: string | null
          environment_preparation_checklist: string | null
          environment_real_date: string | null
          environment_responsible: string | null
          environment_status: string
          environment_test_available: boolean | null
          environment_version: string | null
          external_id: string | null
          global_status: string | null
          id: string
          implantation_type: string | null
          implementation_acceptance_status: string | null
          implementation_client_feedback: string | null
          implementation_observations: string | null
          implementation_participants_count: number | null
          implementation_remote_install_date: string | null
          implementation_responsible: string | null
          implementation_status: string
          implementation_switch_end_time: string | null
          implementation_switch_start_time: string | null
          implementation_switch_type: string | null
          implementation_training_end_date: string | null
          implementation_training_location: string | null
          implementation_training_start_date: string | null
          implementation_training_type: string | null
          infra_approved_by_infra: boolean | null
          infra_blocking_reason: string | null
          infra_end_date: string | null
          infra_observations: string | null
          infra_responsible: string | null
          infra_server_in_use: string | null
          infra_server_needed: string | null
          infra_start_date: string | null
          infra_status: string
          infra_technical_notes: string | null
          is_archived: boolean | null
          is_deleted: boolean | null
          last_update_by: string
          next_follow_up_date: string | null
          overall_progress: number | null
          payment_method: string | null
          post_benefits_delivered: string | null
          post_challenges_found: string | null
          post_client_satisfaction: string | null
          post_end_date: string | null
          post_followup_date: string | null
          post_followup_needed: boolean | null
          post_observations: string | null
          post_recommendations: string | null
          post_responsible: string | null
          post_roi_estimated: string | null
          post_start_date: string | null
          post_status: string
          post_support_end_date: string | null
          post_support_period_days: number | null
          priority: string | null
          project_leader: string
          project_type: string | null
          responsible_environment: string | null
          special_considerations: string | null
          start_date_actual: string | null
          start_date_planned: string | null
          system_type: string
          tags: string[] | null
          ticket_number: string
          updated_at: string
        }
        Insert: {
          adherence_analysis_complete?: boolean | null
          adherence_conformity_standards?: string | null
          adherence_dev_estimated_date?: string | null
          adherence_dev_ticket?: string | null
          adherence_end_date?: string | null
          adherence_gap_description?: string | null
          adherence_gap_priority?: string | null
          adherence_has_product_gap?: boolean | null
          adherence_observations?: string | null
          adherence_responsible?: string | null
          adherence_start_date?: string | null
          adherence_status?: string
          archived_at?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          client_primary_contact?: string | null
          contract_value?: number | null
          conversion_complexity?: string | null
          conversion_data_volume_gb?: number | null
          conversion_deviations?: string | null
          conversion_homologation_complete?: boolean | null
          conversion_homologation_date?: string | null
          conversion_observations?: string | null
          conversion_record_count?: number | null
          conversion_responsible?: string | null
          conversion_source_system?: string | null
          conversion_status?: string
          conversion_tool_used?: string | null
          created_at?: string
          custom_fields?: Json | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          end_date_actual?: string | null
          end_date_planned?: string | null
          environment_approved_by_infra?: boolean | null
          environment_observations?: string | null
          environment_os_version?: string | null
          environment_preparation_checklist?: string | null
          environment_real_date?: string | null
          environment_responsible?: string | null
          environment_status?: string
          environment_test_available?: boolean | null
          environment_version?: string | null
          external_id?: string | null
          global_status?: string | null
          id?: string
          implantation_type?: string | null
          implementation_acceptance_status?: string | null
          implementation_client_feedback?: string | null
          implementation_observations?: string | null
          implementation_participants_count?: number | null
          implementation_remote_install_date?: string | null
          implementation_responsible?: string | null
          implementation_status?: string
          implementation_switch_end_time?: string | null
          implementation_switch_start_time?: string | null
          implementation_switch_type?: string | null
          implementation_training_end_date?: string | null
          implementation_training_location?: string | null
          implementation_training_start_date?: string | null
          implementation_training_type?: string | null
          infra_approved_by_infra?: boolean | null
          infra_blocking_reason?: string | null
          infra_end_date?: string | null
          infra_observations?: string | null
          infra_responsible?: string | null
          infra_server_in_use?: string | null
          infra_server_needed?: string | null
          infra_start_date?: string | null
          infra_status?: string
          infra_technical_notes?: string | null
          is_archived?: boolean | null
          is_deleted?: boolean | null
          last_update_by: string
          next_follow_up_date?: string | null
          overall_progress?: number | null
          payment_method?: string | null
          post_benefits_delivered?: string | null
          post_challenges_found?: string | null
          post_client_satisfaction?: string | null
          post_end_date?: string | null
          post_followup_date?: string | null
          post_followup_needed?: boolean | null
          post_observations?: string | null
          post_recommendations?: string | null
          post_responsible?: string | null
          post_roi_estimated?: string | null
          post_start_date?: string | null
          post_status?: string
          post_support_end_date?: string | null
          post_support_period_days?: number | null
          priority?: string | null
          project_leader: string
          project_type?: string | null
          responsible_environment?: string | null
          special_considerations?: string | null
          start_date_actual?: string | null
          start_date_planned?: string | null
          system_type: string
          tags?: string[] | null
          ticket_number: string
          updated_at?: string
        }
        Update: {
          adherence_analysis_complete?: boolean | null
          adherence_conformity_standards?: string | null
          adherence_dev_estimated_date?: string | null
          adherence_dev_ticket?: string | null
          adherence_end_date?: string | null
          adherence_gap_description?: string | null
          adherence_gap_priority?: string | null
          adherence_has_product_gap?: boolean | null
          adherence_observations?: string | null
          adherence_responsible?: string | null
          adherence_start_date?: string | null
          adherence_status?: string
          archived_at?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          client_primary_contact?: string | null
          contract_value?: number | null
          conversion_complexity?: string | null
          conversion_data_volume_gb?: number | null
          conversion_deviations?: string | null
          conversion_homologation_complete?: boolean | null
          conversion_homologation_date?: string | null
          conversion_observations?: string | null
          conversion_record_count?: number | null
          conversion_responsible?: string | null
          conversion_source_system?: string | null
          conversion_status?: string
          conversion_tool_used?: string | null
          created_at?: string
          custom_fields?: Json | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          end_date_actual?: string | null
          end_date_planned?: string | null
          environment_approved_by_infra?: boolean | null
          environment_observations?: string | null
          environment_os_version?: string | null
          environment_preparation_checklist?: string | null
          environment_real_date?: string | null
          environment_responsible?: string | null
          environment_status?: string
          environment_test_available?: boolean | null
          environment_version?: string | null
          external_id?: string | null
          global_status?: string | null
          id?: string
          implantation_type?: string | null
          implementation_acceptance_status?: string | null
          implementation_client_feedback?: string | null
          implementation_observations?: string | null
          implementation_participants_count?: number | null
          implementation_remote_install_date?: string | null
          implementation_responsible?: string | null
          implementation_status?: string
          implementation_switch_end_time?: string | null
          implementation_switch_start_time?: string | null
          implementation_switch_type?: string | null
          implementation_training_end_date?: string | null
          implementation_training_location?: string | null
          implementation_training_start_date?: string | null
          implementation_training_type?: string | null
          infra_approved_by_infra?: boolean | null
          infra_blocking_reason?: string | null
          infra_end_date?: string | null
          infra_observations?: string | null
          infra_responsible?: string | null
          infra_server_in_use?: string | null
          infra_server_needed?: string | null
          infra_start_date?: string | null
          infra_status?: string
          infra_technical_notes?: string | null
          is_archived?: boolean | null
          is_deleted?: boolean | null
          last_update_by?: string
          next_follow_up_date?: string | null
          overall_progress?: number | null
          payment_method?: string | null
          post_benefits_delivered?: string | null
          post_challenges_found?: string | null
          post_client_satisfaction?: string | null
          post_end_date?: string | null
          post_followup_date?: string | null
          post_followup_needed?: boolean | null
          post_observations?: string | null
          post_recommendations?: string | null
          post_responsible?: string | null
          post_roi_estimated?: string | null
          post_start_date?: string | null
          post_status?: string
          post_support_end_date?: string | null
          post_support_period_days?: number | null
          priority?: string | null
          project_leader?: string
          project_type?: string | null
          responsible_environment?: string | null
          special_considerations?: string | null
          start_date_actual?: string | null
          start_date_planned?: string | null
          system_type?: string
          tags?: string[] | null
          ticket_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_filters: {
        Row: {
          created_at: string | null
          created_by: string
          filters: Json
          id: string
          is_public: boolean | null
          name: string
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          filters: Json
          id?: string
          is_public?: boolean | null
          name: string
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          filters?: Json
          id?: string
          is_public?: boolean | null
          name?: string
          usage_count?: number | null
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
