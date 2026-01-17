import { createClient } from '@/lib/supabase/client'
import type { Playbook, PlaybookInsert, PlaybookUpdate } from '@/lib/supabase/types'

export async function getPlaybooks(): Promise<Playbook[]> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('playbooks')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data || []) as Playbook[]
}

export async function getActivePlaybooks(): Promise<Playbook[]> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('playbooks')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

    if (error) throw new Error(error.message)
    return (data || []) as Playbook[]
}

export async function getPlaybook(id: string): Promise<Playbook | null> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('playbooks')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return null
        throw new Error(error.message)
    }
    return data as Playbook
}

export async function createPlaybook(playbook: Omit<PlaybookInsert, 'user_id'>): Promise<Playbook> {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
        .from('playbooks')
        .insert({ ...playbook, user_id: user.id })
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as Playbook
}

export async function updatePlaybook(id: string, updates: PlaybookUpdate): Promise<Playbook> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('playbooks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as Playbook
}

export async function deletePlaybook(id: string): Promise<void> {
    const supabase = createClient()

    const { error } = await supabase
        .from('playbooks')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)
}

export async function duplicatePlaybook(id: string): Promise<Playbook> {
    const original = await getPlaybook(id)
    if (!original) throw new Error('Playbook not found')

    return createPlaybook({
        name: `${original.name} (Copy)`,
        description: original.description,
        rules: original.rules,
        is_active: original.is_active,
    })
}

export async function togglePlaybookActive(id: string): Promise<Playbook> {
    const playbook = await getPlaybook(id)
    if (!playbook) throw new Error('Playbook not found')

    return updatePlaybook(id, { is_active: !playbook.is_active })
}

// Get playbook performance stats (win rate, avg R, etc.)
export interface PlaybookStats {
    playbook: Playbook
    totalTrades: number
    winningTrades: number
    losingTrades: number
    winRate: number
    avgRMultiple: number
    totalPnl: number
}

export async function getPlaybookStats(playbookId: string, propAccountId?: string | null): Promise<PlaybookStats | null> {
    const supabase = createClient()

    const playbook = await getPlaybook(playbookId)
    if (!playbook) return null

    let query = supabase
        .from('trades')
        .select('pnl, r_multiple')
        .eq('playbook_id', playbookId)
        .eq('status', 'closed')

    // Filter by prop account
    if (propAccountId === 'unassigned') {
        query = query.is('prop_account_id', null)
    } else if (propAccountId) {
        query = query.eq('prop_account_id', propAccountId)
    }

    const { data, error } = await query

    if (error) throw new Error(error.message)

    const closedTrades = (data || []) as { pnl: number; r_multiple: number | null }[]
    const winningTrades = closedTrades.filter(t => t.pnl > 0).length
    const losingTrades = closedTrades.filter(t => t.pnl < 0).length
    const totalPnl = closedTrades.reduce((sum, t) => sum + t.pnl, 0)
    const avgRMultiple = closedTrades.length > 0
        ? closedTrades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / closedTrades.length
        : 0

    return {
        playbook,
        totalTrades: closedTrades.length,
        winningTrades,
        losingTrades,
        winRate: closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0,
        avgRMultiple,
        totalPnl,
    }
}

export async function getAllPlaybooksWithStats(propAccountId?: string | null): Promise<PlaybookStats[]> {
    const playbooks = await getPlaybooks()
    const statsPromises = playbooks.map(p => getPlaybookStats(p.id, propAccountId))
    const stats = await Promise.all(statsPromises)
    return stats.filter((s): s is PlaybookStats => s !== null)
}
