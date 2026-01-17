/**
 * MetaAPI REST API Client
 * Alternative to metaapi.cloud-sdk which has module loading issues
 * Uses direct HTTP calls to MetaAPI REST endpoints
 */

const META_API_BASE_URL = 'https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai';
const META_API_CLIENT_URL = 'https://mt-client-api-v1.new-york.agiliumtrade.ai';

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
     * Wait for account to be deployed and connected
     */
    async waitForConnection(
        accountId: string,
        timeoutMs: number = 60000
    ): Promise<void> {
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            const account = await this.getAccount(accountId);
            if (account.state === 'DEPLOYED') {
                // Wait a bit more for connection to stabilize
                await new Promise(resolve => setTimeout(resolve, 2000));
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        throw new Error('Timeout waiting for deployment');
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
        timeoutMs: number = 30000
    ): Promise<Deal[]> {
        const startTimeStr = startTime.toISOString();
        const endTimeStr = endTime.toISOString();

        // Build URL with query parameters
        const url = new URL(
            `${META_API_CLIENT_URL}/users/current/accounts/${accountId}/history-deals/time/${startTimeStr}/${endTimeStr}`
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
