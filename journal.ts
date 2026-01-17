import { createClient } from '@/lib/supabase/client'
import type { JournalEntry, JournalEntryInsert, Json } from '@/lib/supabase/types'

export async function getJournalEntries(): Promise<JournalEntry[]> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .order('entry_date', { ascending: false })

    if (error) throw new Error(error.message)
    return (data || []) as JournalEntry[]
}

export async function getJournalEntry(id: string): Promise<JournalEntry | null> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return null
        throw new Error(error.message)
    }
    return data as JournalEntry
}

export async function getJournalEntriesByType(type: 'daily' | 'weekly' | 'trade'): Promise<JournalEntry[]> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('entry_type', type)
        .order('entry_date', { ascending: false })

    if (error) throw new Error(error.message)
    return (data || []) as JournalEntry[]
}

export async function getJournalEntriesByDateRange(
    startDate: string,
    endDate: string
): Promise<JournalEntry[]> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .gte('entry_date', startDate)
        .lte('entry_date', endDate)
        .order('entry_date', { ascending: false })

    if (error) throw new Error(error.message)
    return (data || []) as JournalEntry[]
}

export async function createJournalEntry(
    entry: Omit<JournalEntryInsert, 'user_id'>
): Promise<JournalEntry> {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
        .from('journal_entries')
        .insert({ ...entry, user_id: user.id })
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as JournalEntry
}

export async function updateJournalEntry(
    id: string,
    updates: Partial<JournalEntry>
): Promise<JournalEntry> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('journal_entries')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw new Error(error.message)
    return data as JournalEntry
}

export async function deleteJournalEntry(id: string): Promise<void> {
    const supabase = createClient()

    const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', id)

    if (error) throw new Error(error.message)
}

export async function toggleFavorite(id: string): Promise<JournalEntry> {
    const entry = await getJournalEntry(id)
    if (!entry) throw new Error('Journal entry not found')

    return updateJournalEntry(id, { is_favorite: !entry.is_favorite })
}

export async function getFavorites(): Promise<JournalEntry[]> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('is_favorite', true)
        .order('entry_date', { ascending: false })

    if (error) throw new Error(error.message)
    return (data || []) as JournalEntry[]
}

// Get the journal entry for a specific trade
export async function getJournalForTrade(tradeId: string): Promise<JournalEntry | null> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('trade_id', tradeId)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return null
        throw new Error(error.message)
    }
    return data as JournalEntry
}

// Create or update a journal entry for a trade
export async function saveTradeJournal(
    tradeId: string,
    content: Json,
    title?: string
): Promise<JournalEntry> {
    const existing = await getJournalForTrade(tradeId)

    if (existing) {
        return updateJournalEntry(existing.id, { content, title })
    }

    return createJournalEntry({
        title,
        content,
        entry_date: new Date().toISOString().split('T')[0],
        entry_type: 'trade',
        trade_id: tradeId,
    })
}
