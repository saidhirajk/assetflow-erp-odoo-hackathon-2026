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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      allocations: {
        Row: {
          actual_return_date: string | null
          allocated_by: string | null
          allocated_date: string
          allocated_to_department_id: string | null
          allocated_to_user_id: string | null
          asset_id: string
          created_at: string
          expected_return_date: string | null
          id: string
          return_condition_notes: string | null
          status: Database["public"]["Enums"]["allocation_status"]
        }
        Insert: {
          actual_return_date?: string | null
          allocated_by?: string | null
          allocated_date?: string
          allocated_to_department_id?: string | null
          allocated_to_user_id?: string | null
          asset_id: string
          created_at?: string
          expected_return_date?: string | null
          id?: string
          return_condition_notes?: string | null
          status?: Database["public"]["Enums"]["allocation_status"]
        }
        Update: {
          actual_return_date?: string | null
          allocated_by?: string | null
          allocated_date?: string
          allocated_to_department_id?: string | null
          allocated_to_user_id?: string | null
          asset_id?: string
          created_at?: string
          expected_return_date?: string | null
          id?: string
          return_condition_notes?: string | null
          status?: Database["public"]["Enums"]["allocation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "allocations_allocated_by_fkey"
            columns: ["allocated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_allocated_to_department_id_fkey"
            columns: ["allocated_to_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_allocated_to_user_id_fkey"
            columns: ["allocated_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_categories: {
        Row: {
          created_at: string
          custom_fields: Json
          id: string
          name: string
          status: Database["public"]["Enums"]["entity_status"]
        }
        Insert: {
          created_at?: string
          custom_fields?: Json
          id?: string
          name: string
          status?: Database["public"]["Enums"]["entity_status"]
        }
        Update: {
          created_at?: string
          custom_fields?: Json
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["entity_status"]
        }
        Relationships: []
      }
      assets: {
        Row: {
          acquisition_cost: number | null
          acquisition_date: string | null
          asset_tag: string
          category_id: string | null
          condition: Database["public"]["Enums"]["asset_condition"]
          created_at: string
          current_holder_user_id: string | null
          custom_values: Json
          department_id: string | null
          document_urls: Json
          id: string
          is_bookable: boolean
          location: string | null
          name: string
          photo_url: string | null
          qr_code: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["asset_status"]
        }
        Insert: {
          acquisition_cost?: number | null
          acquisition_date?: string | null
          asset_tag: string
          category_id?: string | null
          condition?: Database["public"]["Enums"]["asset_condition"]
          created_at?: string
          current_holder_user_id?: string | null
          custom_values?: Json
          department_id?: string | null
          document_urls?: Json
          id?: string
          is_bookable?: boolean
          location?: string | null
          name: string
          photo_url?: string | null
          qr_code?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
        }
        Update: {
          acquisition_cost?: number | null
          acquisition_date?: string | null
          asset_tag?: string
          category_id?: string | null
          condition?: Database["public"]["Enums"]["asset_condition"]
          created_at?: string
          current_holder_user_id?: string | null
          custom_values?: Json
          department_id?: string | null
          document_urls?: Json
          id?: string
          is_bookable?: boolean
          location?: string | null
          name?: string
          photo_url?: string | null
          qr_code?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
        }
        Relationships: [
          {
            foreignKeyName: "assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_current_holder_user_id_fkey"
            columns: ["current_holder_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_auditors: {
        Row: {
          audit_id: string
          user_id: string
        }
        Insert: {
          audit_id: string
          user_id: string
        }
        Update: {
          audit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_auditors_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audit_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_auditors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_cycles: {
        Row: {
          closed_at: string | null
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          name: string
          scope_department_id: string | null
          scope_location: string | null
          start_date: string
          status: Database["public"]["Enums"]["audit_cycle_status"]
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          name: string
          scope_department_id?: string | null
          scope_location?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["audit_cycle_status"]
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          name?: string
          scope_department_id?: string | null
          scope_location?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["audit_cycle_status"]
        }
        Relationships: [
          {
            foreignKeyName: "audit_cycles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_cycles_scope_department_id_fkey"
            columns: ["scope_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_items: {
        Row: {
          asset_id: string
          audit_id: string
          id: string
          marked_by_user_id: string | null
          notes: string | null
          result: Database["public"]["Enums"]["audit_result"]
          updated_at: string
        }
        Insert: {
          asset_id: string
          audit_id: string
          id?: string
          marked_by_user_id?: string | null
          notes?: string | null
          result?: Database["public"]["Enums"]["audit_result"]
          updated_at?: string
        }
        Update: {
          asset_id?: string
          audit_id?: string
          id?: string
          marked_by_user_id?: string | null
          notes?: string | null
          result?: Database["public"]["Enums"]["audit_result"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_items_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audit_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_items_marked_by_user_id_fkey"
            columns: ["marked_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          asset_id: string
          booked_by_user_id: string
          created_at: string
          end_time: string
          id: string
          purpose: string | null
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
        }
        Insert: {
          asset_id: string
          booked_by_user_id: string
          created_at?: string
          end_time: string
          id?: string
          purpose?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Update: {
          asset_id?: string
          booked_by_user_id?: string
          created_at?: string
          end_time?: string
          id?: string
          purpose?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Relationships: [
          {
            foreignKeyName: "bookings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_booked_by_user_id_fkey"
            columns: ["booked_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string
          head_user_id: string | null
          id: string
          name: string
          parent_department_id: string | null
          status: Database["public"]["Enums"]["entity_status"]
        }
        Insert: {
          code: string
          created_at?: string
          head_user_id?: string | null
          id?: string
          name: string
          parent_department_id?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
        }
        Update: {
          code?: string
          created_at?: string
          head_user_id?: string | null
          id?: string
          name?: string
          parent_department_id?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
        }
        Relationships: [
          {
            foreignKeyName: "departments_head_fk"
            columns: ["head_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_parent_department_id_fkey"
            columns: ["parent_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          approved_by: string | null
          asset_id: string
          created_at: string
          id: string
          issue_description: string
          photo_url: string | null
          priority: Database["public"]["Enums"]["priority_level"]
          raised_by_user_id: string
          resolution_notes: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["maintenance_status"]
          technician_name: string | null
        }
        Insert: {
          approved_by?: string | null
          asset_id: string
          created_at?: string
          id?: string
          issue_description: string
          photo_url?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          raised_by_user_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          technician_name?: string | null
        }
        Update: {
          approved_by?: string | null
          asset_id?: string
          created_at?: string
          id?: string
          issue_description?: string
          photo_url?: string | null
          priority?: Database["public"]["Enums"]["priority_level"]
          raised_by_user_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          technician_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_raised_by_user_id_fkey"
            columns: ["raised_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          reference_type: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          reference_type?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department_id: string | null
          email: string
          id: string
          name: string
          status: Database["public"]["Enums"]["entity_status"]
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          email: string
          id: string
          name: string
          status?: Database["public"]["Enums"]["entity_status"]
        }
        Update: {
          created_at?: string
          department_id?: string | null
          email?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["entity_status"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          approved_by: string | null
          asset_id: string
          from_user_id: string | null
          id: string
          reason: string | null
          requested_at: string
          requested_by: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["transfer_status"]
          to_user_id: string
        }
        Insert: {
          approved_by?: string | null
          asset_id: string
          from_user_id?: string | null
          id?: string
          reason?: string | null
          requested_at?: string
          requested_by: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          to_user_id: string
        }
        Update: {
          approved_by?: string | null
          asset_id?: string
          from_user_id?: string | null
          id?: string
          reason?: string | null
          requested_at?: string
          requested_by?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      current_user_department: { Args: never; Returns: string }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      allocation_status: "active" | "returned" | "overdue"
      app_role: "admin" | "asset_manager" | "department_head" | "employee"
      asset_condition: "new" | "good" | "fair" | "poor"
      asset_status:
        | "available"
        | "allocated"
        | "reserved"
        | "under_maintenance"
        | "lost"
        | "retired"
        | "disposed"
      audit_cycle_status: "draft" | "in_progress" | "closed"
      audit_result: "pending" | "verified" | "missing" | "damaged"
      booking_status: "upcoming" | "ongoing" | "completed" | "cancelled"
      entity_status: "active" | "inactive"
      maintenance_status:
        | "pending"
        | "approved"
        | "rejected"
        | "technician_assigned"
        | "in_progress"
        | "resolved"
      notification_type:
        | "asset_assigned"
        | "maintenance_approved"
        | "maintenance_rejected"
        | "booking_confirmed"
        | "booking_cancelled"
        | "booking_reminder"
        | "transfer_requested"
        | "transfer_approved"
        | "transfer_rejected"
        | "overdue_return"
        | "audit_discrepancy"
      priority_level: "low" | "medium" | "high" | "critical"
      transfer_status: "requested" | "approved" | "rejected" | "completed"
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
      allocation_status: ["active", "returned", "overdue"],
      app_role: ["admin", "asset_manager", "department_head", "employee"],
      asset_condition: ["new", "good", "fair", "poor"],
      asset_status: [
        "available",
        "allocated",
        "reserved",
        "under_maintenance",
        "lost",
        "retired",
        "disposed",
      ],
      audit_cycle_status: ["draft", "in_progress", "closed"],
      audit_result: ["pending", "verified", "missing", "damaged"],
      booking_status: ["upcoming", "ongoing", "completed", "cancelled"],
      entity_status: ["active", "inactive"],
      maintenance_status: [
        "pending",
        "approved",
        "rejected",
        "technician_assigned",
        "in_progress",
        "resolved",
      ],
      notification_type: [
        "asset_assigned",
        "maintenance_approved",
        "maintenance_rejected",
        "booking_confirmed",
        "booking_cancelled",
        "booking_reminder",
        "transfer_requested",
        "transfer_approved",
        "transfer_rejected",
        "overdue_return",
        "audit_discrepancy",
      ],
      priority_level: ["low", "medium", "high", "critical"],
      transfer_status: ["requested", "approved", "rejected", "completed"],
    },
  },
} as const
