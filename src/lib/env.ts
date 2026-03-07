/**
 * Startup environment variable validation.
 * Import this in src/app/layout.tsx (server component) so it runs on every cold start.
 * Throws for required vars, warns for optional ones.
 */

const required = [
    "DATABASE_URL",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "MT5_ENCRYPTION_KEY",
] as const;

const optional = [
    "TERMINAL_WEBHOOK_SECRET",
    "ORCHESTRATOR_SECRET",
    "NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_KEY",
    "FINNHUB_API_KEY",
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
            missing.map(k => `  - ${k}`).join("\n") +
            `\n\nAdd these to your .env.local file before starting the server.`
        );
    }

    for (const key of optional) {
        if (!process.env[key]) {
            console.warn(`[env] Optional variable not set: ${key} — related features may be disabled.`);
        }
    }
}

// Only validate in a server context (not in the browser bundle)
if (typeof window === "undefined") {
    validateEnv();
}

export {};
