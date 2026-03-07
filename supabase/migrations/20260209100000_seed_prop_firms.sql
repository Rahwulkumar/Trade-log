-- Seed popular prop firms and their challenges so users see options by default.
-- Safe to run multiple times: only inserts if no rows exist.

INSERT INTO prop_firms (id, name, website, is_active, created_at, updated_at)
VALUES
  ('a0000001-0001-4000-8000-000000000001', 'FTMO', 'https://ftmo.com', true, NOW(), NOW()),
  ('a0000002-0002-4000-8000-000000000002', 'Apex Trader Funding', 'https://apextraderfunding.com', true, NOW(), NOW()),
  ('a0000003-0003-4000-8000-000000000003', 'Topstep', 'https://topstep.com', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- FTMO challenges
INSERT INTO prop_firm_challenges (id, firm_id, name, phase_name, phase_order, initial_balance, daily_loss_percent, max_loss_percent, profit_target_percent, drawdown_type, is_active, created_at)
VALUES
  ('b0000001-1001-4000-8000-000000000001', 'a0000001-0001-4000-8000-000000000001', 'FTMO 10k', 'Phase 1', 1, 10000, 5, 10, 10, 'balance', true, NOW()),
  ('b0000001-1002-4000-8000-000000000002', 'a0000001-0001-4000-8000-000000000001', 'FTMO 25k', 'Phase 1', 1, 25000, 5, 10, 10, 'balance', true, NOW()),
  ('b0000001-1003-4000-8000-000000000003', 'a0000001-0001-4000-8000-000000000001', 'FTMO 50k', 'Phase 1', 1, 50000, 5, 10, 10, 'balance', true, NOW()),
  ('b0000001-1004-4000-8000-000000000004', 'a0000001-0001-4000-8000-000000000001', 'FTMO 100k', 'Phase 1', 1, 100000, 5, 10, 10, 'balance', true, NOW()),
  ('b0000001-2001-4000-8000-000000000005', 'a0000001-0001-4000-8000-000000000001', 'FTMO 10k', 'Phase 2', 2, 10000, 5, 10, 5, 'balance', true, NOW()),
  ('b0000001-2002-4000-8000-000000000006', 'a0000001-0001-4000-8000-000000000001', 'FTMO 100k', 'Phase 2', 2, 100000, 5, 10, 5, 'balance', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- Apex challenges (example)
INSERT INTO prop_firm_challenges (id, firm_id, name, phase_name, phase_order, initial_balance, daily_loss_percent, max_loss_percent, profit_target_percent, drawdown_type, is_active, created_at)
VALUES
  ('b0000002-1001-4000-8000-000000000007', 'a0000002-0002-4000-8000-000000000002', 'Apex 25k', 'Evaluation', 1, 25000, 2, 6, 6, 'trailing', true, NOW()),
  ('b0000002-1002-4000-8000-000000000008', 'a0000002-0002-4000-8000-000000000002', 'Apex 50k', 'Evaluation', 1, 50000, 2, 6, 6, 'trailing', true, NOW()),
  ('b0000002-1003-4000-8000-000000000009', 'a0000002-0002-4000-8000-000000000002', 'Apex 100k', 'Evaluation', 1, 100000, 2, 6, 6, 'trailing', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- Topstep (example)
INSERT INTO prop_firm_challenges (id, firm_id, name, phase_name, phase_order, initial_balance, daily_loss_percent, max_loss_percent, profit_target_percent, drawdown_type, is_active, created_at)
VALUES
  ('b0000003-1001-4000-8000-00000000000a', 'a0000003-0003-4000-8000-000000000003', 'Topstep 50k', 'Trading Combine', 1, 50000, 2, 6, 6, 'trailing', true, NOW()),
  ('b0000003-1002-4000-8000-00000000000b', 'a0000003-0003-4000-8000-000000000003', 'Topstep 100k', 'Trading Combine', 1, 100000, 2, 6, 6, 'trailing', true, NOW())
ON CONFLICT (id) DO NOTHING;
