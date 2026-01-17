export type DrawdownType = 'balance' | 'equity' | 'relative' | 'trailing';

export interface PropFirm {
    id: string;
    name: string;
    website?: string | null;
    logo_url?: string | null;
    is_active: boolean;
    created_at: string;
}

export interface PropFirmChallenge {
    id: string;
    firm_id: string;
    name: string; // e.g., "100k Swing"
    phase_name: string; // e.g., "Phase 1"
    phase_order: number;

    // Rules
    initial_balance: number;
    daily_loss_percent?: number | null;
    max_loss_percent?: number | null;
    daily_loss_amount?: number | null;
    max_loss_amount?: number | null;

    profit_target_percent?: number | null;
    min_trading_days?: number | null;
    max_trading_days?: number | null;

    // Logic
    drawdown_type: DrawdownType;
    trailing_threshold_amount?: number | null;

    is_active: boolean;
    created_at: string;

    // Joined fields
    firm?: PropFirm;
}

export interface CreateAccountFromChallengeParams {
    userId: string;
    challengeId: string;
    name: string; // User's nickname for the account
    startDate: string;
}

export interface PropAccountWithChallenge extends PropAccount {
    challenge?: PropFirmChallenge;
    current_phase_status?: 'in_progress' | 'passed' | 'failed';
}

// Re-export existing PropAccount for convenience
import { PropAccount } from "../supabase/types";
