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
      agent_settings: {
        Row: {
          agent_id: string
          id: string
          is_active: boolean
          max_tokens: number
          model: string
          provider: string
          system_prompt: string | null
          temperature: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          id?: string
          is_active?: boolean
          max_tokens?: number
          model?: string
          provider?: string
          system_prompt?: string | null
          temperature?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          id?: string
          is_active?: boolean
          max_tokens?: number
          model?: string
          provider?: string
          system_prompt?: string | null
          temperature?: number
          updated_at?: string
        }
        Relationships: []
      }
      brain_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string
          id: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      brain_documents: {
        Row: {
          category: Database["public"]["Enums"]["brain_category"]
          created_at: string
          description: string | null
          id: string
          is_pinned: boolean
          mime_type: string
          name: string
          original_name: string
          restricted_agents: string[] | null
          section_id: string
          size: number
          sort_order: number | null
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["brain_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_pinned?: boolean
          mime_type: string
          name: string
          original_name: string
          restricted_agents?: string[] | null
          section_id: string
          size?: number
          sort_order?: number | null
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["brain_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_pinned?: boolean
          mime_type?: string
          name?: string
          original_name?: string
          restricted_agents?: string[] | null
          section_id?: string
          size?: number
          sort_order?: number | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brain_documents_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "brain_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brain_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_sections: {
        Row: {
          agent_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          type: Database["public"]["Enums"]["brain_section_type"]
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          type?: Database["public"]["Enums"]["brain_section_type"]
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["brain_section_type"]
          updated_at?: string
        }
        Relationships: []
      }
      branding_settings: {
        Row: {
          app_title: string | null
          created_at: string | null
          favicon_url: string | null
          id: string
          login_logo_url: string | null
          main_logo_url: string | null
          mini_logo_url: string | null
          updated_at: string | null
        }
        Insert: {
          app_title?: string | null
          created_at?: string | null
          favicon_url?: string | null
          id?: string
          login_logo_url?: string | null
          main_logo_url?: string | null
          mini_logo_url?: string | null
          updated_at?: string | null
        }
        Update: {
          app_title?: string | null
          created_at?: string | null
          favicon_url?: string | null
          id?: string
          login_logo_url?: string | null
          main_logo_url?: string | null
          mini_logo_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      console_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          is_image: boolean | null
          mode: string | null
          model: string | null
          provider: string | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_image?: boolean | null
          mode?: string | null
          model?: string | null
          provider?: string | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_image?: boolean | null
          mode?: string | null
          model?: string | null
          provider?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      embedding_jobs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          processed_at: string | null
          retry_count: number | null
          source_id: string
          source_type: Database["public"]["Enums"]["knowledge_source_type"]
          status: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          processed_at?: string | null
          retry_count?: number | null
          source_id: string
          source_type: Database["public"]["Enums"]["knowledge_source_type"]
          status?: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          processed_at?: string | null
          retry_count?: number | null
          source_id?: string
          source_type?: Database["public"]["Enums"]["knowledge_source_type"]
          status?: string
        }
        Relationships: []
      }
      file_settings: {
        Row: {
          allowed_file_types: string[] | null
          auto_delete_trash_days: number | null
          created_at: string | null
          id: string
          max_file_size_mb: number
          total_storage_quota_gb: number
          updated_at: string | null
        }
        Insert: {
          allowed_file_types?: string[] | null
          auto_delete_trash_days?: number | null
          created_at?: string | null
          id?: string
          max_file_size_mb?: number
          total_storage_quota_gb?: number
          updated_at?: string | null
        }
        Update: {
          allowed_file_types?: string[] | null
          auto_delete_trash_days?: number | null
          created_at?: string | null
          id?: string
          max_file_size_mb?: number
          total_storage_quota_gb?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      file_tags: {
        Row: {
          color: string | null
          created_at: string | null
          file_id: string
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          file_id: string
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          file_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_tags_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      file_versions: {
        Row: {
          created_at: string | null
          file_id: string
          id: string
          size: number
          storage_path: string
          version_number: number
        }
        Insert: {
          created_at?: string | null
          file_id: string
          id?: string
          size: number
          storage_path: string
          version_number: number
        }
        Update: {
          created_at?: string | null
          file_id?: string
          id?: string
          size?: number
          storage_path?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "file_versions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_pinned: boolean | null
          is_trashed: boolean | null
          mime_type: string
          name: string
          original_name: string
          sector_id: string | null
          size: number
          storage_path: string
          trashed_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_pinned?: boolean | null
          is_trashed?: boolean | null
          mime_type: string
          name: string
          original_name: string
          sector_id?: string | null
          size?: number
          storage_path: string
          trashed_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_pinned?: boolean | null
          is_trashed?: boolean | null
          mime_type?: string
          name?: string
          original_name?: string
          sector_id?: string | null
          size?: number
          storage_path?: string
          trashed_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      heart_categories: {
        Row: {
          color: string
          created_at: string
          description: string | null
          icon: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      heart_rules: {
        Row: {
          assigned_agents: string[] | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_global: boolean
          name: string
          priority: string
          rule_content: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          assigned_agents?: string[] | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_global?: boolean
          name: string
          priority?: string
          rule_content: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          assigned_agents?: string[] | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_global?: boolean
          name?: string
          priority?: string
          rule_content?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "heart_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_embeddings: {
        Row: {
          chunk_index: number
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          source_id: string
          source_type: Database["public"]["Enums"]["knowledge_source_type"]
          updated_at: string | null
        }
        Insert: {
          chunk_index?: number
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          source_id: string
          source_type: Database["public"]["Enums"]["knowledge_source_type"]
          updated_at?: string | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          source_id?: string
          source_type?: Database["public"]["Enums"]["knowledge_source_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      llm_settings: {
        Row: {
          active_deep_research_provider: string | null
          active_image_provider: string | null
          active_text_provider: string | null
          active_video_provider: string | null
          created_at: string | null

          gemini_enabled: boolean | null
          gemini_image_model: string | null
          gemini_text_model: string | null
          gemini_video_model: string | null
          id: string

          openai_deep_research_model: string | null
          openai_enabled: boolean | null
          openai_image_model: string | null
          openai_text_model: string | null
          openai_video_model: string | null
          updated_at: string | null
        }
        Insert: {
          active_deep_research_provider?: string | null
          active_image_provider?: string | null
          active_text_provider?: string | null
          active_video_provider?: string | null
          created_at?: string | null

          gemini_enabled?: boolean | null
          gemini_image_model?: string | null
          gemini_text_model?: string | null
          gemini_video_model?: string | null
          id?: string

          openai_deep_research_model?: string | null
          openai_enabled?: boolean | null
          openai_image_model?: string | null
          openai_text_model?: string | null
          openai_video_model?: string | null
          updated_at?: string | null
        }
        Update: {
          active_deep_research_provider?: string | null
          active_image_provider?: string | null
          active_text_provider?: string | null
          active_video_provider?: string | null
          created_at?: string | null

          gemini_enabled?: boolean | null
          gemini_image_model?: string | null
          gemini_text_model?: string | null
          gemini_video_model?: string | null
          id?: string

          openai_deep_research_model?: string | null
          openai_enabled?: boolean | null
          openai_image_model?: string | null
          openai_text_model?: string | null
          openai_video_model?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      muse_messages: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_image: boolean | null
          mode: string | null
          role: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_image?: boolean | null
          mode?: string | null
          role: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_image?: boolean | null
          mode?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      muse_settings: {
        Row: {
          allowed_vocabulary: string[]
          blocked_vocabulary: string[]
          brand_tone: Json
          created_at: string
          default_idea_count: number
          default_language: string
          default_mode: string
          default_variants: number
          default_verbosity: string
          diagram_detail: string
          diagram_format: string
          heart_strictness: string
          id: string
          image_aspect_ratio: string
          image_generation_enabled: boolean
          image_model: string
          image_provider: string
          image_style_preset: string
          include_next_actions: boolean
          include_risks: boolean
          include_scoring: boolean
          internal_audit_logging: boolean
          pack_format: string
          refusal_style: string
          retrieval_depth: string
          safety_guard_mode: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_vocabulary?: string[]
          blocked_vocabulary?: string[]
          brand_tone?: Json
          created_at?: string
          default_idea_count?: number
          default_language?: string
          default_mode?: string
          default_variants?: number
          default_verbosity?: string
          diagram_detail?: string
          diagram_format?: string
          heart_strictness?: string
          id?: string
          image_aspect_ratio?: string
          image_generation_enabled?: boolean
          image_model?: string
          image_provider?: string
          image_style_preset?: string
          include_next_actions?: boolean
          include_risks?: boolean
          include_scoring?: boolean
          internal_audit_logging?: boolean
          pack_format?: string
          refusal_style?: string
          retrieval_depth?: string
          safety_guard_mode?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_vocabulary?: string[]
          blocked_vocabulary?: string[]
          brand_tone?: Json
          created_at?: string
          default_idea_count?: number
          default_language?: string
          default_mode?: string
          default_variants?: number
          default_verbosity?: string
          diagram_detail?: string
          diagram_format?: string
          heart_strictness?: string
          id?: string
          image_aspect_ratio?: string
          image_generation_enabled?: boolean
          image_model?: string
          image_provider?: string
          image_style_preset?: string
          include_next_actions?: boolean
          include_risks?: boolean
          include_scoring?: boolean
          internal_audit_logging?: boolean
          pack_format?: string
          refusal_style?: string
          retrieval_depth?: string
          safety_guard_mode?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      osha_audit_logs: {
        Row: {
          brain_chunks_used: number
          compliance_notes: string | null
          compliance_status: string
          created_at: string
          heart_rules_used: Json
          id: string
          llm_model: string | null
          llm_provider: string | null
          message_id: string | null
          retrieval_ms: number | null
          user_id: string
        }
        Insert: {
          brain_chunks_used?: number
          compliance_notes?: string | null
          compliance_status?: string
          created_at?: string
          heart_rules_used?: Json
          id?: string
          llm_model?: string | null
          llm_provider?: string | null
          message_id?: string | null
          retrieval_ms?: number | null
          user_id: string
        }
        Update: {
          brain_chunks_used?: number
          compliance_notes?: string | null
          compliance_status?: string
          created_at?: string
          heart_rules_used?: Json
          id?: string
          llm_model?: string | null
          llm_provider?: string | null
          message_id?: string | null
          retrieval_ms?: number | null
          user_id?: string
        }
        Relationships: []
      }
      osha_messages: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_image: boolean | null
          mode: string | null
          role: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_image?: boolean | null
          mode?: string | null
          role: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_image?: boolean | null
          mode?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      osha_settings: {
        Row: {
          auto_detect_language: boolean
          bubble_accent_color: string
          bubble_button_size: string
          bubble_enabled: boolean
          bubble_greeting: string
          bubble_launch_animation: string
          bubble_name: string
          bubble_panel_size: string
          bubble_position: string
          bubble_quick_starters: Json
          bubble_remember_state: boolean
          bubble_scope: string
          bubble_show_clear_button: boolean
          bubble_show_mode_selector: boolean
          bubble_show_status_dot: boolean
          bubble_sound_enabled: boolean
          bubble_subtitle: string
          chunking_strategy: string
          citation_behavior: boolean
          context_window_messages: number
          created_at: string
          default_language: string
          default_mode: string
          default_verbosity: string
          file_analysis_model: string
          file_analysis_provider: string
          hallucination_control: boolean
          heart_strictness: string
          id: string
          image_aspect_ratio: string
          image_brand_preset: string
          image_default_size: string
          image_generation_enabled: boolean
          image_model: string
          image_provider: string
          internal_audit_logging: boolean
          max_file_size_mb: number
          max_pages_processed: number
          preferred_file_output: string
          refusal_style: string
          response_structure: string
          retrieval_depth: string
          safety_guard_mode: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_detect_language?: boolean
          bubble_accent_color?: string
          bubble_button_size?: string
          bubble_enabled?: boolean
          bubble_greeting?: string
          bubble_launch_animation?: string
          bubble_name?: string
          bubble_panel_size?: string
          bubble_position?: string
          bubble_quick_starters?: Json
          bubble_remember_state?: boolean
          bubble_scope?: string
          bubble_show_clear_button?: boolean
          bubble_show_mode_selector?: boolean
          bubble_show_status_dot?: boolean
          bubble_sound_enabled?: boolean
          bubble_subtitle?: string
          chunking_strategy?: string
          citation_behavior?: boolean
          context_window_messages?: number
          created_at?: string
          default_language?: string
          default_mode?: string
          default_verbosity?: string
          file_analysis_model?: string
          file_analysis_provider?: string
          hallucination_control?: boolean
          heart_strictness?: string
          id?: string
          image_aspect_ratio?: string
          image_brand_preset?: string
          image_default_size?: string
          image_generation_enabled?: boolean
          image_model?: string
          image_provider?: string
          internal_audit_logging?: boolean
          max_file_size_mb?: number
          max_pages_processed?: number
          preferred_file_output?: string
          refusal_style?: string
          response_structure?: string
          retrieval_depth?: string
          safety_guard_mode?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_detect_language?: boolean
          bubble_accent_color?: string
          bubble_button_size?: string
          bubble_enabled?: boolean
          bubble_greeting?: string
          bubble_launch_animation?: string
          bubble_name?: string
          bubble_panel_size?: string
          bubble_position?: string
          bubble_quick_starters?: Json
          bubble_remember_state?: boolean
          bubble_scope?: string
          bubble_show_clear_button?: boolean
          bubble_show_mode_selector?: boolean
          bubble_show_status_dot?: boolean
          bubble_sound_enabled?: boolean
          bubble_subtitle?: string
          chunking_strategy?: string
          citation_behavior?: boolean
          context_window_messages?: number
          created_at?: string
          default_language?: string
          default_mode?: string
          default_verbosity?: string
          file_analysis_model?: string
          file_analysis_provider?: string
          hallucination_control?: boolean
          heart_strictness?: string
          id?: string
          image_aspect_ratio?: string
          image_brand_preset?: string
          image_default_size?: string
          image_generation_enabled?: boolean
          image_model?: string
          image_provider?: string
          internal_audit_logging?: boolean
          max_file_size_mb?: number
          max_pages_processed?: number
          preferred_file_output?: string
          refusal_style?: string
          response_structure?: string
          retrieval_depth?: string
          safety_guard_mode?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pixel_blueprints: {
        Row: {
          aspect_ratio: string | null
          composition_rules: string | null
          created_at: string | null
          description: string | null
          element_rules: string | null
          export_specs: string | null
          format: string | null
          id: string
          name: string
          negative_constraints: string | null
          palette: Json | null
          source: string | null
          style_rules: string | null
          typography_vibe: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          aspect_ratio?: string | null
          composition_rules?: string | null
          created_at?: string | null
          description?: string | null
          element_rules?: string | null
          export_specs?: string | null
          format?: string | null
          id?: string
          name: string
          negative_constraints?: string | null
          palette?: Json | null
          source?: string | null
          style_rules?: string | null
          typography_vibe?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          aspect_ratio?: string | null
          composition_rules?: string | null
          created_at?: string | null
          description?: string | null
          element_rules?: string | null
          export_specs?: string | null
          format?: string | null
          id?: string
          name?: string
          negative_constraints?: string | null
          palette?: Json | null
          source?: string | null
          style_rules?: string | null
          typography_vibe?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pixel_messages: {
        Row: {
          attachments: Json | null
          blueprint_id: string | null
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          is_image: boolean | null
          is_video: boolean | null
          mode: string | null
          role: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          attachments?: Json | null
          blueprint_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_image?: boolean | null
          is_video?: boolean | null
          mode?: string | null
          role: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          attachments?: Json | null
          blueprint_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_image?: boolean | null
          is_video?: boolean | null
          mode?: string | null
          role?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      pixel_settings: {
        Row: {
          allowed_themes: string[]
          allowed_vocabulary: string[]
          blocked_themes: string[]
          blocked_vocabulary: string[]
          character_lock_default: boolean
          created_at: string | null
          default_aesthetic: string
          default_aspect_ratio: string
          default_language: string
          default_mode: string
          default_pack_type: string
          default_resolution: string
          default_variations: number
          default_verbosity: string
          detail_level: string
          heart_strictness: string
          id: string
          image_generation_enabled: boolean
          image_model: string
          image_provider: string
          include_blueprint_summary: boolean
          include_prompt_set: boolean
          include_qa_notes: boolean
          internal_audit_logging: boolean
          lighting: string
          palette_behavior: string
          preferred_file_format: string
          refusal_style: string
          retrieval_depth: string
          reuse_last_blueprint: boolean
          safety_guard_mode: boolean
          style_lock_default: boolean
          texture_level: string
          updated_at: string | null
          user_id: string
          video_generation_enabled: boolean
        }
        Insert: {
          allowed_themes?: string[]
          allowed_vocabulary?: string[]
          blocked_themes?: string[]
          blocked_vocabulary?: string[]
          character_lock_default?: boolean
          created_at?: string | null
          default_aesthetic?: string
          default_aspect_ratio?: string
          default_language?: string
          default_mode?: string
          default_pack_type?: string
          default_resolution?: string
          default_variations?: number
          default_verbosity?: string
          detail_level?: string
          heart_strictness?: string
          id?: string
          image_generation_enabled?: boolean
          image_model?: string
          image_provider?: string
          include_blueprint_summary?: boolean
          include_prompt_set?: boolean
          include_qa_notes?: boolean
          internal_audit_logging?: boolean
          lighting?: string
          palette_behavior?: string
          preferred_file_format?: string
          refusal_style?: string
          retrieval_depth?: string
          reuse_last_blueprint?: boolean
          safety_guard_mode?: boolean
          style_lock_default?: boolean
          texture_level?: string
          updated_at?: string | null
          user_id: string
          video_generation_enabled?: boolean
        }
        Update: {
          allowed_themes?: string[]
          allowed_vocabulary?: string[]
          blocked_themes?: string[]
          blocked_vocabulary?: string[]
          character_lock_default?: boolean
          created_at?: string | null
          default_aesthetic?: string
          default_aspect_ratio?: string
          default_language?: string
          default_mode?: string
          default_pack_type?: string
          default_resolution?: string
          default_variations?: number
          default_verbosity?: string
          detail_level?: string
          heart_strictness?: string
          id?: string
          image_generation_enabled?: boolean
          image_model?: string
          image_provider?: string
          include_blueprint_summary?: boolean
          include_prompt_set?: boolean
          include_qa_notes?: boolean
          internal_audit_logging?: boolean
          lighting?: string
          palette_behavior?: string
          preferred_file_format?: string
          refusal_style?: string
          retrieval_depth?: string
          reuse_last_blueprint?: boolean
          safety_guard_mode?: boolean
          style_lock_default?: boolean
          texture_level?: string
          updated_at?: string | null
          user_id?: string
          video_generation_enabled?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      promptor_runs: {
        Row: {
          blueprint: string | null
          brain_context_used: Json
          brief_summary: string | null
          compliance_notes: string | null
          compliance_status: string
          created_at: string
          derived_brief: Json
          existing_prompt: string | null
          final_prompt_full: string | null
          final_prompt_short: string | null
          heart_rules_used: Json
          id: string
          llm_model: string | null
          llm_provider: string | null
          mode: string
          negatives: string | null
          output_type: string
          qa_checklist: Json
          raw_request: string
          user_id: string
          variants: Json
        }
        Insert: {
          blueprint?: string | null
          brain_context_used?: Json
          brief_summary?: string | null
          compliance_notes?: string | null
          compliance_status?: string
          created_at?: string
          derived_brief?: Json
          existing_prompt?: string | null
          final_prompt_full?: string | null
          final_prompt_short?: string | null
          heart_rules_used?: Json
          id?: string
          llm_model?: string | null
          llm_provider?: string | null
          mode?: string
          negatives?: string | null
          output_type?: string
          qa_checklist?: Json
          raw_request: string
          user_id: string
          variants?: Json
        }
        Update: {
          blueprint?: string | null
          brain_context_used?: Json
          brief_summary?: string | null
          compliance_notes?: string | null
          compliance_status?: string
          created_at?: string
          derived_brief?: Json
          existing_prompt?: string | null
          final_prompt_full?: string | null
          final_prompt_short?: string | null
          heart_rules_used?: Json
          id?: string
          llm_model?: string | null
          llm_provider?: string | null
          mode?: string
          negatives?: string | null
          output_type?: string
          qa_checklist?: Json
          raw_request?: string
          user_id?: string
          variants?: Json
        }
        Relationships: []
      }
      promptor_settings: {
        Row: {
          allowed_vocabulary: string[]
          blocked_vocabulary: string[]
          brand_tone: Json
          citation_mode: boolean
          created_at: string
          default_language: string
          default_output_type: string
          default_variants: number
          default_verbosity: string
          formatting_style: string
          heart_strictness: string
          id: string
          image_aspect_ratio: string
          image_camera_cue_style: string
          image_composition_detail: string
          include_compliance_notes: boolean
          include_full_prompt: boolean
          include_negatives: boolean
          include_qa_checklist: boolean
          include_short_prompt: boolean
          refusal_style: string
          retrieval_depth: string
          safety_guard_mode: boolean
          social_cta_intensity: string
          social_hashtag_behavior: string
          social_platform_default: string
          updated_at: string
          user_id: string
          video_duration_default: string
          video_pacing_style: string
          video_shot_list_style: string
        }
        Insert: {
          allowed_vocabulary?: string[]
          blocked_vocabulary?: string[]
          brand_tone?: Json
          citation_mode?: boolean
          created_at?: string
          default_language?: string
          default_output_type?: string
          default_variants?: number
          default_verbosity?: string
          formatting_style?: string
          heart_strictness?: string
          id?: string
          image_aspect_ratio?: string
          image_camera_cue_style?: string
          image_composition_detail?: string
          include_compliance_notes?: boolean
          include_full_prompt?: boolean
          include_negatives?: boolean
          include_qa_checklist?: boolean
          include_short_prompt?: boolean
          refusal_style?: string
          retrieval_depth?: string
          safety_guard_mode?: boolean
          social_cta_intensity?: string
          social_hashtag_behavior?: string
          social_platform_default?: string
          updated_at?: string
          user_id: string
          video_duration_default?: string
          video_pacing_style?: string
          video_shot_list_style?: string
        }
        Update: {
          allowed_vocabulary?: string[]
          blocked_vocabulary?: string[]
          brand_tone?: Json
          citation_mode?: boolean
          created_at?: string
          default_language?: string
          default_output_type?: string
          default_variants?: number
          default_verbosity?: string
          formatting_style?: string
          heart_strictness?: string
          id?: string
          image_aspect_ratio?: string
          image_camera_cue_style?: string
          image_composition_detail?: string
          include_compliance_notes?: boolean
          include_full_prompt?: boolean
          include_negatives?: boolean
          include_qa_checklist?: boolean
          include_short_prompt?: boolean
          refusal_style?: string
          retrieval_depth?: string
          safety_guard_mode?: boolean
          social_cta_intensity?: string
          social_hashtag_behavior?: string
          social_platform_default?: string
          updated_at?: string
          user_id?: string
          video_duration_default?: string
          video_pacing_style?: string
          video_shot_list_style?: string
        }
        Relationships: []
      }
      quick_prompts: {
        Row: {
          created_at: string | null
          icon: string
          id: string
          is_default: boolean | null
          label: string
          mode: string
          prompt: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          icon?: string
          id?: string
          is_default?: boolean | null
          label: string
          mode: string
          prompt: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          icon?: string
          id?: string
          is_default?: boolean | null
          label?: string
          mode?: string
          prompt?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_prompts: {
        Row: {
          id: string
          agent_id: string
          prompt_key: string
          content: string
          version: number
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          prompt_key: string
          content: string
          version?: number
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          prompt_key?: string
          content?: string
          version?: number
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sectors: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          ai_agents: Database["public"]["Enums"]["permission_level"] | null
          ai_can_access_atlas: boolean | null
          ai_can_access_whisper: boolean | null
          ai_can_access_muse: boolean | null
          ai_can_access_nexus: boolean | null
          ai_can_access_osha: boolean | null
          ai_can_access_pixel: boolean | null
          ai_can_access_promptor: boolean | null
          ai_can_access_pulse: boolean | null
          can_access_branding: boolean | null
          can_access_user_management: boolean | null
          created_at: string | null
          files_can_delete: boolean | null
          files_can_see_admin_files: boolean | null
          files_can_upload: boolean | null
          files_manager: Database["public"]["Enums"]["permission_level"] | null
          id: string
          marketing_can_access_operations: boolean | null
          marketing_can_access_plan: boolean | null
          marketing_hub: Database["public"]["Enums"]["permission_level"] | null
          mastermind: Database["public"]["Enums"]["permission_level"] | null
          mastermind_can_access_brain: boolean | null
          mastermind_can_access_heart: boolean | null
          mastermind_can_create: boolean | null
          mastermind_can_delete: boolean | null
          mastermind_can_edit: boolean | null
          taskforce: Database["public"]["Enums"]["permission_level"] | null
          taskforce_can_create: boolean | null
          taskforce_can_delete: boolean | null
          taskforce_can_edit: boolean | null
          updated_at: string | null
          user_id: string
          wishdom: Database["public"]["Enums"]["permission_level"] | null
          wishdom_can_access_cards: boolean | null
          wishdom_can_access_figurines: boolean | null
          wishdom_can_access_main: boolean | null
          wishdom_can_access_plushes: boolean | null
          wishdom_can_access_stocks: boolean | null
          wishnetrium: Database["public"]["Enums"]["permission_level"] | null
          wishnetrium_can_access_wishfeed: boolean | null
          wishnetrium_can_access_wishper: boolean | null
          wishnetrium_can_access_wishprint: boolean | null
        }
        Insert: {
          ai_agents?: Database["public"]["Enums"]["permission_level"] | null
          ai_can_access_atlas?: boolean | null
          ai_can_access_whisper?: boolean | null
          ai_can_access_muse?: boolean | null
          ai_can_access_nexus?: boolean | null
          ai_can_access_osha?: boolean | null
          ai_can_access_pixel?: boolean | null
          ai_can_access_promptor?: boolean | null
          ai_can_access_pulse?: boolean | null
          can_access_branding?: boolean | null
          can_access_user_management?: boolean | null
          created_at?: string | null
          files_can_delete?: boolean | null
          files_can_see_admin_files?: boolean | null
          files_can_upload?: boolean | null
          files_manager?: Database["public"]["Enums"]["permission_level"] | null
          id?: string
          marketing_can_access_operations?: boolean | null
          marketing_can_access_plan?: boolean | null
          marketing_hub?: Database["public"]["Enums"]["permission_level"] | null
          mastermind?: Database["public"]["Enums"]["permission_level"] | null
          mastermind_can_access_brain?: boolean | null
          mastermind_can_access_heart?: boolean | null
          mastermind_can_create?: boolean | null
          mastermind_can_delete?: boolean | null
          mastermind_can_edit?: boolean | null
          taskforce?: Database["public"]["Enums"]["permission_level"] | null
          taskforce_can_create?: boolean | null
          taskforce_can_delete?: boolean | null
          taskforce_can_edit?: boolean | null
          updated_at?: string | null
          user_id: string
          wishdom?: Database["public"]["Enums"]["permission_level"] | null
          wishdom_can_access_cards?: boolean | null
          wishdom_can_access_figurines?: boolean | null
          wishdom_can_access_main?: boolean | null
          wishdom_can_access_plushes?: boolean | null
          wishdom_can_access_stocks?: boolean | null
          wishnetrium?: Database["public"]["Enums"]["permission_level"] | null
          wishnetrium_can_access_wishfeed?: boolean | null
          wishnetrium_can_access_wishper?: boolean | null
          wishnetrium_can_access_wishprint?: boolean | null
        }
        Update: {
          ai_agents?: Database["public"]["Enums"]["permission_level"] | null
          ai_can_access_atlas?: boolean | null
          ai_can_access_whisper?: boolean | null
          ai_can_access_muse?: boolean | null
          ai_can_access_nexus?: boolean | null
          ai_can_access_osha?: boolean | null
          ai_can_access_pixel?: boolean | null
          ai_can_access_promptor?: boolean | null
          ai_can_access_pulse?: boolean | null
          can_access_branding?: boolean | null
          can_access_user_management?: boolean | null
          created_at?: string | null
          files_can_delete?: boolean | null
          files_can_see_admin_files?: boolean | null
          files_can_upload?: boolean | null
          files_manager?: Database["public"]["Enums"]["permission_level"] | null
          id?: string
          marketing_can_access_operations?: boolean | null
          marketing_can_access_plan?: boolean | null
          marketing_hub?: Database["public"]["Enums"]["permission_level"] | null
          mastermind?: Database["public"]["Enums"]["permission_level"] | null
          mastermind_can_access_brain?: boolean | null
          mastermind_can_access_heart?: boolean | null
          mastermind_can_create?: boolean | null
          mastermind_can_delete?: boolean | null
          mastermind_can_edit?: boolean | null
          taskforce?: Database["public"]["Enums"]["permission_level"] | null
          taskforce_can_create?: boolean | null
          taskforce_can_delete?: boolean | null
          taskforce_can_edit?: boolean | null
          updated_at?: string | null
          user_id?: string
          wishdom?: Database["public"]["Enums"]["permission_level"] | null
          wishdom_can_access_cards?: boolean | null
          wishdom_can_access_figurines?: boolean | null
          wishdom_can_access_main?: boolean | null
          wishdom_can_access_plushes?: boolean | null
          wishdom_can_access_stocks?: boolean | null
          wishnetrium?: Database["public"]["Enums"]["permission_level"] | null
          wishnetrium_can_access_wishfeed?: boolean | null
          wishnetrium_can_access_wishper?: boolean | null
          wishnetrium_can_access_wishprint?: boolean | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishpedia_categories: {
        Row: {
          color: string
          created_at: string
          description: string | null
          has_angle_views: boolean
          icon: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          has_angle_views?: boolean
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          has_angle_views?: boolean
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      wishpedia_entries: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_archived: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishpedia_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "wishpedia_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      wishpedia_entry_images: {
        Row: {
          angle: string | null
          created_at: string
          entry_id: string
          id: string
          is_primary: boolean
          mime_type: string
          original_name: string
          size: number
          sort_order: number
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          angle?: string | null
          created_at?: string
          entry_id: string
          id?: string
          is_primary?: boolean
          mime_type?: string
          original_name: string
          size?: number
          sort_order?: number
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          angle?: string | null
          created_at?: string
          entry_id?: string
          id?: string
          is_primary?: boolean
          mime_type?: string
          original_name?: string
          size?: number
          sort_order?: number
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wishpedia_entry_images_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "wishpedia_entries"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      match_knowledge: {
        Args: {
          filter_agent_id?: string
          filter_source_types?: Database["public"]["Enums"]["knowledge_source_type"][]
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chunk_index: number
          content: string
          id: string
          metadata: Json
          similarity: number
          source_id: string
          source_type: Database["public"]["Enums"]["knowledge_source_type"]
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "agent"
      brain_category: "brand" | "products" | "support" | "operations"
      brain_section_type: "general" | "agent"
      knowledge_source_type: "brain_document" | "heart_rule" | "wishpedia_entry"
      permission_level: "none" | "view" | "limited" | "full"
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
    Enums: {
      app_role: ["admin", "agent"],
      brain_category: ["brand", "products", "support", "operations"],
      brain_section_type: ["general", "agent"],
      knowledge_source_type: [
        "brain_document",
        "heart_rule",
        "wishpedia_entry",
      ],
      permission_level: ["none", "view", "limited", "full"],
    },
  },
} as const
