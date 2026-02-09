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
      ai_insights: {
        Row: {
          confidence: number | null
          content: string
          created_at: string | null
          data_snapshot: Json | null
          id: string
          insight_type: string
          title: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          content: string
          created_at?: string | null
          data_snapshot?: Json | null
          id?: string
          insight_type: string
          title: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          content?: string
          created_at?: string | null
          data_snapshot?: Json | null
          id?: string
          insight_type?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      backtest_results: {
        Row: {
          avg_r_multiple: number | null
          created_at: string | null
          end_date: string
          id: string
          max_drawdown: number | null
          profit_factor: number | null
          results: Json | null
          start_date: string
          strategy_id: string
          symbol: string
          timeframe: string
          total_pnl: number | null
          total_trades: number | null
          user_id: string
          win_rate: number | null
        }
        Insert: {
          avg_r_multiple?: number | null
          created_at?: string | null
          end_date: string
          id?: string
          max_drawdown?: number | null
          profit_factor?: number | null
          results?: Json | null
          start_date: string
          strategy_id: string
          symbol: string
          timeframe: string
          total_pnl?: number | null
          total_trades?: number | null
          user_id: string
          win_rate?: number | null
        }
        Update: {
          avg_r_multiple?: number | null
          created_at?: string | null
          end_date?: string
          id?: string
          max_drawdown?: number | null
          profit_factor?: number | null
          results?: Json | null
          start_date?: string
          strategy_id?: string
          symbol?: string
          timeframe?: string
          total_pnl?: number | null
          total_trades?: number | null
          user_id?: string
          win_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "backtest_results_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backtest_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          content: Json | null
          created_at: string | null
          entry_date: string
          entry_type: string | null
          folder_id: string | null
          icon: string | null
          id: string
          is_favorite: boolean | null
          title: string | null
          trade_id: string | null
          user_id: string
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          entry_date: string
          entry_type?: string | null
          folder_id?: string | null
          icon?: string | null
          id?: string
          is_favorite?: boolean | null
          title?: string | null
          trade_id?: string | null
          user_id: string
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          entry_date?: string
          entry_type?: string | null
          folder_id?: string | null
          icon?: string | null
          id?: string
          is_favorite?: boolean | null
          title?: string | null
          trade_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mt5_accounts: {
        Row: {
          account_name: string
          balance: number | null
          created_at: string | null
          equity: number | null
          id: string
          login: string
          password: string
          server: string
          terminal_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_name: string
          balance?: number | null
          created_at?: string | null
          equity?: number | null
          id?: string
          login: string
          password: string
          server: string
          terminal_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_name?: string
          balance?: number | null
          created_at?: string | null
          equity?: number | null
          id?: string
          login?: string
          password?: string
          server?: string
          terminal_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      playbooks: {
        Row: {
          ai_generated: boolean | null
          ai_prompt: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          required_rules: string[] | null
          rule_categories: Json | null
          rules: string[] | null
          user_id: string
        }
        Insert: {
          ai_generated?: boolean | null
          ai_prompt?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          required_rules?: string[] | null
          rule_categories?: Json | null
          rules?: string[] | null
          user_id: string
        }
        Update: {
          ai_generated?: boolean | null
          ai_prompt?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          required_rules?: string[] | null
          rule_categories?: Json | null
          rules?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbooks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          default_risk_percent: number | null
          default_rr_ratio: number | null
          first_name: string | null
          id: string
          last_name: string | null
          timezone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          default_risk_percent?: number | null
          default_rr_ratio?: number | null
          first_name?: string | null
          id: string
          last_name?: string | null
          timezone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          default_risk_percent?: number | null
          default_rr_ratio?: number | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          timezone?: string | null
        }
        Relationships: []
      }
      prop_accounts: {
        Row: {
          challenge_id: string | null
          created_at: string | null
          current_balance: number
          current_phase_status: string | null
          daily_dd_current: number | null
          daily_dd_max: number | null
          firm: string
          id: string
          initial_balance: number
          last_synced_at: string | null
          name: string
          phase: string
          profit_target: number | null
          start_date: string
          status: string | null
          total_dd_current: number | null
          total_dd_max: number | null
          user_id: string
        }
        Insert: {
          challenge_id?: string | null
          created_at?: string | null
          current_balance: number
          current_phase_status?: string | null
          daily_dd_current?: number | null
          daily_dd_max?: number | null
          firm: string
          id?: string
          initial_balance: number
          last_synced_at?: string | null
          name: string
          phase: string
          profit_target?: number | null
          start_date: string
          status?: string | null
          total_dd_current?: number | null
          total_dd_max?: number | null
          user_id: string
        }
        Update: {
          challenge_id?: string | null
          created_at?: string | null
          current_balance?: number
          current_phase_status?: string | null
          daily_dd_current?: number | null
          daily_dd_max?: number | null
          firm?: string
          id?: string
          initial_balance?: number
          last_synced_at?: string | null
          name?: string
          phase?: string
          profit_target?: number | null
          start_date?: string
          status?: string | null
          total_dd_current?: number | null
          total_dd_max?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prop_accounts_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "prop_firm_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prop_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prop_firm_challenges: {
        Row: {
          created_at: string | null
          daily_loss_amount: number | null
          daily_loss_percent: number | null
          drawdown_type: string
          firm_id: string
          id: string
          initial_balance: number
          is_active: boolean | null
          max_loss_amount: number | null
          max_loss_percent: number | null
          max_trading_days: number | null
          min_trading_days: number | null
          name: string
          phase_name: string
          phase_order: number
          profit_target_percent: number | null
          trailing_threshold_amount: number | null
        }
        Insert: {
          created_at?: string | null
          daily_loss_amount?: number | null
          daily_loss_percent?: number | null
          drawdown_type?: string
          firm_id: string
          id?: string
          initial_balance: number
          is_active?: boolean | null
          max_loss_amount?: number | null
          max_loss_percent?: number | null
          max_trading_days?: number | null
          min_trading_days?: number | null
          name: string
          phase_name: string
          phase_order?: number
          profit_target_percent?: number | null
          trailing_threshold_amount?: number | null
        }
        Update: {
          created_at?: string | null
          daily_loss_amount?: number | null
          daily_loss_percent?: number | null
          drawdown_type?: string
          firm_id?: string
          id?: string
          initial_balance?: number
          is_active?: boolean | null
          max_loss_amount?: number | null
          max_loss_percent?: number | null
          max_trading_days?: number | null
          min_trading_days?: number | null
          name?: string
          phase_name?: string
          phase_order?: number
          profit_target_percent?: number | null
          trailing_threshold_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prop_firm_challenges_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "prop_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      prop_firms: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      rate_limit_tracking: {
        Row: {
          action: string
          attempted_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          attempted_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          attempted_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      strategy_chats: {
        Row: {
          created_at: string | null
          current_strategy_id: string | null
          id: string
          messages: Json
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_strategy_id?: string | null
          id?: string
          messages?: Json
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_strategy_id?: string | null
          id?: string
          messages?: Json
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_chats_current_strategy_id_fkey"
            columns: ["current_strategy_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_tags: {
        Row: {
          tag_id: string
          trade_id: string
        }
        Insert: {
          tag_id: string
          trade_id: string
        }
        Update: {
          tag_id?: string
          trade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_tags_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          ai_setup_notes: string | null
          ai_setup_score: number | null
          asset_type: string | null
          chart_data: Json | null
          checked_rules: string[] | null
          commission: number | null
          contract_size: number | null
          created_at: string | null
          direction: string
          entry_date: string
          entry_price: number
          execution_grade: string | null
          exit_date: string | null
          exit_price: number | null
          external_deal_id: string | null
          external_id: string | null
          external_ticket: string | null
          feelings: string | null
          id: string
          magic_number: number | null
          mt5_account_id: string | null
          notes: string | null
          observations: string | null
          playbook_id: string | null
          pnl: number | null
          position_size: number
          prop_account_id: string | null
          r_multiple: number | null
          screenshots: Json | null
          status: string | null
          stop_loss: number | null
          swap: number | null
          symbol: string
          take_profit: number | null
          user_id: string
        }
        Insert: {
          ai_setup_notes?: string | null
          ai_setup_score?: number | null
          asset_type?: string | null
          chart_data?: Json | null
          checked_rules?: string[] | null
          commission?: number | null
          contract_size?: number | null
          created_at?: string | null
          direction: string
          entry_date: string
          entry_price: number
          execution_grade?: string | null
          exit_date?: string | null
          exit_price?: number | null
          external_deal_id?: string | null
          external_id?: string | null
          external_ticket?: string | null
          feelings?: string | null
          id?: string
          magic_number?: number | null
          mt5_account_id?: string | null
          notes?: string | null
          observations?: string | null
          playbook_id?: string | null
          pnl?: number | null
          position_size: number
          prop_account_id?: string | null
          r_multiple?: number | null
          screenshots?: Json | null
          status?: string | null
          stop_loss?: number | null
          swap?: number | null
          symbol: string
          take_profit?: number | null
          user_id: string
        }
        Update: {
          ai_setup_notes?: string | null
          ai_setup_score?: number | null
          asset_type?: string | null
          chart_data?: Json | null
          checked_rules?: string[] | null
          commission?: number | null
          contract_size?: number | null
          created_at?: string | null
          direction?: string
          entry_date?: string
          entry_price?: number
          execution_grade?: string | null
          exit_date?: string | null
          exit_price?: number | null
          external_deal_id?: string | null
          external_id?: string | null
          external_ticket?: string | null
          feelings?: string | null
          id?: string
          magic_number?: number | null
          mt5_account_id?: string | null
          notes?: string | null
          observations?: string | null
          playbook_id?: string | null
          pnl?: number | null
          position_size?: number
          prop_account_id?: string | null
          r_multiple?: number | null
          screenshots?: Json | null
          status?: string | null
          stop_loss?: number | null
          swap?: number | null
          symbol?: string
          take_profit?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_mt5_account_id_fkey"
            columns: ["mt5_account_id"]
            isOneToOne: false
            referencedRelation: "mt5_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_prop_account_id_fkey"
            columns: ["prop_account_id"]
            isOneToOne: false
            referencedRelation: "prop_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      trade_analytics: {
        Row: {
          avg_pnl: number | null
          avg_r_multiple: number | null
          losing_trades: number | null
          profit_factor: number | null
          total_pnl: number | null
          total_trades: number | null
          user_id: string | null
          winning_trades: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_r_multiple: {
        Args: {
          direction: string
          entry_price: number
          exit_price: number
          stop_loss: number
        }
        Returns: number
      }
      check_rate_limit:
        | {
            Args: {
              p_action: string
              p_max_requests: number
              p_user_id: string
              p_window_seconds: number
            }
            Returns: boolean
          }
        | {
            Args: {
              p_action: string
              p_max_attempts: number
              p_user_id: string
              p_window_start: string
            }
            Returns: {
              allowed: boolean
              remaining: number
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

// Type aliases for common tables
export type Playbook = Database['public']['Tables']['playbooks']['Row'];
export type PlaybookInsert = Database['public']['Tables']['playbooks']['Insert'];
export type PlaybookUpdate = Database['public']['Tables']['playbooks']['Update'];
export type Trade = Database['public']['Tables']['trades']['Row'];
export type TradeInsert = Database['public']['Tables']['trades']['Insert'];
export type TradeUpdate = Database['public']['Tables']['trades']['Update'];
export type JournalEntry = Database['public']['Tables']['journal_entries']['Row'];
export type JournalEntryInsert = Database['public']['Tables']['journal_entries']['Insert'];
export type PropAccount = Database['public']['Tables']['prop_accounts']['Row'];
export type PropAccountInsert = Database['public']['Tables']['prop_accounts']['Insert'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type MT5Account = Database['public']['Tables']['mt5_accounts']['Row'];

// Manual interface - trade_screenshots table may not exist in remote schema
export interface TradeScreenshot {
    id: string;
    trade_id: string;
    url: string;
    caption?: string | null;
    timeframe?: string | null;
    created_at?: string;
    updated_at?: string;
}

// ChartCandle - manual interface (chart_data table may not exist in remote schema)
export interface ChartCandle {
    id?: string;
    symbol: string;
    datetime: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

// ChartDataResult - for pricing API responses
export interface ChartDataResult {
    candles: ChartCandle[];
    symbol: string;
    interval: string;
    cached?: boolean;
}

export interface PlaybookWithStats extends Playbook {
    win_rate: number;
    total_trades: number;
    profit_factor: number;
    net_pnl: number;
    stats?: {
        winRate: number;
        totalTrades: number;
        profitFactor: number;
        netPnl: number;
    };
}
