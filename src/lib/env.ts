/**
 * Startup environment variable validation.
 * Import this in src/app/layout.tsx (server component) so it runs on every cold start.
 * Throws for required vars, warns for optional ones.
 */

const required = [
    'DATABASE_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'MT5_ENCRYPTION_KEY',
] as const;

const optional = [
    'TERMINAL_WEBHOOK_SECRET',
    'ORCHESTRATOR_SECRET',
    'MT5_WORKER_SECRET',
    'MT5_SYNC_PROVIDER',
    'NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_KEY',
    'FINNHUB_API_KEY',
] as const;

function validateEnv() {
    const missing: string[] = [];

    for (const key of required) {
        if (!process.env[key]) {
            missing.push(key);
        }
    }

    if (missing.length > 0) {
        throw new Error(
            `[env] Missing required environment variables:\n` +
                missing.map(key => `  - ${key}`).join('\n') +
                `\n\nAdd these to your .env.local file before starting the server.`
        );
    }

    for (const key of optional) {
        if (!process.env[key]) {
            console.warn(
                `[env] Optional variable not set: ${key} - related features may be disabled.`
            );
        }
    }

    validateMt5SyncEnv();
}

function isPlaceholder(value: string | undefined, placeholder: string): boolean {
    return (value ?? '').trim() === placeholder;
}

function validateMt5SyncEnv() {
    const provider = process.env.MT5_SYNC_PROVIDER?.trim().toLowerCase() ?? '';
    const workerSecret = process.env.MT5_WORKER_SECRET;

    if (!provider) {
        return;
    }

    const allowedProviders = new Set([
        'terminal_farm',
        'metaapi',
        'windows_mt5_python',
    ]);

    if (!allowedProviders.has(provider)) {
        console.warn(
            `[env] MT5_SYNC_PROVIDER is set to "${provider}", which is not one of: terminal_farm, metaapi, windows_mt5_python.`
        );
        return;
    }

    if (provider === 'windows_mt5_python') {
        if (!workerSecret) {
            console.warn(
                '[env] MT5_SYNC_PROVIDER=windows_mt5_python but MT5_WORKER_SECRET is not set. The Windows MT5 worker cannot authenticate to the backend.'
            );
        } else if (isPlaceholder(workerSecret, 'replace_with_worker_secret')) {
            console.warn(
                '[env] MT5_WORKER_SECRET still uses the example placeholder. Replace it in .env.local before running the Windows MT5 worker.'
            );
        }
    }
}

if (typeof window === 'undefined') {
    validateEnv();
}

export {};
