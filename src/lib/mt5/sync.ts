import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt } from './encryption';

// Note: mt5_connections table will be available after running migration
// Using type casts until Supabase types are regenerated

export interface SyncResult {
    success: boolean;
    newTrades: number;
    skippedTrades: number;
    error?: string;
}

export interface MT5Connection {
    id: string;
    user_id: string;
    prop_account_id: string;
    meta_api_account_id: string | null;
    server: string;
    login: string;
    password_encrypted: string;
    connection_status: string;
    last_synced_at: string | null;
    error_message: string | null;
    syncs_this_month: number;
    syncs_reset_at: string;
    created_at: string;
    updated_at: string;
}

interface MetaApiDeal {
    id: string;
    type: string;
    entryType: string;
    symbol: string;
    volume: number;
    price: number;
    profit: number;
    commission: number;
    swap: number;
    time: string;
    magic: number;
    positionId: string;
}

const SYNC_LIMIT = parseInt(process.env.MT5_MONTHLY_SYNC_LIMIT || '60');

/**
 * Main sync function - Deploy -> Sync -> Undeploy
 */
export async function syncMT5Account(connectionId: string): Promise<SyncResult> {
    const supabase = createAdminClient();
    // Cast to any since mt5_connections is not in generated types yet
    const db = supabase as any;

    try {
        // 1. Fetch connection details
        const { data: connection, error: fetchError } = await db
            .from('mt5_connections')
            .select('*')
            .eq('id', connectionId)
            .single();

        if (fetchError || !connection) {
            return { success: false, newTrades: 0, skippedTrades: 0, error: 'Connection not found' };
        }

        const conn = connection as MT5Connection;

        // 2. Atomic check and increment sync counter using PostgreSQL function
        // This prevents race conditions when multiple syncs happen simultaneously
        const { data: syncCheck, error: syncCheckError } = await db
            .rpc('check_and_increment_sync', {
                p_connection_id: connectionId,
                p_max_syncs: SYNC_LIMIT
            })
            .single();

        if (syncCheckError) {
            console.error('[Sync] Failed to check sync counter:', syncCheckError);
            return {
                success: false,
                newTrades: 0,
                skippedTrades: 0,
                error: 'Failed to check sync limit'
            };
        }

        if (!syncCheck || !syncCheck.can_sync) {
            const currentCount = syncCheck?.current_count || conn.syncs_this_month;
            await db
                .from('mt5_connections')
                .update({
                    error_message: `Monthly sync limit reached (${currentCount}/${SYNC_LIMIT}). Resets on the 1st.`
                })
                .eq('id', connectionId);
            return {
                success: false,
                newTrades: 0,
                skippedTrades: 0,
                error: `Monthly sync limit reached (${currentCount}/${SYNC_LIMIT})`
            };
        }

        // Counter already incremented atomically, update local reference
        conn.syncs_this_month = syncCheck.current_count;
        console.log(`[Sync] Sync allowed. Counter: ${syncCheck.current_count}/${SYNC_LIMIT}, Reset needed: ${syncCheck.reset_needed}`);

        // 4. Update status to syncing
        await db
            .from('mt5_connections')
            .update({ connection_status: 'syncing', error_message: null })
            .eq('id', connectionId);

        // 5. Initialize MetaAPI REST Client (no SDK dependencies)
        const metaApiToken = process.env.META_API_TOKEN;
        if (!metaApiToken) {
            throw new Error('META_API_TOKEN not configured');
        }

        // Use REST API client instead of problematic SDK
        const { createMetaApiRestClient } = await import('./metaapi-rest');
        const api = createMetaApiRestClient(metaApiToken);

        // 6. Get or create MetaAPI account
        let accountId: string;
        if (conn.meta_api_account_id) {
            accountId = conn.meta_api_account_id;
        } else {
            // Create new account in MetaAPI
            const password = decrypt(conn.password_encrypted);
            const account = await api.createAccount({
                name: `TradingJournal-${conn.prop_account_id}`,
                type: 'cloud-g2',
                login: conn.login,
                password: password,
                server: conn.server,
                platform: 'mt5',
                magic: 0,
            });

            accountId = account.id;

            // Save the MetaAPI account ID
            await db
                .from('mt5_connections')
                .update({ meta_api_account_id: accountId })
                .eq('id', connectionId);
        }

        // 7. Check current account state and deploy if needed, wait for broker connection
        const accountInfo = await api.getAccount(accountId);
        let region: string;

        if (accountInfo.state !== 'DEPLOYED') {
            // Only deploy if not already deployed
            await db
                .from('mt5_connections')
                .update({ connection_status: 'deploying' })
                .eq('id', connectionId);

            await api.deploy(accountId);

            // Wait for deployment AND broker connection (returns region)
            await db
                .from('mt5_connections')
                .update({ connection_status: 'connecting' })
                .eq('id', connectionId);

            region = await api.waitForConnection(accountId, 120000); // 2 min timeout for cold start

            await db
                .from('mt5_connections')
                .update({ connection_status: 'connected' })
                .eq('id', connectionId);
        } else {
            // Account already deployed, still wait for broker connection
            await db
                .from('mt5_connections')
                .update({ connection_status: 'connecting' })
                .eq('id', connectionId);

            region = await api.waitForConnection(accountId, 60000); // 60s if already deployed

            await db
                .from('mt5_connections')
                .update({ connection_status: 'connected' })
                .eq('id', connectionId);
        }

        console.log(`[Sync] Using MetaAPI region: ${region}`);

        // 8. Fetch ALL deals since last sync (with pagination)
        const startTime = conn.last_synced_at
            ? new Date(conn.last_synced_at)
            : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Default: last 90 days
        const endTime = new Date();

        // Fetch all deals with pagination (MetaAPI limits to 1000 per request)
        const allDeals: MetaApiDeal[] = [];
        let offset = 0;
        const limit = 1000;
        let hasMore = true;

        console.log(`[Sync] Fetching deals from ${startTime.toISOString()} to ${endTime.toISOString()}`);


        while (hasMore) {
            const deals = await api.getDeals(accountId, startTime, endTime, offset, limit, 30000, region);
            allDeals.push(...deals);

            // Check if there might be more deals
            hasMore = deals.length === limit;
            offset += limit;

            // Safety limit to prevent infinite loop
            if (offset > 100000) {
                console.warn('[Sync] Reached safety limit for deal pagination (100k deals)');
                break;
            }

            // Log progress for large syncs
            if (allDeals.length % 5000 === 0 && allDeals.length > 0) {
                console.log(`[Sync] Fetched ${allDeals.length} deals so far...`);
            }
        }

        console.log(`[Sync] Total deals fetched: ${allDeals.length}`);

        // 9. Filter for closed trades only (DEAL_ENTRY_OUT)
        const closedDeals = allDeals.filter((d) =>
            d.entryType === 'DEAL_ENTRY_OUT' || d.entryType === 'DEAL_ENTRY_INOUT'
        );

        console.log(`[Sync] Closed deals: ${closedDeals.length}`);

        // 10. Validate deals before processing
        let skippedTrades = 0; // Track invalid deals
        const validDeals: MetaApiDeal[] = [];
        for (const deal of closedDeals) {
            // Check required fields exist
            if (!deal.id || !deal.symbol || deal.price == null || !deal.time) {
                console.error('[Sync] Skipping invalid deal - missing required fields:', {
                    dealId: deal.id || 'missing',
                    symbol: deal.symbol || 'missing',
                    hasPrice: deal.price != null,
                    hasTime: !!deal.time,
                });
                skippedTrades++;
                continue;
            }

            // Validate type field (needed for direction calculation)
            if (!deal.type || typeof deal.type !== 'string') {
                console.error('[Sync] Skipping invalid deal - invalid type:', {
                    dealId: deal.id,
                    type: deal.type,
                    typeOf: typeof deal.type,
                });
                skippedTrades++;
                continue;
            }

            // Validate entryType
            const validEntryTypes = ['DEAL_ENTRY_OUT', 'DEAL_ENTRY_INOUT', 'DEAL_ENTRY_IN', 'DEAL_ENTRY_OUT_BY'];
            if (!validEntryTypes.includes(deal.entryType)) {
                console.error('[Sync] Skipping invalid deal - invalid entryType:', {
                    dealId: deal.id,
                    entryType: deal.entryType,
                });
                skippedTrades++;
                continue;
            }

            validDeals.push(deal);
        }

        console.log(`[Sync] Valid deals after validation: ${validDeals.length}, Skipped: ${skippedTrades}`);

        // 11. Upsert trades
        let newTrades = 0;

        for (const deal of validDeals) {
            const direction = deal.type.toLowerCase().includes('buy') ? 'LONG' : 'SHORT';

            const tradeData = {
                user_id: conn.user_id,
                prop_account_id: conn.prop_account_id,
                external_ticket: deal.id,
                symbol: deal.symbol,
                direction: direction,
                entry_date: deal.time,
                exit_date: deal.time,
                entry_price: deal.price,
                exit_price: deal.price,
                position_size: deal.volume,
                pnl: deal.profit,
                commission: deal.commission || 0,
                swap: deal.swap || 0,
                magic_number: deal.magic || 0,
                status: 'closed',
                r_multiple: 0,
            };

            const { error: upsertError } = await db
                .from('trades')
                .upsert(tradeData, { onConflict: 'external_ticket,prop_account_id' });

            if (upsertError) {
                console.error('Trade upsert error:', upsertError);
                skippedTrades++;
            } else {
                newTrades++;
            }
        }

        // 11. Undeploy account to stop running (saves costs, user accepts cold start)
        try {
            await api.undeploy(accountId);
            console.log('[Sync] Account undeployed successfully');
        } catch (undeployError) {
            console.error('[Sync] Failed to undeploy account:', undeployError);
            // Continue anyway - account might auto-undeploy after timeout
        }

        // 12. Update connection status (counter already incremented atomically at start)
        await db
            .from('mt5_connections')
            .update({
                connection_status: 'undeployed',
                last_synced_at: new Date().toISOString(),
                error_message: null,
            })
            .eq('id', connectionId);

        // 13. Update prop account balance from all synced trades
        // Calculate total P&L from all trades linked to this prop account
        const { data: allTrades, error: tradesError } = await db
            .from('trades')
            .select('pnl')
            .eq('prop_account_id', conn.prop_account_id);

        if (!tradesError && allTrades) {
            const totalPnl = allTrades.reduce((sum: number, t: { pnl: number | null }) => sum + (t.pnl || 0), 0);

            // Get prop account to calculate new balance
            const { data: propAccount } = await db
                .from('prop_accounts')
                .select('initial_balance')
                .eq('id', conn.prop_account_id)
                .single();

            if (propAccount) {
                const newBalance = propAccount.initial_balance + totalPnl;
                const pnlPercent = (totalPnl / propAccount.initial_balance) * 100;
                const totalDdCurrent = pnlPercent < 0 ? Math.abs(pnlPercent) : 0;

                await db
                    .from('prop_accounts')
                    .update({
                        current_balance: newBalance,
                        total_dd_current: totalDdCurrent,
                    })
                    .eq('id', conn.prop_account_id);

                console.log(`[Sync] Updated prop account balance: $${newBalance.toFixed(2)} (P&L: $${totalPnl.toFixed(2)})`);
            }
        }

        return { success: true, newTrades, skippedTrades };

    } catch (err) {
        console.error('Sync error:', err);

        // Update error status
        await db
            .from('mt5_connections')
            .update({
                connection_status: 'error',
                error_message: err instanceof Error ? err.message : 'Unknown error',
            })
            .eq('id', connectionId);

        return {
            success: false,
            newTrades: 0,
            skippedTrades: 0,
            error: err instanceof Error ? err.message : 'Unknown error'
        };
    }
}
