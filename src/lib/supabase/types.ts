export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    first_name: string | null
                    last_name: string | null
                    avatar_url: string | null
                    timezone: string
                    default_risk_percent: number
                    default_rr_ratio: number
                    created_at: string
                }
                Insert: {
                    id: string
                    first_name?: string | null
                    last_name?: string | null
                    avatar_url?: string | null
                    timezone?: string
                    default_risk_percent?: number
                    default_rr_ratio?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    first_name?: string | null
                    last_name?: string | null
                    avatar_url?: string | null
                    timezone?: string
                    default_risk_percent?: number
                    default_rr_ratio?: number
                    created_at?: string
                }
            }
            trades: {
                Row: {
                    id: string
                    user_id: string
                    symbol: string
                    direction: 'LONG' | 'SHORT'
                    entry_price: number
                    exit_price: number | null
                    stop_loss: number | null
                    take_profit: number | null
                    position_size: number
                    pnl: number
                    r_multiple: number | null
                    entry_date: string
                    exit_date: string | null
                    playbook_id: string | null
                    prop_account_id: string | null
                    status: 'open' | 'closed'
                    notes: string | null
                    feelings: string | null
                    observations: string | null
                    screenshots: string[] | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    symbol: string
                    direction: 'LONG' | 'SHORT'
                    entry_price: number
                    exit_price?: number | null
                    stop_loss?: number | null
                    take_profit?: number | null
                    position_size: number
                    pnl?: number
                    r_multiple?: number | null
                    entry_date: string
                    exit_date?: string | null
                    playbook_id?: string | null
                    prop_account_id?: string | null
                    status?: 'open' | 'closed'
                    notes?: string | null
                    feelings?: string | null
                    observations?: string | null
                    screenshots?: string[] | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    symbol?: string
                    direction?: 'LONG' | 'SHORT'
                    entry_price?: number
                    exit_price?: number | null
                    stop_loss?: number | null
                    take_profit?: number | null
                    position_size?: number
                    pnl?: number
                    r_multiple?: number | null
                    entry_date?: string
                    exit_date?: string | null
                    playbook_id?: string | null
                    prop_account_id?: string | null
                    status?: 'open' | 'closed'
                    notes?: string | null
                    feelings?: string | null
                    observations?: string | null
                    screenshots?: string[] | null
                    created_at?: string
                }
            }
            playbooks: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    description: string | null
                    rules: string[] | null
                    is_active: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    name: string
                    description?: string | null
                    rules?: string[] | null
                    is_active?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    description?: string | null
                    rules?: string[] | null
                    is_active?: boolean
                    created_at?: string
                }
            }
            prop_accounts: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    firm: string
                    phase: string
                    initial_balance: number
                    current_balance: number
                    daily_dd_current: number
                    daily_dd_max: number | null
                    total_dd_current: number
                    total_dd_max: number | null
                    profit_target: number | null
                    start_date: string
                    status: string
                    webhook_key: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    name: string
                    firm: string
                    phase: string
                    initial_balance: number
                    current_balance: number
                    daily_dd_current?: number
                    daily_dd_max?: number | null
                    total_dd_current?: number
                    total_dd_max?: number | null
                    profit_target?: number | null
                    start_date: string
                    status?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    firm?: string
                    phase?: string
                    initial_balance?: number
                    current_balance?: number
                    daily_dd_current?: number
                    daily_dd_max?: number | null
                    total_dd_current?: number
                    total_dd_max?: number | null
                    profit_target?: number | null
                    start_date?: string
                    status?: string
                    created_at?: string
                }
            }
            journal_entries: {
                Row: {
                    id: string
                    user_id: string
                    title: string | null
                    content: Json | null
                    entry_date: string
                    entry_type: 'daily' | 'weekly' | 'trade'
                    trade_id: string | null
                    folder_id: string | null
                    is_favorite: boolean
                    icon: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    title?: string | null
                    content?: Json | null
                    entry_date: string
                    entry_type: 'daily' | 'weekly' | 'trade'
                    trade_id?: string | null
                    folder_id?: string | null
                    is_favorite?: boolean
                    icon?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    title?: string | null
                    content?: Json | null
                    entry_date?: string
                    entry_type?: 'daily' | 'weekly' | 'trade'
                    trade_id?: string | null
                    folder_id?: string | null
                    is_favorite?: boolean
                    icon?: string | null
                    created_at?: string
                }
            }
            tags: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    color: string | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    name: string
                    color?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    color?: string | null
                }
            }
            trade_tags: {
                Row: {
                    trade_id: string
                    tag_id: string
                }
                Insert: {
                    trade_id: string
                    tag_id: string
                }
                Update: {
                    trade_id?: string
                    tag_id?: string
                }
            }
        }
        Views: {
            trade_analytics: {
                Row: {
                    user_id: string
                    total_trades: number
                    winning_trades: number
                    losing_trades: number
                    total_pnl: number
                    avg_pnl: number
                    avg_r_multiple: number
                    profit_factor: number
                }
            }
        }
        Functions: {
            calculate_r_multiple: {
                Args: {
                    entry_price: number
                    exit_price: number
                    stop_loss: number
                    direction: string
                }
                Returns: number
            }
        }
    }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Trade = Database['public']['Tables']['trades']['Row']
export type TradeInsert = Database['public']['Tables']['trades']['Insert']
export type TradeUpdate = Database['public']['Tables']['trades']['Update']
export type Playbook = Database['public']['Tables']['playbooks']['Row']
export type PlaybookInsert = Database['public']['Tables']['playbooks']['Insert']
export type PlaybookUpdate = Database['public']['Tables']['playbooks']['Update']
export type PropAccount = Database['public']['Tables']['prop_accounts']['Row']
export type PropAccountInsert = Database['public']['Tables']['prop_accounts']['Insert']
export type JournalEntry = Database['public']['Tables']['journal_entries']['Row']
export type JournalEntryInsert = Database['public']['Tables']['journal_entries']['Insert']
export type Tag = Database['public']['Tables']['tags']['Row']
export type TradeAnalytics = Database['public']['Views']['trade_analytics']['Row']

// MT5 Cloud Integration Types
export interface MT5Connection {
    id: string;
    user_id: string;
    prop_account_id: string;
    meta_api_account_id: string | null;
    server: string;
    login: string;
    password_encrypted: string;
    connection_status: 'undeployed' | 'deploying' | 'deployed' | 'syncing' | 'error';
    last_synced_at: string | null;
    error_message: string | null;
    syncs_this_month: number;
    syncs_reset_at: string;
    created_at: string;
    updated_at: string;
}

