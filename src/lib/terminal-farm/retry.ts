/**
 * Retry utility for Terminal Farm operations
 * Implements exponential backoff with jitter
 */

export interface RetryOptions {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    retryableErrors?: string[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableErrors: ['network', 'timeout', 'ECONNRESET', 'ETIMEDOUT'],
};

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: Error | unknown;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Check if error is retryable
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isRetryable = opts.retryableErrors.some(pattern =>
                errorMessage.toLowerCase().includes(pattern.toLowerCase())
            );

            if (!isRetryable || attempt === opts.maxAttempts) {
                throw error;
            }

            // Calculate delay with exponential backoff and jitter
            const baseDelay = Math.min(
                opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1),
                opts.maxDelayMs
            );
            const jitter = Math.random() * 0.3 * baseDelay; // 0-30% jitter
            const delay = baseDelay + jitter;

            console.warn(
                `[Retry] Attempt ${attempt}/${opts.maxAttempts} failed, retrying in ${Math.round(delay)}ms:`,
                errorMessage
            );

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}
