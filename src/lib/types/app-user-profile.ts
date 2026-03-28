export const DEFAULT_APP_TIMEZONE = 'utc-4';
export const DEFAULT_APP_RISK_PERCENT = 1;
export const DEFAULT_APP_RR_RATIO = 2;
export const DEFAULT_APP_TIMEFRAME = 'h4';

export interface AppUserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  timezone: string | null;
  default_risk_percent: number | null;
  default_rr_ratio: number | null;
  default_timeframe: string | null;
  trading_rules: string[];
  created_at: string | null;
  updated_at: string | null;
}

export interface AppUserProfileUpdate {
  first_name?: string | null;
  last_name?: string | null;
  timezone?: string | null;
  default_risk_percent?: number | null;
  default_rr_ratio?: number | null;
  default_timeframe?: string | null;
  trading_rules?: string[];
}
