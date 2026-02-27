import { readFileSync } from 'fs'

const envRaw = readFileSync('.env.local', 'utf-8')
const getEnv = (key) => {
  const match = envRaw.match(new RegExp(`^${key}=(.+)$`, 'm'))
  return match ? match[1].trim() : null
}

const SUPABASE_URL  = getEnv('NEXT_PUBLIC_SUPABASE_URL')
const SERVICE_KEY   = getEnv('SUPABASE_SERVICE_ROLE_KEY')

const cols = ['setup_tags','mistake_tags','conviction','entry_rating','exit_rating','mae','mfe','execution_notes','execution_arrays','tf_observations']
const select = ['id', ...cols].join(',')

try {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/trades?select=${select}&limit=1`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
  })

  if (res.ok) {
    const data = await res.json()
    console.log(`✅ HTTP ${res.status} — ALL JOURNAL COLUMNS VERIFIED IN LIVE DB`)
    if (data.length > 0) {
      console.log('   Sample keys returned:', Object.keys(data[0]).filter(k => cols.includes(k)).join(', '))
    } else {
      console.log('   (No trades exist yet, but schema is valid)')
    }
  } else {
    const err = await res.json()
    console.log(`❌ HTTP ${res.status}:`, JSON.stringify(err))
  }
} catch(e) {
  console.error('Error:', e.message)
}
