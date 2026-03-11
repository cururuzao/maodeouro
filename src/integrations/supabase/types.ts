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
      disparos: {
        Row: {
          auto_start: boolean
          failed: number
          finished_at: string | null
          id: string
          instance_name: string
          list_id: string | null
          phone_number: string | null
          sent: number
          started_at: string
          status: string
          template_id: string | null
          total: number
          user_id: string | null
          z_api_instance_id: string | null
        }
        Insert: {
          auto_start?: boolean
          failed?: number
          finished_at?: string | null
          id?: string
          instance_name: string
          list_id?: string | null
          phone_number?: string | null
          sent?: number
          started_at?: string
          status?: string
          template_id?: string | null
          total?: number
          user_id?: string | null
          z_api_instance_id?: string | null
        }
        Update: {
          auto_start?: boolean
          failed?: number
          finished_at?: string | null
          id?: string
          instance_name?: string
          list_id?: string | null
          phone_number?: string | null
          sent?: number
          started_at?: string
          status?: string
          template_id?: string | null
          total?: number
          user_id?: string | null
          z_api_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disparos_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lead_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disparos_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disparos_z_api_instance_id_fkey"
            columns: ["z_api_instance_id"]
            isOneToOne: false
            referencedRelation: "z_api_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_configs: {
        Row: {
          api_key: string
          base_url: string
          cloud_api_token: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          base_url: string
          cloud_api_token?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          base_url?: string
          cloud_api_token?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lead_lists: {
        Row: {
          auto_dispatch: boolean
          created_at: string
          description: string | null
          dispatch_template_id: string | null
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          auto_dispatch?: boolean
          created_at?: string
          description?: string | null
          dispatch_template_id?: string | null
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          auto_dispatch?: boolean
          created_at?: string
          description?: string | null
          dispatch_template_id?: string | null
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_lists_dispatch_template_id_fkey"
            columns: ["dispatch_template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          dispatched: boolean
          dispatched_at: string | null
          extra_data: Json | null
          id: string
          list_id: string
          name: string | null
          phone: string
        }
        Insert: {
          created_at?: string
          dispatched?: boolean
          dispatched_at?: string | null
          extra_data?: Json | null
          id?: string
          list_id: string
          name?: string | null
          phone: string
        }
        Update: {
          created_at?: string
          dispatched?: boolean
          dispatched_at?: string | null
          extra_data?: Json | null
          id?: string
          list_id?: string
          name?: string | null
          phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lead_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      public_leads: {
        Row: {
          created_at: string
          email: string
          id: string
          instance_id: string | null
          name: string
          phone: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          instance_id?: string | null
          name: string
          phone: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          instance_id?: string | null
          name?: string
          phone?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_leads_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "z_api_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          name: string
          type: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          name: string
          type?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          name?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      z_api_instances: {
        Row: {
          client_token: string
          created_at: string
          id: string
          instance_id: string
          instance_name: string
          instance_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_token?: string
          created_at?: string
          id?: string
          instance_id: string
          instance_name: string
          instance_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_token?: string
          created_at?: string
          id?: string
          instance_id?: string
          instance_name?: string
          instance_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_all_disparos: {
        Args: never
        Returns: {
          auto_start: boolean
          failed: number
          finished_at: string | null
          id: string
          instance_name: string
          list_id: string | null
          phone_number: string | null
          sent: number
          started_at: string
          status: string
          template_id: string | null
          total: number
          user_id: string | null
          z_api_instance_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "disparos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_get_all_lead_lists: {
        Args: never
        Returns: {
          auto_dispatch: boolean
          created_at: string
          description: string | null
          dispatch_template_id: string | null
          id: string
          name: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "lead_lists"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_get_all_profiles: {
        Args: never
        Returns: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_get_all_templates: {
        Args: never
        Returns: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          name: string
          type: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "templates"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_get_all_users: { Args: never; Returns: Json }
      admin_get_all_z_api_instances: {
        Args: never
        Returns: {
          client_token: string
          created_at: string
          id: string
          instance_id: string
          instance_name: string
          instance_token: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "z_api_instances"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_get_stats: { Args: never; Returns: Json }
      admin_get_user_data: { Args: { _target_user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
