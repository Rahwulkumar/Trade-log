/**
 * Server-only MetaAPI wrapper
 * This file safely imports metaapi.cloud-sdk only on the server
 * and handles any browser-specific code references
 */

// This file should only be imported in API routes and server components
if (typeof window !== 'undefined') {
    throw new Error('metaapi-server should only be imported on the server');
}

let MetaApiConstructor: any = null;

/**
 * Lazily load MetaAPI SDK
 * This ensures the package is only loaded when actually needed
 */
async function getMetaApi() {
    if (!MetaApiConstructor) {
        try {
            // Dynamic import with proper error handling
            const module = await import('metaapi.cloud-sdk');
            MetaApiConstructor = module.default;
        } catch (error) {
            console.error('Failed to load MetaAPI SDK:', error);
            throw new Error('MetaAPI SDK failed to load. Ensure metaapi.cloud-sdk is installed.');
        }
    }
    return MetaApiConstructor;
}

/**
 * Create a MetaAPI instance
 * @param token - MetaAPI access token
 */
export async function createMetaApiClient(token: string) {
    const MetaApi = await getMetaApi();
    return new MetaApi(token);
}

/**
 * Type definitions for MetaAPI (subset of what we use)
 */
export interface MetaApiAccount {
    id: string;
    deploy(): Promise<void>;
    undeploy(): Promise<void>;
    waitConnected(timeoutMs: number, checkIntervalMs: number): Promise<void>;
    getRPCConnection(): {
        connect(): Promise<void>;
        waitSynchronized(): Promise<void>;
        getDealsByTimeRange(start: Date, end: Date): Promise<any[]>;
    };
}

export interface MetaApiAccountApi {
    getAccount(id: string): Promise<MetaApiAccount>;
    createAccount(config: {
        name: string;
        type: string;
        login: string;
        password: string;
        server: string;
        platform: string;
        magic: number;
    }): Promise<MetaApiAccount>;
}

export interface MetaApiClient {
    metatraderAccountApi: MetaApiAccountApi;
}
