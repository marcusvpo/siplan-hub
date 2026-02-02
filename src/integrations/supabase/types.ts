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
      notifications: {
        Row: {
          id: string
          user_id: string | null
          team: string | null
          project_id: string | null
          type: string
          title: string
          message: string
          action_url: string | null
          read: boolean | null
          created_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          team?: string | null
          project_id?: string | null
          type: string
          title: string
          message: string
          action_url?: string | null
          read?: boolean | null
          created_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          team?: string | null
          project_id?: string | null
          type?: string
          title?: string
          message?: string
          action_url?: string | null
          read?: boolean | null
          created_at?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_queue: {
        Row: {
          id: string
          project_id: string
          sent_by: string | null
          sent_by_name: string
          sent_at: string
          queue_status: string
          priority: number
          assigned_to: string | null
          assigned_to_name: string | null
          assigned_at: string | null
          started_at: string | null
          estimated_completion: string | null
          completed_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          sent_by?: string | null
          sent_by_name: string
          sent_at?: string
          queue_status?: string
          priority?: number
          assigned_to?: string | null
          assigned_to_name?: string | null
          assigned_at?: string | null
          started_at?: string | null
          estimated_completion?: string | null
          completed_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          sent_by?: string | null
          sent_by_name?: string
          sent_at?: string
          queue_status?: string
          priority?: number
          assigned_to?: string | null
          assigned_to_name?: string | null
          assigned_at?: string | null
          started_at?: string | null
          estimated_completion?: string | null
          completed_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversion_queue_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      team_areas: {
        Row: {
          id: string
          name: string
          label: string
          color: string | null
          icon: string | null
          active: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          label: string
          color?: string | null
          icon?: string | null
          active?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          label?: string
          color?: string | null
          icon?: string | null
          active?: boolean | null
          created_at?: string
        }
        Relationships: []
      }
      conversion_mappings: {
        Row: {
          id: string
          project_id: string
          source_origin: string
          origin_table: string
          destination_table: string
          field_mappings: Json | null
          script_snippet: string | null
          script_url: string | null
        }
        Insert: {
          id?: string
          project_id: string
          source_origin: string
          origin_table: string
          destination_table: string
          field_mappings?: Json | null
          script_snippet?: string | null
          script_url?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          source_origin?: string
          origin_table?: string
          destination_table?: string
          field_mappings?: Json | null
          script_snippet?: string | null
          script_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversion_mappings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_issues: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          priority: string
          status: string
          reported_by: string | null
          reported_at: string
          fixed_by: string | null
          fixed_at: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          priority: string
          status?: string
          reported_by?: string | null
          reported_at?: string
          fixed_by?: string | null
          fixed_at?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string | null
          priority?: string
          status?: string
          reported_by?: string | null
          reported_at?: string
          fixed_by?: string | null
          fixed_at?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversion_issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_logs: {
        Row: {
          id: string
          project_id: string
          action_type: string
          details: string | null
          performed_by: string | null
          timestamp: string
          old_value: string | null
          new_value: string | null
        }
        Insert: {
          id?: string
          project_id: string
          action_type: string
          details?: string | null
          performed_by?: string | null
          timestamp?: string
          old_value?: string | null
          new_value?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          action_type?: string
          details?: string | null
          performed_by?: string | null
          timestamp?: string
          old_value?: string | null
          new_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversion_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      homologation_events: {
        Row: {
          id: string
          project_id: string
          from_status: string
          to_status: string
          performed_by: string | null
          performed_by_name: string
          timestamp: string
          notes: string | null
          issues_count: number | null
        }
        Insert: {
          id?: string
          project_id: string
          from_status: string
          to_status: string
          performed_by?: string | null
          performed_by_name: string
          timestamp?: string
          notes?: string | null
          issues_count?: number | null
        }
        Update: {
          id?: string
          project_id?: string
          from_status?: string
          to_status?: string
          performed_by?: string | null
          performed_by_name?: string
          timestamp?: string
          notes?: string | null
          issues_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "homologation_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          role: string | null
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          role?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          role?: string | null
          created_at?: string
        }
        Relationships: []
      }
      roadmaps: {
        Row: {
          id: string
          project_id: string
          share_token: string
          is_active: boolean
          view_count: number
          custom_theme: Json | null
          welcome_message: string | null
          config: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          share_token?: string
          is_active?: boolean
          view_count?: number
          custom_theme?: Json | null
          welcome_message?: string | null
          config?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          share_token?: string
          is_active?: boolean
          view_count?: number
          custom_theme?: Json | null
          welcome_message?: string | null
          config?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmaps_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          value: Json
          description: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          key: string
          value: Json
          description?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          key?: string
          value?: Json
          description?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          name: string
          role: string
          email: string
          avatar_url: string | null
          active: boolean | null
          area: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          role: string
          email: string
          avatar_url?: string | null
          active?: boolean | null
          area?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          role?: string
          email?: string
          avatar_url?: string | null
          active?: boolean | null
          area?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
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
          conversion_finished_at: string | null
          conversion_homologation_date: string | null
          conversion_homologation_responsible: string | null
          conversion_homologation_status: string | null
          conversion_observations: string | null
          conversion_responsible: string | null
          conversion_sent_at: string | null
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
          environment_end_date: string | null
          environment_observations: string | null
          environment_os_version: string | null
          environment_preparation_checklist: string | null
          environment_real_date: string | null
          environment_responsible: string | null
          environment_start_date: string | null
          environment_status: string
          environment_test_available: boolean | null
          environment_version: string | null
          external_id: string | null
          global_status: string | null
          id: string
          implementation_end_date: string | null
          implementation_observations: string | null
          implementation_phase1: Json | null
          implementation_phase2: Json | null
          implementation_responsible: string | null
          implementation_start_date: string | null
          implementation_status: string
          implantation_type: string | null
          infra_blocking_reason: string | null
          infra_end_date: string | null
          infra_observations: string | null
          infra_responsible: string | null
          infra_server_status: string | null
          infra_start_date: string | null
          infra_status: string
          infra_technical_notes: string | null
          infra_workstations_count: number | null
          infra_workstations_status: string | null
          is_archived: boolean | null
          is_deleted: boolean | null
          last_update_by: string
          legacy_system: string | null
          next_follow_up_date: string | null
          notes: Json | null
          op_number: number | null
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
          related_tickets: Json | null
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
          client_name: string
          client_phone?: string | null
          client_primary_contact?: string | null
          contract_value?: number | null
          conversion_complexity?: string | null
          conversion_data_volume_gb?: number | null
          conversion_deviations?: string | null
          conversion_finished_at?: string | null
          conversion_homologation_date?: string | null
          conversion_homologation_responsible?: string | null
          conversion_homologation_status?: string | null
          conversion_observations?: string | null
          conversion_responsible?: string | null
          conversion_sent_at?: string | null
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
          environment_end_date?: string | null
          environment_observations?: string | null
          environment_os_version?: string | null
          environment_preparation_checklist?: string | null
          environment_real_date?: string | null
          environment_responsible?: string | null
          environment_start_date?: string | null
          environment_status?: string
          environment_test_available?: boolean | null
          environment_version?: string | null
          external_id?: string | null
          global_status?: string | null
          id?: string
          implementation_end_date?: string | null
          implementation_observations?: string | null
          implementation_phase1?: Json | null
          implementation_phase2?: Json | null
          implementation_responsible?: string | null
          implementation_start_date?: string | null
          implementation_status?: string
          implantation_type?: string | null
          infra_blocking_reason?: string | null
          infra_end_date?: string | null
          infra_observations?: string | null
          infra_responsible?: string | null
          infra_server_status?: string | null
          infra_start_date?: string | null
          infra_status?: string
          infra_technical_notes?: string | null
          infra_workstations_count?: number | null
          infra_workstations_status?: string | null
          is_archived?: boolean | null
          is_deleted?: boolean | null
          last_update_by: string
          legacy_system?: string | null
          next_follow_up_date?: string | null
          notes?: Json | null
          op_number?: number | null
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
          related_tickets?: Json | null
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
          client_name?: string
          client_phone?: string | null
          client_primary_contact?: string | null
          contract_value?: number | null
          conversion_complexity?: string | null
          conversion_data_volume_gb?: number | null
          conversion_deviations?: string | null
          conversion_finished_at?: string | null
          conversion_homologation_date?: string | null
          conversion_homologation_responsible?: string | null
          conversion_homologation_status?: string | null
          conversion_observations?: string | null
          conversion_responsible?: string | null
          conversion_sent_at?: string | null
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
          environment_end_date?: string | null
          environment_observations?: string | null
          environment_os_version?: string | null
          environment_preparation_checklist?: string | null
          environment_real_date?: string | null
          environment_responsible?: string | null
          environment_start_date?: string | null
          environment_status?: string
          environment_test_available?: boolean | null
          environment_version?: string | null
          external_id?: string | null
          global_status?: string | null
          id?: string
          implementation_end_date?: string | null
          implementation_observations?: string | null
          implementation_phase1?: Json | null
          implementation_phase2?: Json | null
          implementation_responsible?: string | null
          implementation_start_date?: string | null
          implementation_status?: string
          implantation_type?: string | null
          infra_blocking_reason?: string | null
          infra_end_date?: string | null
          infra_observations?: string | null
          infra_responsible?: string | null
          infra_server_status?: string | null
          infra_start_date?: string | null
          infra_status?: string
          infra_technical_notes?: string | null
          infra_workstations_count?: number | null
          infra_workstations_status?: string | null
          is_archived?: boolean | null
          is_deleted?: boolean | null
          last_update_by?: string
          legacy_system?: string | null
          next_follow_up_date?: string | null
          notes?: Json | null
          op_number?: number | null
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
          related_tickets?: Json | null
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
