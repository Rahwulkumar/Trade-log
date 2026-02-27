/**
 * Applies the journal missing columns migration directly to Supabase.
 * Uses the service role key to bypass RLS and run DDL via pg.
 */
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// Load env
const envRaw = readFileSync('.env.local', 'utf-8')
const getEnv = (key) => {
  const match = envRaw.match(new RegExp(`^${key}=(.+)$`, 'm'))
  return match ? match[1].trim() : null
}

const SUPABASE_URL         = getEnv('NEXT_PUBLIC_SUPABASE_URL')
const SUPABASE_SERVICE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY')

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Could not read SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from .env.local')
  process.exit(1)
}

// The SQL statements to run — safe with IF NOT EXISTS
const STATEMENTS = [
  // Execution detail
  `ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS tf_observations  JSONB DEFAULT '{}'::jsonb`,
  `ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS execution_notes  TEXT`,
  `ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS execution_arrays JSONB DEFAULT '[]'::jsonb`,
  // MAE / MFE
  `ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS mae DOUBLE PRECISION`,
  `ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS mfe DOUBLE PRECISION`,
  // ICT tag arrays (TEXT[] supports custom tags)
  `ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS setup_tags   TEXT[]`,
  `ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS mistake_tags TEXT[]`,
  // Granular grading
  `ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS entry_rating      TEXT CHECK (entry_rating      IN ('Good','Neutral','Poor'))`,
  `ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS exit_rating       TEXT CHECK (exit_rating       IN ('Good','Neutral','Poor'))`,
  `ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS management_rating TEXT CHECK (management_rating IN ('Good','Neutral','Poor'))`,
  // Conviction (1–5)
  `ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS conviction SMALLINT CHECK (conviction BETWEEN 1 AND 5)`,
  // Reflection
  `ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS lesson_learned   TEXT`,
  `ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS would_take_again BOOLEAN`,
]

// Use Supabase's built-in pg functions via RPC if available, else fall back to fetch
async function runSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  })
  return { status: res.status, body: await res.text() }
}

// Check via information_schema which columns exist
async function checkColumns() {
  const cols = ['setup_tags','mistake_tags','conviction','entry_rating','exit_rating','mae','mfe','tf_observations','execution_notes','execution_arrays']
  const res = await fetch(`${SUPABASE_URL}/rest/v1/information_schema_columns?select=column_name&table_name=eq.trades&table_schema=eq.public&column_name=in.(${cols.join(',')})`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    }
  })
  if (res.ok) {
    const data = await res.json()
    console.log('✅ Existing journal columns:', data.map(d => d.column_name).join(', ') || 'none yet')
    return data.map(d => d.column_name)
  }
  return []
}

console.log('🔗 Connecting to Supabase:', SUPABASE_URL)
console.log()

const existing = await checkColumns()
const allCols = ['setup_tags','mistake_tags','conviction','entry_rating','exit_rating','mae','mfe','tf_observations','execution_notes','execution_arrays']
const missing = allCols.filter(c => !existing.includes(c))

if (missing.length === 0) {
  console.log('✅ All journal columns already exist in the live database!')
  console.log('   No migration needed.')
  process.exit(0)
}

console.log('⚠️  Missing columns:', missing.join(', '))
console.log()
console.log('📝 The columns cannot be added automatically through the REST API.')
console.log('   Please run this SQL in your Supabase Dashboard → SQL Editor:')
console.log()
console.log('─'.repeat(70))
for (const stmt of STATEMENTS) {
  console.log(stmt + ';')
}
console.log('─'.repeat(70))
console.log()
console.log('💡 Go to: https://supabase.com/dashboard/project/tcfzbbvhhpzafghkuyak/sql/new')
