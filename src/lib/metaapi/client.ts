import 'server-only';

export type MetaApiAccountInformation = {
    balance?: number;
    equity?: number;
    margin?: number;
    freeMargin?: number;
    login?: number | string;
    server?: string;
    name?: string;
    broker?: string;
    currency?: string;
};

export type MetaApiPositionRecord = {
    id?: string | number;
    symbol?: string;
    type?: string;
    volume?: number;
    openPrice?: number;
    currentPrice?: number;
    profit?: number;
    time?: Date | string;
    stopLoss?: number;
    takeProfit?: number;
    commission?: number;
    swap?: number;
    comment?: string;
    brokerComment?: string;
};

export type MetaApiDealRecord = {
    id?: string | number;
    symbol?: string;
    type?: string;
    entryType?: string;
    volume?: number;
    price?: number;
    profit?: number;
    commission?: number;
    swap?: number;
    time?: Date | string;
    positionId?: string;
    comment?: string;
    brokerComment?: string;
    magic?: number;
    stopLoss?: number;
    takeProfit?: number;
};

export type MetaApiDealsResponse = {
    deals?: MetaApiDealRecord[];
    synchronizing?: boolean;
};

export type MetaApiRpcConnection = {
    connect(): Promise<void>;
    waitSynchronized(timeoutInSeconds?: number): Promise<unknown>;
    getAccountInformation(): Promise<MetaApiAccountInformation>;
    getPositions(): Promise<MetaApiPositionRecord[]>;
    getDealsByTimeRange(
        startTime: Date,
        endTime: Date,
        offset?: number,
        limit?: number
    ): Promise<MetaApiDealsResponse>;
    close(): Promise<void>;
};

export type MetaApiRemoteAccount = {
    id: string;
    state?: string;
    connectionStatus?: string;
    deploy(): Promise<void>;
    undeploy(): Promise<void>;
    remove(): Promise<void>;
    reload(): Promise<void>;
    waitConnected(timeoutInSeconds?: number, intervalInMilliseconds?: number): Promise<void>;
    waitUndeployed(timeoutInSeconds?: number, intervalInMilliseconds?: number): Promise<void>;
    waitRemoved(timeoutInSeconds?: number, intervalInMilliseconds?: number): Promise<void>;
    getRPCConnection(): MetaApiRpcConnection;
};

export type MetaApiClient = {
    metatraderAccountApi: {
        getAccount(accountId: string): Promise<MetaApiRemoteAccount>;
        createAccount(account: Record<string, unknown>): Promise<MetaApiRemoteAccount>;
    };
};

let metaApiClientPromise: Promise<MetaApiClient> | null = null;

function getMetaApiToken(): string {
    const token = process.env.METAAPI_TOKEN?.trim();
    if (!token) {
        throw new Error('METAAPI_TOKEN is not configured');
    }
    return token;
}

export function isMetaApiConfigured(): boolean {
    return Boolean(process.env.METAAPI_TOKEN?.trim());
}

export function getMetaApiProvisioningProfileId(): string | null {
    const provisioningProfileId = process.env.METAAPI_PROVISIONING_PROFILE_ID?.trim();
    return provisioningProfileId ? provisioningProfileId : null;
}

export function getMetaApiAccountType(): 'cloud-g1' | 'cloud-g2' {
    const configured = process.env.METAAPI_ACCOUNT_TYPE?.trim().toLowerCase();
    return configured === 'cloud-g1' ? 'cloud-g1' : 'cloud-g2';
}

export function getMetaApiReliability(): 'regular' | 'high' {
    const configured = process.env.METAAPI_ACCOUNT_RELIABILITY?.trim().toLowerCase();
    return configured === 'high' ? 'high' : 'regular';
}

export async function getMetaApiClient(): Promise<MetaApiClient> {
    if (!metaApiClientPromise) {
        metaApiClientPromise = (async () => {
            const { default: MetaApi } = await import('metaapi.cloud-sdk/esm-node');
            return new MetaApi(getMetaApiToken()) as MetaApiClient;
        })();
    }

    return metaApiClientPromise;
}

export function formatMetaApiError(error: unknown): string {
    if (error instanceof Error) {
        const details = (error as Error & { details?: unknown }).details;
        if (typeof details === 'string' && details.trim()) {
            return `${error.message}: ${details}`;
        }
        if (details && typeof details === 'object') {
            try {
                return `${error.message}: ${JSON.stringify(details)}`;
            } catch {
                return error.message;
            }
        }
        return error.message;
    }

    if (typeof error === 'string' && error.trim()) {
        return error;
    }

    return 'Unknown MetaApi error';
}

function isMetaApiNotFoundError(error: unknown): boolean {
    const message = formatMetaApiError(error).toLowerCase();
    return message.includes('not found') || message.includes('404');
}

export async function removeMetaApiAccount(accountId: string): Promise<void> {
    const api = await getMetaApiClient();

    try {
        const account = await api.metatraderAccountApi.getAccount(accountId);
        await account.remove();

        try {
            await account.waitRemoved(60, 1000);
        } catch {
            // Account deletion is asynchronous. Best effort is enough during local reset.
        }
    } catch (error) {
        if (isMetaApiNotFoundError(error)) {
            return;
        }
        throw error;
    }
}
