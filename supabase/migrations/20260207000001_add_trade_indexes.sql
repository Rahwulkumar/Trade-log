-- Add database indexes for common query patterns
-- These indexes improve performance for frequently used queries

-- Index for user trades sorted by entry date (most common query)
CREATE INDEX IF NOT EXISTS idx_trades_user_entry_date 
ON trades(user_id, entry_date DESC);

-- Index for filtering by entry date and status (analytics queries)
CREATE INDEX IF NOT EXISTS idx_trades_entry_date_status 
ON trades(entry_date, status);

-- Index for prop account trades with status (prop account filtering)
CREATE INDEX IF NOT EXISTS idx_trades_prop_account_status 
ON trades(prop_account_id, status) 
WHERE prop_account_id IS NOT NULL;

-- Index for open trades by user (dashboard queries)
CREATE INDEX IF NOT EXISTS idx_trades_user_status 
ON trades(user_id, status) 
WHERE status = 'open';

-- Index for date range queries (analytics, calendar)
CREATE INDEX IF NOT EXISTS idx_trades_entry_date_range 
ON trades(entry_date) 
WHERE status = 'closed';
