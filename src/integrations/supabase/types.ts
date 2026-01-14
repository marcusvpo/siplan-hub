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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      client_contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          document: string | null
          health_status: string | null
          id: string
          name: string
          notes: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          document?: string | null
          health_status?: string | null
          id?: string
          name: string
          notes?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          document?: string | null
          health_status?: string | null
          id?: string
          name?: string
          notes?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      commercial_notes: {
        Row: {
          author_name: string
          client_id: string
          content: string
          created_at: string | null
          deleted_at: string | null
          id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          author_name: string
          client_id: string
          content: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          author_name?: string
          client_id?: string
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commercial_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      project_checklist: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          description: string | null
          id: string
          item_key: string
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          item_key: string
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          item_key?: string
          project_id?: string | null
          updated_at?: string | null
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
          client_id: string | null
          client_name: string
          client_phone: string | null
          commercial_notes: string | null
          commercial_responsible: string | null
          contract_value: number | null
          conversion_complexity: string | null
          conversion_data_origin: string | null
          conversion_end_date: string | null
          conversion_estimated_records: number | null
          conversion_observations: string | null
          conversion_responsible: string | null
          conversion_start_date: string | null
          conversion_status: string
          created_at: string
          environment_access_data: string | null
          environment_created: boolean | null
          environment_end_date: string | null
          environment_observations: string | null
          environment_responsible: string | null
          environment_start_date: string | null
          environment_status: string
          environment_type: string | null
          environment_url: string | null
          follow_up_history: Json[] | null
          global_status: string | null
          go_live_date: string | null
          health_score: string
          id: string
          implementation_checklist_status: string | null
          implementation_end_date: string | null
          implementation_observations: string | null
          implementation_responsible: string | null
          implementation_start_date: string | null
          implementation_status: string
          implementation_training_status: string | null
          impl_status: string | null
          infra_approved_by_infra: boolean | null
          infra_blocking_reason: string | null
          infra_end_date: string | null
          infra_observations: string | null
          infra_responsible: string | null
          infra_server_in_use: string | null
          infra_server_needed: string | null
          infra_server_status: string | null
          infra_start_date: string | null
          infra_stations_status: string | null
          infra_status: string
          infra_technical_notes: string | null
          infra_workstations_status: string | null
          is_archived: boolean | null
          is_deleted: boolean | null
          last_update_by: string
          legacy_system: string | null
          next_follow_up_date: string | null
          op_number: number | null
          overall_progress: number | null
          payment_method: string | null
          post_benefits_delivered: string | null
          post_challenges_found: string | null
          post_client_satisfaction: string | null
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
          sales_order_number: number | null
          sold_hours: number | null
          special_considerations: string | null
          specialty: string | null
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
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          commercial_notes?: string | null
          commercial_responsible?: string | null
          contract_value?: number | null
          conversion_complexity?: string | null
          conversion_data_origin?: string | null
          conversion_end_date?: string | null
          conversion_estimated_records?: number | null
          conversion_observations?: string | null
          conversion_responsible?: string | null
          conversion_start_date?: string | null
          conversion_status?: string
          created_at?: string
          environment_access_data?: string | null
          environment_created?: boolean | null
          environment_end_date?: string | null
          environment_observations?: string | null
          environment_responsible?: string | null
          environment_start_date?: string | null
          environment_status?: string
          environment_type?: string | null
          environment_url?: string | null
          follow_up_history?: Json[] | null
          global_status?: string | null
          go_live_date?: string | null
          health_score?: string
          id?: string
          implementation_checklist_status?: string | null
          implementation_end_date?: string | null
          implementation_observations?: string | null
          implementation_responsible?: string | null
          implementation_start_date?: string | null
          implementation_status?: string
          implementation_training_status?: string | null
          impl_status?: string | null
          infra_approved_by_infra?: boolean | null
          infra_blocking_reason?: string | null
          infra_end_date?: string | null
          infra_observations?: string | null
          infra_responsible?: string | null
          infra_server_in_use?: string | null
          infra_server_needed?: string | null
          infra_server_status?: string | null
          infra_start_date?: string | null
          infra_stations_status?: string | null
          infra_status?: string
          infra_technical_notes?: string | null
          infra_workstations_status?: string | null
          is_archived?: boolean | null
          is_deleted?: boolean | null
          last_update_by?: string
          legacy_system?: string | null
          next_follow_up_date?: string | null
          op_number?: number | null
          overall_progress?: number | null
          payment_method?: string | null
          post_benefits_delivered?: string | null
          post_challenges_found?: string | null
          post_client_satisfaction?: string | null
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
          sales_order_number?: number | null
          sold_hours?: number | null
          special_considerations?: string | null
          specialty?: string | null
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
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          commercial_notes?: string | null
          commercial_responsible?: string | null
          contract_value?: number | null
          conversion_complexity?: string | null
          conversion_data_origin?: string | null
          conversion_end_date?: string | null
          conversion_estimated_records?: number | null
          conversion_observations?: string | null
          conversion_responsible?: string | null
          conversion_start_date?: string | null
          conversion_status?: string
          created_at?: string
          environment_access_data?: string | null
          environment_created?: boolean | null
          environment_end_date?: string | null
          environment_observations?: string | null
          environment_responsible?: string | null
          environment_start_date?: string | null
          environment_status?: string
          environment_type?: string | null
          environment_url?: string | null
          follow_up_history?: Json[] | null
          global_status?: string | null
          go_live_date?: string | null
          health_score?: string
          id?: string
          implementation_checklist_status?: string | null
          implementation_end_date?: string | null
          implementation_observations?: string | null
          implementation_responsible?: string | null
          implementation_start_date?: string | null
          implementation_status?: string
          implementation_training_status?: string | null
          impl_status?: string | null
          infra_approved_by_infra?: boolean | null
          infra_blocking_reason?: string | null
          infra_end_date?: string | null
          infra_observations?: string | null
          infra_responsible?: string | null
          infra_server_in_use?: string | null
          infra_server_needed?: string | null
          infra_server_status?: string | null
          infra_start_date?: string | null
          infra_stations_status?: string | null
          infra_status?: string
          infra_technical_notes?: string | null
          infra_workstations_status?: string | null
          is_archived?: boolean | null
          is_deleted?: boolean | null
          last_update_by?: string
          legacy_system?: string | null
          next_follow_up_date?: string | null
          op_number?: number | null
          overall_progress?: number | null
          payment_method?: string | null
          post_benefits_delivered?: string | null
          post_challenges_found?: string | null
          post_client_satisfaction?: string | null
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
          sales_order_number?: number | null
          sold_hours?: number | null
          special_considerations?: string | null
          specialty?: string | null
          start_date_actual?: string | null
          start_date_planned?: string | null
          system_type?: string
          tags?: string[] | null
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      team_members: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          role: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_roadmap_data: {
        Args: {
          start_date: string
          end_date: string
        }
        Returns: {
          project_id: string
          client_name: string
          system_type: string
          current_stage: string
          stage_status: string
          stage_start_date: string
          stage_end_date: string
          health_score: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type SchemaName = Exclude<keyof Database, "__InternalSupabase">

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: SchemaName },
  TableName extends PublicTableNameOrOptions extends { schema: SchemaName }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: SchemaName }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
      PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: SchemaName },
  TableName extends PublicTableNameOrOptions extends { schema: SchemaName }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: SchemaName }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: SchemaName },
  TableName extends PublicTableNameOrOptions extends { schema: SchemaName }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: SchemaName }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: SchemaName },
  EnumName extends PublicEnumNameOrOptions extends { schema: SchemaName }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: SchemaName }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: SchemaName },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: SchemaName
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: SchemaName }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never
