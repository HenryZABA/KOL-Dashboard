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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          created_at: string
          id: string
          name: string
          token: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          token: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          token?: string
        }
        Relationships: []
      }
      agency: {
        Row: {
          access_token: string
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          access_token?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      change_log: {
        Row: {
          created_at: string
          from_stage: string | null
          id: string
          kol_id: string
          note: string | null
          to_stage: string
        }
        Insert: {
          created_at?: string
          from_stage?: string | null
          id?: string
          kol_id: string
          note?: string | null
          to_stage: string
        }
        Update: {
          created_at?: string
          from_stage?: string | null
          id?: string
          kol_id?: string
          note?: string | null
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_log_kol_id_fkey"
            columns: ["kol_id"]
            isOneToOne: false
            referencedRelation: "kols"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          agency_id: string | null
          chunk_index: number | null
          content: string
          created_at: string
          file_type: string | null
          file_url: string | null
          id: string
          source_doc_id: string | null
          title: string
        }
        Insert: {
          agency_id?: string | null
          chunk_index?: number | null
          content?: string
          created_at?: string
          file_type?: string | null
          file_url?: string | null
          id?: string
          source_doc_id?: string | null
          title: string
        }
        Update: {
          agency_id?: string | null
          chunk_index?: number | null
          content?: string
          created_at?: string
          file_type?: string | null
          file_url?: string | null
          id?: string
          source_doc_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_source_doc_id_fkey"
            columns: ["source_doc_id"]
            isOneToOne: false
            referencedRelation: "knowledge_base"
            referencedColumns: ["id"]
          },
        ]
      }
      kol: {
        Row: {
          agency_id: string
          content_direction: string | null
          created_at: string
          current_status: string
          current_version: number
          id: string
          is_today_focus: boolean
          last_status_updated_at: string
          name: string
          notes: string | null
          pause_reason: string | null
          platform: string[]
          profile_url: string
          s2a_status: string
          s2a_version: number
          s2b_status: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          content_direction?: string | null
          created_at?: string
          current_status?: string
          current_version?: number
          id?: string
          is_today_focus?: boolean
          last_status_updated_at?: string
          name: string
          notes?: string | null
          pause_reason?: string | null
          platform?: string[]
          profile_url?: string
          s2a_status?: string
          s2a_version?: number
          s2b_status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          content_direction?: string | null
          created_at?: string
          current_status?: string
          current_version?: number
          id?: string
          is_today_focus?: boolean
          last_status_updated_at?: string
          name?: string
          notes?: string | null
          pause_reason?: string | null
          platform?: string[]
          profile_url?: string
          s2a_status?: string
          s2a_version?: number
          s2b_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kol_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
        ]
      }
      kol_conversions: {
        Row: {
          id: string
          kol_id: string
          paid_users: number
          platform: string
          signups: number
          triggered_users: number
          updated_at: string
        }
        Insert: {
          id?: string
          kol_id: string
          paid_users?: number
          platform?: string
          signups?: number
          triggered_users?: number
          updated_at?: string
        }
        Update: {
          id?: string
          kol_id?: string
          paid_users?: number
          platform?: string
          signups?: number
          triggered_users?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kol_conversions_kol_id_fkey"
            columns: ["kol_id"]
            isOneToOne: false
            referencedRelation: "kols"
            referencedColumns: ["id"]
          },
        ]
      }
      kol_publish_card: {
        Row: {
          feishu_doc_url: string
          id: string
          kol_id: string
          review_comment: string | null
          review_status: string
          reviewed_at: string | null
          submitted_at: string
        }
        Insert: {
          feishu_doc_url?: string
          id?: string
          kol_id: string
          review_comment?: string | null
          review_status?: string
          reviewed_at?: string | null
          submitted_at?: string
        }
        Update: {
          feishu_doc_url?: string
          id?: string
          kol_id?: string
          review_comment?: string | null
          review_status?: string
          reviewed_at?: string | null
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kol_publish_card_kol_id_fkey"
            columns: ["kol_id"]
            isOneToOne: true
            referencedRelation: "kol"
            referencedColumns: ["id"]
          },
        ]
      }
      kol_status_log: {
        Row: {
          created_at: string
          from_status: string | null
          id: string
          kol_id: string
          note: string | null
          operator_id: string | null
          operator_type: string
          sub_field: string | null
          to_status: string | null
          version: number | null
        }
        Insert: {
          created_at?: string
          from_status?: string | null
          id?: string
          kol_id: string
          note?: string | null
          operator_id?: string | null
          operator_type?: string
          sub_field?: string | null
          to_status?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string
          from_status?: string | null
          id?: string
          kol_id?: string
          note?: string | null
          operator_id?: string | null
          operator_type?: string
          sub_field?: string | null
          to_status?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kol_status_log_kol_id_fkey"
            columns: ["kol_id"]
            isOneToOne: false
            referencedRelation: "kol"
            referencedColumns: ["id"]
          },
        ]
      }
      kols: {
        Row: {
          agency_id: string
          bitly_link: string | null
          content_direction: string | null
          created_at: string
          current_stage: string
          feishu_url: string | null
          id: string
          is_todays_focus: boolean
          name: string
          notes: string | null
          platforms: string[]
          profile_url: string | null
          project_complete: boolean
          published_at: string | null
          script_complete: boolean
          script_version: number
          stage_links: Json
          stage_updated_at: string
          utm_content: string | null
          utm_link: string | null
          video_version: number
        }
        Insert: {
          agency_id: string
          bitly_link?: string | null
          content_direction?: string | null
          created_at?: string
          current_stage?: string
          feishu_url?: string | null
          id?: string
          is_todays_focus?: boolean
          name: string
          notes?: string | null
          platforms?: string[]
          profile_url?: string | null
          project_complete?: boolean
          published_at?: string | null
          script_complete?: boolean
          script_version?: number
          stage_links?: Json
          stage_updated_at?: string
          utm_content?: string | null
          utm_link?: string | null
          video_version?: number
        }
        Update: {
          agency_id?: string
          bitly_link?: string | null
          content_direction?: string | null
          created_at?: string
          current_stage?: string
          feishu_url?: string | null
          id?: string
          is_todays_focus?: boolean
          name?: string
          notes?: string | null
          platforms?: string[]
          profile_url?: string | null
          project_complete?: boolean
          published_at?: string | null
          script_complete?: boolean
          script_version?: number
          stage_links?: Json
          stage_updated_at?: string
          utm_content?: string | null
          utm_link?: string | null
          video_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "kols_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_summaries: {
        Row: {
          content: string
          created_at: string
          id: string
          summary_date: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          summary_date: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          summary_date?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          reviewed_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          reviewed_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          reviewed_at?: string | null
          status?: string
        }
        Relationships: []
      }
      video_metrics: {
        Row: {
          comments: number
          created_at: string
          id: string
          kol_id: string
          likes: number
          platform: string
          recorded_at: string
          shares: number
          views: number
        }
        Insert: {
          comments?: number
          created_at?: string
          id?: string
          kol_id: string
          likes?: number
          platform: string
          recorded_at?: string
          shares?: number
          views?: number
        }
        Update: {
          comments?: number
          created_at?: string
          id?: string
          kol_id?: string
          likes?: number
          platform?: string
          recorded_at?: string
          shares?: number
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_metrics_kol_id_fkey"
            columns: ["kol_id"]
            isOneToOne: false
            referencedRelation: "kols"
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
