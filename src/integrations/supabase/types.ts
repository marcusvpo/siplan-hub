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
      app_permissions: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          resource: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          resource: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          resource?: string
        }
        Relationships: []
      }
      app_role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "app_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "app_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      conversion_activity_log: {
        Row: {
          action: string
          created_at: string | null
          from_value: string | null
          id: string
          notes: string | null
          performed_by: string | null
          performed_by_name: string | null
          project_id: string | null
          queue_id: string | null
          to_value: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          from_value?: string | null
          id?: string
          notes?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          project_id?: string | null
          queue_id?: string | null
          to_value?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          from_value?: string | null
          id?: string
          notes?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          project_id?: string | null
          queue_id?: string | null
          to_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversion_activity_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_activity_log_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "conversion_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_logs: {
        Row: {
          analyst: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          project_id: string
          time_spent: number
          timestamp: string
          type: string
        }
        Insert: {
          analyst: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          project_id: string
          time_spent?: number
          timestamp?: string
          type: string
        }
        Update: {
          analyst?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          project_id?: string
          time_spent?: number
          timestamp?: string
          type?: string
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
      conversion_posts: {
        Row: {
          author_id: string | null
          author_name: string
          content: string
          created_at: string
          id: string
          image_urls: string[] | null
          post_type: string
          project_id: string
          queue_id: string | null
          stage: string | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name: string
          content: string
          created_at?: string
          id?: string
          image_urls?: string[] | null
          post_type?: string
          project_id: string
          queue_id?: string | null
          stage?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          image_urls?: string[] | null
          post_type?: string
          project_id?: string
          queue_id?: string | null
          stage?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversion_posts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_posts_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "conversion_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_queue: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          assigned_to_name: string | null
          completed_at: string | null
          created_at: string | null
          engine_notes: string | null
          engine_requested_at: string | null
          engine_requested_by: string | null
          engine_requested_by_name: string | null
          engine_status: string | null
          estimated_completion: string | null
          homologation_analyst: string | null
          homologation_analyst_name: string | null
          homologation_deadline: string | null
          homologation_sent_at: string | null
          homologation_status: string | null
          id: string
          notes: string | null
          priority: number | null
          project_id: string | null
          queue_status: string | null
          sent_at: string | null
          sent_by: string | null
          sent_by_name: string
          started_at: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          completed_at?: string | null
          created_at?: string | null
          engine_notes?: string | null
          engine_requested_at?: string | null
          engine_requested_by?: string | null
          engine_requested_by_name?: string | null
          engine_status?: string | null
          estimated_completion?: string | null
          homologation_analyst?: string | null
          homologation_analyst_name?: string | null
          homologation_deadline?: string | null
          homologation_sent_at?: string | null
          homologation_status?: string | null
          id?: string
          notes?: string | null
          priority?: number | null
          project_id?: string | null
          queue_status?: string | null
          sent_at?: string | null
          sent_by?: string | null
          sent_by_name: string
          started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          completed_at?: string | null
          created_at?: string | null
          engine_notes?: string | null
          engine_requested_at?: string | null
          engine_requested_by?: string | null
          engine_requested_by_name?: string | null
          engine_status?: string | null
          estimated_completion?: string | null
          homologation_analyst?: string | null
          homologation_analyst_name?: string | null
          homologation_deadline?: string | null
          homologation_sent_at?: string | null
          homologation_status?: string | null
          id?: string
          notes?: string | null
          priority?: number | null
          project_id?: string | null
          queue_status?: string | null
          sent_at?: string | null
          sent_by?: string | null
          sent_by_name?: string
          started_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversion_queue_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_queue_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversion_queue_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documentation_layouts: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          fields: Json
          id: string
          legacy_system_name: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields?: Json
          id?: string
          legacy_system_name: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields?: Json
          id?: string
          legacy_system_name?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      homologation_events: {
        Row: {
          from_status: string
          id: string
          issues_count: number | null
          notes: string | null
          performed_by: string | null
          performed_by_name: string
          project_id: string
          timestamp: string
          to_status: string
        }
        Insert: {
          from_status: string
          id?: string
          issues_count?: number | null
          notes?: string | null
          performed_by?: string | null
          performed_by_name: string
          project_id: string
          timestamp?: string
          to_status: string
        }
        Update: {
          from_status?: string
          id?: string
          issues_count?: number | null
          notes?: string | null
          performed_by?: string | null
          performed_by_name?: string
          project_id?: string
          timestamp?: string
          to_status?: string
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
      implantador_vacations: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          implantador_id: string | null
          implantador_name: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          implantador_id?: string | null
          implantador_name: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          implantador_id?: string | null
          implantador_name?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "implantador_vacations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          message: string
          project_id: string | null
          read: boolean | null
          read_at: string | null
          team: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          message: string
          project_id?: string | null
          read?: boolean | null
          read_at?: string | null
          team?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          message?: string
          project_id?: string | null
          read?: boolean | null
          read_at?: string | null
          team?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          team: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          team?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          team?: string | null
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
      project_documentation_mappings: {
        Row: {
          created_at: string
          created_by: string | null
          field_mappings: Json
          id: string
          layout_id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          field_mappings?: Json
          id?: string
          layout_id: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          field_mappings?: Json
          id?: string
          layout_id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_documentation_mappings_layout_id_fkey"
            columns: ["layout_id"]
            isOneToOne: false
            referencedRelation: "documentation_layouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documentation_mappings_project_id_fkey"
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
          adherence_responsible_id: string | null
          adherence_start_date: string | null
          adherence_status: string
          archived_at: string | null
          client_email: string | null
          client_id: string | null
          client_name: string
          client_phone: string | null
          client_primary_contact: string | null
          commercial_notes: string | null
          contract_value: number | null
          conversion_approved_at: string | null
          conversion_approved_by: string | null
          conversion_complexity: string | null
          conversion_data_volume_gb: number | null
          conversion_deviations: string | null
          conversion_end_date: string | null
          conversion_finished_at: string | null
          conversion_homologation_complete: boolean | null
          conversion_homologation_date: string | null
          conversion_homologation_responsible: string | null
          conversion_homologation_responsible_id: string | null
          conversion_homologation_status: string | null
          conversion_homologation_workflow_status: string | null
          conversion_last_version_sent_at: string | null
          conversion_last_version_sent_by: string | null
          conversion_observations: string | null
          conversion_record_count: number | null
          conversion_responsible: string | null
          conversion_responsible_id: string | null
          conversion_sent_at: string | null
          conversion_source_system: string | null
          conversion_start_date: string | null
          conversion_status: string
          conversion_tool_used: string | null
          created_at: string
          custom_fields: Json | null
          deleted_at: string | null
          deleted_by: string | null
          descricaotramite: string | null
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
          environment_responsible_id: string | null
          environment_start_date: string | null
          environment_status: string
          environment_test_available: boolean | null
          environment_version: string | null
          EtapasProjeto: string | null
          external_id: string | null
          global_status: string | null
          id: string
          implantation_type: string | null
          implementation_acceptance_status: string | null
          implementation_client_feedback: string | null
          implementation_end_date: string | null
          implementation_observations: string | null
          implementation_participants_count: number | null
          implementation_phase1: Json | null
          implementation_phase2: Json | null
          implementation_remote_install_date: string | null
          implementation_responsible: string | null
          implementation_responsible_id: string | null
          implementation_start_date: string | null
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
          infra_responsible_id: string | null
          infra_server_in_use: string | null
          infra_server_needed: string | null
          infra_server_status: string | null
          infra_start_date: string | null
          infra_stations_status: string | null
          infra_status: string
          infra_technical_notes: string | null
          infra_workstations_count: number | null
          infra_workstations_status: string | null
          is_archived: boolean | null
          is_deleted: boolean | null
          last_update_by: string
          legacy_system: string | null
          modelos_editor_available_files: Json | null
          modelos_editor_end_date: string | null
          modelos_editor_observations: string | null
          modelos_editor_responsible: string | null
          modelos_editor_sent_files: Json | null
          modelos_editor_start_date: string | null
          modelos_editor_status: string
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
          post_responsible_id: string | null
          post_roi_estimated: string | null
          post_start_date: string | null
          post_status: string
          post_support_end_date: string | null
          post_support_period_days: number | null
          priority: string | null
          products: string[] | null
          project_leader: string
          project_leader_id: string | null
          project_type: string | null
          related_tickets: Json | null
          released_for_conversion: boolean | null
          released_for_conversion_at: string | null
          released_for_conversion_by: string | null
          ResponsavelAtividade: string | null
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
          TituloChamado: string | null
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
          adherence_responsible_id?: string | null
          adherence_start_date?: string | null
          adherence_status?: string
          archived_at?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          client_primary_contact?: string | null
          commercial_notes?: string | null
          contract_value?: number | null
          conversion_approved_at?: string | null
          conversion_approved_by?: string | null
          conversion_complexity?: string | null
          conversion_data_volume_gb?: number | null
          conversion_deviations?: string | null
          conversion_end_date?: string | null
          conversion_finished_at?: string | null
          conversion_homologation_complete?: boolean | null
          conversion_homologation_date?: string | null
          conversion_homologation_responsible?: string | null
          conversion_homologation_responsible_id?: string | null
          conversion_homologation_status?: string | null
          conversion_homologation_workflow_status?: string | null
          conversion_last_version_sent_at?: string | null
          conversion_last_version_sent_by?: string | null
          conversion_observations?: string | null
          conversion_record_count?: number | null
          conversion_responsible?: string | null
          conversion_responsible_id?: string | null
          conversion_sent_at?: string | null
          conversion_source_system?: string | null
          conversion_start_date?: string | null
          conversion_status?: string
          conversion_tool_used?: string | null
          created_at?: string
          custom_fields?: Json | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricaotramite?: string | null
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
          environment_responsible_id?: string | null
          environment_start_date?: string | null
          environment_status?: string
          environment_test_available?: boolean | null
          environment_version?: string | null
          EtapasProjeto?: string | null
          external_id?: string | null
          global_status?: string | null
          id?: string
          implantation_type?: string | null
          implementation_acceptance_status?: string | null
          implementation_client_feedback?: string | null
          implementation_end_date?: string | null
          implementation_observations?: string | null
          implementation_participants_count?: number | null
          implementation_phase1?: Json | null
          implementation_phase2?: Json | null
          implementation_remote_install_date?: string | null
          implementation_responsible?: string | null
          implementation_responsible_id?: string | null
          implementation_start_date?: string | null
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
          infra_responsible_id?: string | null
          infra_server_in_use?: string | null
          infra_server_needed?: string | null
          infra_server_status?: string | null
          infra_start_date?: string | null
          infra_stations_status?: string | null
          infra_status?: string
          infra_technical_notes?: string | null
          infra_workstations_count?: number | null
          infra_workstations_status?: string | null
          is_archived?: boolean | null
          is_deleted?: boolean | null
          last_update_by: string
          legacy_system?: string | null
          modelos_editor_available_files?: Json | null
          modelos_editor_end_date?: string | null
          modelos_editor_observations?: string | null
          modelos_editor_responsible?: string | null
          modelos_editor_sent_files?: Json | null
          modelos_editor_start_date?: string | null
          modelos_editor_status?: string
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
          post_responsible_id?: string | null
          post_roi_estimated?: string | null
          post_start_date?: string | null
          post_status?: string
          post_support_end_date?: string | null
          post_support_period_days?: number | null
          priority?: string | null
          products?: string[] | null
          project_leader: string
          project_leader_id?: string | null
          project_type?: string | null
          related_tickets?: Json | null
          released_for_conversion?: boolean | null
          released_for_conversion_at?: string | null
          released_for_conversion_by?: string | null
          ResponsavelAtividade?: string | null
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
          TituloChamado?: string | null
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
          adherence_responsible_id?: string | null
          adherence_start_date?: string | null
          adherence_status?: string
          archived_at?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          client_primary_contact?: string | null
          commercial_notes?: string | null
          contract_value?: number | null
          conversion_approved_at?: string | null
          conversion_approved_by?: string | null
          conversion_complexity?: string | null
          conversion_data_volume_gb?: number | null
          conversion_deviations?: string | null
          conversion_end_date?: string | null
          conversion_finished_at?: string | null
          conversion_homologation_complete?: boolean | null
          conversion_homologation_date?: string | null
          conversion_homologation_responsible?: string | null
          conversion_homologation_responsible_id?: string | null
          conversion_homologation_status?: string | null
          conversion_homologation_workflow_status?: string | null
          conversion_last_version_sent_at?: string | null
          conversion_last_version_sent_by?: string | null
          conversion_observations?: string | null
          conversion_record_count?: number | null
          conversion_responsible?: string | null
          conversion_responsible_id?: string | null
          conversion_sent_at?: string | null
          conversion_source_system?: string | null
          conversion_start_date?: string | null
          conversion_status?: string
          conversion_tool_used?: string | null
          created_at?: string
          custom_fields?: Json | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricaotramite?: string | null
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
          environment_responsible_id?: string | null
          environment_start_date?: string | null
          environment_status?: string
          environment_test_available?: boolean | null
          environment_version?: string | null
          EtapasProjeto?: string | null
          external_id?: string | null
          global_status?: string | null
          id?: string
          implantation_type?: string | null
          implementation_acceptance_status?: string | null
          implementation_client_feedback?: string | null
          implementation_end_date?: string | null
          implementation_observations?: string | null
          implementation_participants_count?: number | null
          implementation_phase1?: Json | null
          implementation_phase2?: Json | null
          implementation_remote_install_date?: string | null
          implementation_responsible?: string | null
          implementation_responsible_id?: string | null
          implementation_start_date?: string | null
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
          infra_responsible_id?: string | null
          infra_server_in_use?: string | null
          infra_server_needed?: string | null
          infra_server_status?: string | null
          infra_start_date?: string | null
          infra_stations_status?: string | null
          infra_status?: string
          infra_technical_notes?: string | null
          infra_workstations_count?: number | null
          infra_workstations_status?: string | null
          is_archived?: boolean | null
          is_deleted?: boolean | null
          last_update_by?: string
          legacy_system?: string | null
          modelos_editor_available_files?: Json | null
          modelos_editor_end_date?: string | null
          modelos_editor_observations?: string | null
          modelos_editor_responsible?: string | null
          modelos_editor_sent_files?: Json | null
          modelos_editor_start_date?: string | null
          modelos_editor_status?: string
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
          post_responsible_id?: string | null
          post_roi_estimated?: string | null
          post_start_date?: string | null
          post_status?: string
          post_support_end_date?: string | null
          post_support_period_days?: number | null
          priority?: string | null
          products?: string[] | null
          project_leader?: string
          project_leader_id?: string | null
          project_type?: string | null
          related_tickets?: Json | null
          released_for_conversion?: boolean | null
          released_for_conversion_at?: string | null
          released_for_conversion_by?: string | null
          ResponsavelAtividade?: string | null
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
          TituloChamado?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_adherence_responsible_id_fkey"
            columns: ["adherence_responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_conversion_homologation_responsible_id_fkey"
            columns: ["conversion_homologation_responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_conversion_responsible_id_fkey"
            columns: ["conversion_responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_environment_responsible_id_fkey"
            columns: ["environment_responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_implementation_responsible_id_fkey"
            columns: ["implementation_responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_infra_responsible_id_fkey"
            columns: ["infra_responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_post_responsible_id_fkey"
            columns: ["post_responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_project_leader_id_fkey"
            columns: ["project_leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      responsible_name_mapping: {
        Row: {
          created_at: string | null
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "responsible_name_mapping_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmaps: {
        Row: {
          config: Json | null
          created_at: string
          custom_theme: Json | null
          id: string
          is_active: boolean
          project_id: string
          share_token: string
          updated_at: string
          view_count: number
          welcome_message: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string
          custom_theme?: Json | null
          id?: string
          is_active?: boolean
          project_id: string
          share_token?: string
          updated_at?: string
          view_count?: number
          welcome_message?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string
          custom_theme?: Json | null
          id?: string
          is_active?: boolean
          project_id?: string
          share_token?: string
          updated_at?: string
          view_count?: number
          welcome_message?: string | null
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
      settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      team_areas: {
        Row: {
          active: boolean | null
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          label: string
          name: string
        }
        Insert: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          label: string
          name: string
        }
        Update: {
          active?: boolean | null
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          label?: string
          name?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          active: boolean | null
          area: string | null
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          role: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          area?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          role: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          area?: string | null
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
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          label: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          label: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          value?: string
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
      create_new_user: {
        Args: {
          email: string
          full_name: string
          password: string
          role: string
        }
        Returns: string
      }
      create_notification: {
        Args: {
          p_action_url?: string
          p_message: string
          p_project_id: string
          p_team: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      get_db_size: { Args: never; Returns: number }
      get_roadmap_data: { Args: { token_uuid: string }; Returns: Json }
      get_storage_size: { Args: never; Returns: number }
      sync_0800_project:
        | {
            Args: {
              p_client_name: string
              p_descricaotramite: string
              p_description: string
              p_etapas_projeto: string
              p_op_number: number
              p_responsavel_atividade: string
              p_sales_order_number: number
              p_system_type: string
              p_ticket_number: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_client_name: string
              p_descricao_tramite: string
              p_etapas_projeto: string
              p_op_number: number
              p_project_leader: string
              p_responsavel_atividade: string
              p_sales_order_number: number
              p_system_type: string
              p_ticket_number: string
              p_titulo_chamado: string
            }
            Returns: undefined
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
