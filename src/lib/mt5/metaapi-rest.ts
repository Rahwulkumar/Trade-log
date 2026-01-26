/**
 * MetaAPI REST API Client
 * Alternative to metaapi.cloud-sdk which has module loading issues
 * Uses direct HTTP calls to MetaAPI REST endpoints
 */

const META_API_BASE_URL = 'https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai';

export interface CreateAccountParams {
    name: string;
    type: string;
    login: string;
    password: string;
    server: string;
    platform: string;
    magic?: number;
}

export interface MetaApiAccount {
    id: string;
    name: string;
    login: string;
    server: string;
    platform: string;
    state: string;
    region?: string; // Region where account is deployed (e.g., 'london', 'new-york', 'vint-hill')
}

export interface Deal {
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

/**
 * Build client API URL for a specific region
 * MetaAPI requires using the correct region's URL for data fetching
 */
function getClientUrl(region: string = 'london'): string {
    return `https://mt-client-api-v1.${region}.agiliumtrade.ai`;
}

/**
 * MetaAPI REST Client
 */
export class MetaApiRestClient {
    constructor(private token: string) { }

    /**
     * Create a MetaTrader account
     */
    async createAccount(params: CreateAccountParams): Promise<MetaApiAccount> {
        const response = await fetch(`${META_API_BASE_URL}/users/current/accounts`, {
            method: 'POST',
            headers: {
                'auth-token': this.token,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to create account: ${error}`);
        }

        return await response.json();
    }

    /**
     * Get account by ID
     */
    async getAccount(accountId: string): Promise<MetaApiAccount> {
        const response = await fetch(
            `${META_API_BASE_URL}/users/current/accounts/${accountId}`,
            {
                headers: {
                    'auth-token': this.token,
                },
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to get account: ${error}`);
        }

        return await response.json();
    }

    /**
     * Deploy account
     */
    async deploy(accountId: string): Promise<void> {
        const response = await fetch(
            `${META_API_BASE_URL}/users/current/accounts/${accountId}/deploy`,
            {
                method: 'POST',
                headers: {
                    'auth-token': this.token,
                },
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to deploy: ${error}`);
        }
    }

    /**
     * Undeploy account
     */
    async undeploy(accountId: string): Promise<void> {
        const response = await fetch(
            `${META_API_BASE_URL}/users/current/accounts/${accountId}/undeploy`,
            {
                method: 'POST',
                headers: {
                    'auth-token': this.token,
                },
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to undeploy: ${error}`);
        }
    }

    /**
     * Get connection status including broker connectivity
     * Uses the account/connectionStatus endpoint for real-time status
     */
    async getConnectionStatus(accountId: string, region: string = 'london'): Promise<{
        connected: boolean;
        authenticatedToBroker: boolean;
        state: string;
    }> {
        // Get account state first
        const account = await this.getAccount(accountId);

        if (account.state !== 'DEPLOYED') {
            return { connected: false, authenticatedToBroker: false, state: account.state };
        }

        // For deployed accounts, check connection status via client API
        const clientUrl = getClientUrl(region);
        try {
            const response = await fetch(
                `${clientUrl}/users/current/accounts/${accountId}/connection-status`,
                {
                    headers: {
                        'auth-token': this.token,
                    },
                }
            );

            if (response.ok) {
                const status = await response.json();
                return {
                    connected: status.connected === true,
                    authenticatedToBroker: status.authenticated === true,
                    state: 'DEPLOYED'
                };
            }
        } catch (e) {
            // Connection status endpoint may not exist for all regions, fall back
            console.log('[MetaAPI] Connection status check failed, assuming connected');
        }

        // Fallback: if deployed, assume connected (will fail at deals fetch if not)
        return { connected: true, authenticatedToBroker: true, state: 'DEPLOYED' };
    }

    /**
     * Wait for account to be deployed AND connected to broker
     * This is a two-phase wait: first for deployment, then for broker connection
     */
    async waitForConnection(
        accountId: string,
        timeoutMs: number = 120000  // Increased to 2 minutes for cold start
    ): Promise<string> {  // Returns region
        const startTime = Date.now();
        let region = 'london';

        console.log(`[MetaAPI] Waiting for account ${accountId} to be ready (timeout: ${timeoutMs}ms)`);

        // Phase 1: Wait for DEPLOYED state
        while (Date.now() - startTime < timeoutMs) {
            const account = await this.getAccount(accountId);

            if (account.state === 'DEPLOYED') {
                region = account.region || 'london';
                console.log(`[MetaAPI] Account deployed in region: ${region}`);
                break;
            }

            if (account.state === 'DEPLOYING') {
                console.log('[MetaAPI] Account deploying...');
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Check if we timed out on deployment
        const accountCheck = await this.getAccount(accountId);
        if (accountCheck.state !== 'DEPLOYED') {
            throw new Error(`Timeout waiting for deployment. Current state: ${accountCheck.state}`);
        }

        region = accountCheck.region || 'london';

        // Phase 2: Wait for broker connection (additional 30s max)
        const connectionTimeout = Math.min(30000, timeoutMs - (Date.now() - startTime));
        const connectionStart = Date.now();

        console.log('[MetaAPI] Waiting for broker connection...');

        while (Date.now() - connectionStart < connectionTimeout) {
            const status = await this.getConnectionStatus(accountId, region);

            if (status.connected && status.authenticatedToBroker) {
                console.log('[MetaAPI] Connected to broker successfully');
                // Additional stabilization delay
                await new Promise(resolve => setTimeout(resolve, 2000));
                return region;
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Broker connection timeout - we'll try to proceed anyway
        console.warn('[MetaAPI] Broker connection timeout, proceeding anyway...');
        return region;
    }

    /**
     * Get deals (trades) by time range with pagination support
     * Endpoint: GET /users/current/accounts/:accountId/history-deals/time/:startTime/:endTime
     * @param accountId MetaAPI account ID
     * @param startTime Start of time range (inclusive)
     * @param endTime End of time range (exclusive)
     * @param offset Pagination offset (default: 0)
     * @param limit Max deals per request (default: 1000, max: 1000)
     * @param timeoutMs Request timeout in milliseconds (default: 30000)
     */
    async getDeals(
        accountId: string,
        startTime: Date,
        endTime: Date,
        offset: number = 0,
        limit: number = 1000,
        timeoutMs: number = 30000,
        region: string = 'london'
    ): Promise<Deal[]> {
        const startTimeStr = startTime.toISOString();
        const endTimeStr = endTime.toISOString();

        // Use dynamic region URL to ensure we hit the correct MetaAPI server
        const clientUrl = getClientUrl(region);

        // Build URL with query parameters
        const url = new URL(
            `${clientUrl}/users/current/accounts/${accountId}/history-deals/time/${startTimeStr}/${endTimeStr}`
        );
        url.searchParams.set('offset', offset.toString());
        url.searchParams.set('limit', Math.min(limit, 1000).toString());

        // Add timeout protection
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url.toString(), {
                headers: {
                    'auth-token': this.token,
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to get deals: ${error}`);
            }

            const data = await response.json();
            // MetaAPI returns array directly for history-deals endpoint
            return Array.isArray(data) ? data : [];
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`Request timeout after ${timeoutMs}ms`);
            }
            throw error;
        }
    }
}

/**
 * Create MetaAPI client instance
 */
export function createMetaApiRestClient(token: string): MetaApiRestClient {
    return new MetaApiRestClient(token);
}
