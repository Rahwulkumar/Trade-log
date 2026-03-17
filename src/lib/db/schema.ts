/**
 * Drizzle ORM Schema
 * Mirrors all Supabase migrations — single source of truth for all DB tables.
 * Generated from: 26 SQL migration files in supabase/migrations/
 */

import {
  pgTable,
  uuid,
  text,
  boolean,
  numeric,
  integer,
  smallint,
  bigint,
  doublePrecision,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────────────────────
// APP USERS
// ─────────────────────────────────────────────────────────────────────────────

export const appUsers = pgTable('app_users', {
  id: text('id').primaryKey(), // Clerk user id (e.g. user_xxx)
  email: text('email'),
  fullName: text('full_name'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  avatarUrl: text('avatar_url'),
  timezone: text('timezone').default('utc'),
  defaultRiskPercent: doublePrecision('default_risk_percent').default(1),
  defaultRrRatio: doublePrecision('default_rr_ratio').default(2),
  defaultTimeframe: text('default_timeframe').default('h4'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY PROFILES
// ─────────────────────────────────────────────────────────────────────────────

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // matches auth.users(id)
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  username: text('username'),
  timezone: text('timezone'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// PROP FIRMS
// ─────────────────────────────────────────────────────────────────────────────

export const propFirms = pgTable('prop_firms', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  website: text('website'),
  logoUrl: text('logo_url'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// PROP FIRM CHALLENGES
// ─────────────────────────────────────────────────────────────────────────────

export const propFirmChallenges = pgTable('prop_firm_challenges', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  firmId: uuid('firm_id').notNull().references(() => propFirms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  phaseName: text('phase_name').notNull(),
  phaseOrder: integer('phase_order').notNull().default(1),

  // Financial rules
  initialBalance: numeric('initial_balance').notNull(),
  dailyLossPercent: numeric('daily_loss_percent'),
  maxLossPercent: numeric('max_loss_percent'),
  dailyLossAmount: numeric('daily_loss_amount'),
  maxLossAmount: numeric('max_loss_amount'),
  profitTargetPercent: numeric('profit_target_percent'),
  minTradingDays: integer('min_trading_days'),
  maxTradingDays: integer('max_trading_days'),

  // Drawdown config
  drawdownType: text('drawdown_type').notNull().default('balance'),
  trailingThresholdAmount: numeric('trailing_threshold_amount'),

  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// PROP ACCOUNTS
// ─────────────────────────────────────────────────────────────────────────────

export const propAccounts = pgTable('prop_accounts', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: text('user_id').notNull(), // Clerk user id (e.g. user_xxx)
  challengeId: uuid('challenge_id').references(() => propFirmChallenges.id, { onDelete: 'set null' }),
  accountName: text('account_name').notNull(),
  firmName: text('firm_name'),
  accountSize: numeric('account_size').notNull(),
  currentBalance: numeric('current_balance'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  status: text('status').default('active'), // active, passed, failed, expired
  webhookKey: text('webhook_key'),

  // Challenge-tracking fields
  currentPhaseStatus: text('current_phase_status').default('in_progress'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAYBOOKS
// ─────────────────────────────────────────────────────────────────────────────

export const playbooks = pgTable('playbooks', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  rules: jsonb('rules').default([]),
  tags: text('tags').array().default(sql`'{}'`),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// TRADES  (the core table — 50+ columns across 26 migrations)
// ─────────────────────────────────────────────────────────────────────────────

export const trades = pgTable('trades', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: text('user_id').notNull(),
  propAccountId: uuid('prop_account_id').references(() => propAccounts.id, { onDelete: 'set null' }),
  playbookId: uuid('playbook_id').references(() => playbooks.id, { onDelete: 'set null' }),

  // Core trade data
  symbol: text('symbol').notNull(),
  direction: text('direction').notNull(), // LONG | SHORT
  status: text('status').notNull().default('open'), // open | closed

  // Price data
  entryPrice: numeric('entry_price').notNull(),
  exitPrice: numeric('exit_price'),
  positionSize: numeric('position_size').notNull(),
  stopLoss: numeric('stop_loss'),
  takeProfit: numeric('take_profit'),

  // P&L
  pnl: numeric('pnl'),
  rMultiple: numeric('r_multiple'),
  commission: numeric('commission').default('0'),
  swap: numeric('swap').default('0'),

  // Dates
  entryDate: timestamp('entry_date', { withTimezone: true }).notNull(),
  exitDate: timestamp('exit_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),

  // Journal fields (from 20251229_add_journal_fields)
  notes: text('notes'),
  feelings: text('feelings'),
  observations: text('observations'),

  // Screenshots (JSONB after 20260131000000_trade_review_canvas)
  screenshots: jsonb('screenshots').default([]),

  // Chart data (candles cache)
  chartData: jsonb('chart_data'),

  // Journal V2 fields (20260221000000_journal_v2_fields)
  mae: doublePrecision('mae'),
  mfe: doublePrecision('mfe'),
  session: text('session'), // London | New York | Asian | Pre-market | Overlap
  marketCondition: text('market_condition'), // Trending | Ranging | Choppy | High Volatility
  setupTags: text('setup_tags').array(),
  mistakeTags: text('mistake_tags').array(),
  entryRating: text('entry_rating'), // Good | Neutral | Poor
  exitRating: text('exit_rating'),
  managementRating: text('management_rating'),
  conviction: smallint('conviction'), // 1-5
  lessonLearned: text('lesson_learned'),
  wouldTakeAgain: boolean('would_take_again'),

  // Command center fields (20260209000000_journal_detail_command_center)
  tfObservations: jsonb('tf_observations').default({}),
  executionNotes: text('execution_notes'),
  executionArrays: jsonb('execution_arrays').default([]),

  // MT5 / Terminal Farm fields
  externalTicket: text('external_ticket'),   // OLD: deal ticket
  externalId: text('external_id'),           // MT5 Position ID
  externalDealId: text('external_deal_id'),  // MT5 Deal Ticket
  mt5AccountId: uuid('mt5_account_id').references(() => mt5Accounts.id, { onDelete: 'set null' }),
  contractSize: numeric('contract_size'),
  assetType: text('asset_type'), // FOREX | CRYPTO | INDICES | COMMODITIES | STOCKS
  magicNumber: bigint('magic_number', { mode: 'number' }),
});

// ─────────────────────────────────────────────────────────────────────────────
// MT5 ACCOUNTS
// ─────────────────────────────────────────────────────────────────────────────

export const mt5Accounts = pgTable('mt5_accounts', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: text('user_id').notNull(),
  propAccountId: uuid('prop_account_id').references(() => propAccounts.id, { onDelete: 'cascade' }),
  accountName: text('account_name').notNull(),
  server: text('server').notNull(),
  login: text('login').notNull(),
  password: text('password').notNull(), // AES-256 encrypted
  balance: numeric('balance').default('0'),
  equity: numeric('equity').default('0'),
  terminalEnabled: boolean('terminal_enabled').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// TERMINAL INSTANCES
// ─────────────────────────────────────────────────────────────────────────────

export const terminalInstances = pgTable('terminal_instances', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  accountId: uuid('account_id').notNull().references(() => mt5Accounts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  containerId: text('container_id'),
  status: text('status').notNull().default('PENDING'),
  // PENDING | STARTING | RUNNING | STOPPING | STOPPED | ERROR
  terminalPort: integer('terminal_port'),
  lastHeartbeat: timestamp('last_heartbeat', { withTimezone: true }),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// TERMINAL COMMANDS
// ─────────────────────────────────────────────────────────────────────────────

export const terminalCommands = pgTable('terminal_commands', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  terminalId: uuid('terminal_id').notNull().references(() => terminalInstances.id, { onDelete: 'cascade' }),
  command: text('command').notNull(), // e.g. FETCH_CANDLES
  payload: text('payload'),
  tradeId: uuid('trade_id').references(() => trades.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('PENDING'),
  // PENDING | DISPATCHED | COMPLETED | FAILED
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

// ─────────────────────────────────────────────────────────────────────────────
// NOTES  (Notion-like free-form notes)
// ─────────────────────────────────────────────────────────────────────────────

export const notes = pgTable('notes', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: text('user_id').notNull(),
  title: text('title').notNull().default('Untitled'),
  content: text('content'), // BlockNote JSON string
  icon: text('icon').notNull().default('📝'),
  pinned: boolean('pinned').notNull().default(false),
  tags: text('tags').array().notNull().default(sql`'{}'`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// TAGS  (user-defined labels for trades)
// ─────────────────────────────────────────────────────────────────────────────

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  color: text('color'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// TRADE TAGS  (many-to-many: trades ↔ tags)
// ─────────────────────────────────────────────────────────────────────────────

export const tradeTags = pgTable('trade_tags', {
  tradeId: uuid('trade_id').notNull().references(() => trades.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
});

// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL ENTRIES  (legacy separate journal — trades embed their own journal)
// ─────────────────────────────────────────────────────────────────────────────

export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: text('user_id').notNull(),
  tradeId: uuid('trade_id').references(() => trades.id, { onDelete: 'set null' }),
  title: text('title'),
  content: jsonb('content'),
  entryType: text('entry_type').notNull().default('daily'), // daily | weekly | trade
  entryDate: text('entry_date').notNull(),
  isFavorite: boolean('is_favorite').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// TYPE EXPORTS  (inferred TypeScript types from schema)
// ─────────────────────────────────────────────────────────────────────────────

export type Profile = typeof profiles.$inferSelect;
export type ProfileInsert = typeof profiles.$inferInsert;

export type AppUser = typeof appUsers.$inferSelect;
export type AppUserInsert = typeof appUsers.$inferInsert;

export type PropFirm = typeof propFirms.$inferSelect;
export type PropFirmInsert = typeof propFirms.$inferInsert;

export type PropFirmChallenge = typeof propFirmChallenges.$inferSelect;
export type PropFirmChallengeInsert = typeof propFirmChallenges.$inferInsert;

export type PropAccount = typeof propAccounts.$inferSelect;
export type PropAccountInsert = typeof propAccounts.$inferInsert;

export type Playbook = typeof playbooks.$inferSelect;
export type PlaybookInsert = typeof playbooks.$inferInsert;

export type Trade = typeof trades.$inferSelect;
export type TradeInsert = typeof trades.$inferInsert;
export type TradeUpdate = Partial<Omit<TradeInsert, 'id' | 'userId' | 'createdAt'>>;

export type MT5Account = typeof mt5Accounts.$inferSelect;
export type MT5AccountInsert = typeof mt5Accounts.$inferInsert;

export type TerminalInstance = typeof terminalInstances.$inferSelect;
export type TerminalInstanceInsert = typeof terminalInstances.$inferInsert;

export type TerminalCommand = typeof terminalCommands.$inferSelect;
export type TerminalCommandInsert = typeof terminalCommands.$inferInsert;

export type Note = typeof notes.$inferSelect;
export type NoteInsert = typeof notes.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type TagInsert = typeof tags.$inferInsert;

export type JournalEntry = typeof journalEntries.$inferSelect;
export type JournalEntryInsert = typeof journalEntries.$inferInsert;

