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
      admin_activity_logs: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          display_order: number
          icon: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      completed_tasks: {
        Row: {
          completed_at: string
          completed_in_time: boolean
          flashcard_id: string | null
          flashcard_type: string
          id: string
          time_spent: number
          user_id: string
          was_timed_task: boolean
        }
        Insert: {
          completed_at?: string
          completed_in_time?: boolean
          flashcard_id?: string | null
          flashcard_type: string
          id?: string
          time_spent?: number
          user_id: string
          was_timed_task?: boolean
        }
        Update: {
          completed_at?: string
          completed_in_time?: boolean
          flashcard_id?: string | null
          flashcard_type?: string
          id?: string
          time_spent?: number
          user_id?: string
          was_timed_task?: boolean
        }
        Relationships: []
      }
      global_flashcards: {
        Row: {
          category: string
          comment: string
          created_at: string
          difficulty: string
          id: string
          is_premium: boolean
          is_timed_task: boolean
          task: string
          time_estimate: number
          time_unit: string
          updated_at: string
        }
        Insert: {
          category: string
          comment: string
          created_at?: string
          difficulty: string
          id?: string
          is_premium?: boolean
          is_timed_task?: boolean
          task: string
          time_estimate: number
          time_unit: string
          updated_at?: string
        }
        Update: {
          category?: string
          comment?: string
          created_at?: string
          difficulty?: string
          id?: string
          is_premium?: boolean
          is_timed_task?: boolean
          task?: string
          time_estimate?: number
          time_unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          message: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          subscription_expires_at: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
          user_number: number | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          subscription_expires_at?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
          user_number?: number | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          subscription_expires_at?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
          user_number?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean | null
          notification_time: string | null
          p256dh: string
          platform: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean | null
          notification_time?: string | null
          p256dh: string
          platform?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean | null
          notification_time?: string | null
          p256dh?: string
          platform?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          user_email: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          user_email: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      user_flashcards: {
        Row: {
          category: string
          comment: string | null
          created_at: string
          difficulty: string
          id: string
          is_timed_task: boolean
          task: string
          time_estimate: number
          time_unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          comment?: string | null
          created_at?: string
          difficulty: string
          id?: string
          is_timed_task?: boolean
          task: string
          time_estimate: number
          time_unit: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          comment?: string | null
          created_at?: string
          difficulty?: string
          id?: string
          is_timed_task?: boolean
          task?: string
          time_estimate?: number
          time_unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          notification_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          notification_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          notification_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_completed_date: string | null
          level: number
          longest_streak: number
          points: number
          unlocked_badges: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_completed_date?: string | null
          level?: number
          longest_streak?: number
          points?: number
          unlocked_badges?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_completed_date?: string | null
          level?: number
          longest_streak?: number
          points?: number
          unlocked_badges?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_push_subscription_status: {
        Args: { p_user_id: string }
        Returns: {
          has_subscription: boolean
          is_active: boolean
          notification_time: string
        }[]
      }
      cleanup_unconfirmed_users_logic: { Args: never; Returns: undefined }
      decrypt_email: { Args: { encrypted_email: string }; Returns: string }
      decrypt_push_data: { Args: { encrypted_text: string }; Returns: string }
      decrypt_with_custom_key: {
        Args: { encrypted_text: string; encryption_key: string }
        Returns: string
      }
      encrypt_email: { Args: { plain_email: string }; Returns: string }
      encrypt_push_data: { Args: { plain_text: string }; Returns: string }
      encrypt_with_custom_key: {
        Args: { encryption_key: string; plain_text: string }
        Returns: string
      }
      get_admin_profiles: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          email: string
          id: string
          subscription_expires_at: string
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
          user_number: number
        }[]
      }
      get_push_subscriptions_decrypted: {
        Args: never
        Returns: {
          auth: string
          endpoint: string
          id: string
          is_active: boolean
          notification_time: string
          p256dh: string
          user_id: string
        }[]
      }
      get_push_subscriptions_decrypted_service: {
        Args: never
        Returns: {
          auth: string
          endpoint: string
          id: string
          is_active: boolean
          notification_time: string
          p256dh: string
          user_id: string
        }[]
      }
      get_support_messages_for_admin: {
        Args: never
        Returns: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          user_email: string
          user_id: string
        }[]
      }
      get_user_email_for_admin: {
        Args: { target_user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_premium: { Args: { _user_id: string }; Returns: boolean }
      log_admin_activity: {
        Args: {
          p_action_type: string
          p_admin_user_id: string
          p_details?: Json
          p_target_id?: string
          p_target_table?: string
        }
        Returns: undefined
      }
      mask_email: { Args: { email: string }; Returns: string }
      save_and_encrypt_subscription: {
        Args: {
          p_auth_plaintext: string
          p_endpoint: string
          p_notification_time: string
          p_p256dh_plaintext: string
          p_platform: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      subscription_status: "free" | "active" | "cancelled" | "expired"
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
      app_role: ["admin", "user"],
      subscription_status: ["free", "active", "cancelled", "expired"],
    },
  },
} as const
