export type DrawdownType = 'balance' | 'equity' | 'relative' | 'trailing' | 'trailing_intraday';

export interface PropFirm {
    id: string;
    name: string;
    website?: string;
    logo_url?: string;
    created_at: string;
}

export interface PropFirmChallenge {
    id: string;
    firm_id: string;
    name: string;
    currency: string;
    initial_balance: number;
    price?: number;

    // Phase 1
    phase_1_target_percent?: number; // 0.10 = 10%
    phase_1_target_amount?: number;

    // Phase 2
    phase_2_target_percent?: number;
    phase_2_target_amount?: number;

    // Risk
    max_daily_loss_percent?: number;
    max_daily_loss_amount?: number;
    max_drawdown_percent?: number;
    max_drawdown_amount?: number;

    drawdown_type: DrawdownType;

    min_trading_days: number;
    time_limit_days?: number; // null = unlimited

    is_active: boolean;
    created_at: string;

    // Joined field (optional)
    prop_firm?: PropFirm;
}
