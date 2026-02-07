/**
 * Centralized Error Handling Utility
 * Provides consistent error handling across the application
 */

export interface ErrorHandlerOptions {
    showToast?: boolean;
    logToMonitoring?: boolean;
    defaultMessage?: string;
}

/**
 * Handle API errors consistently
 * @param error - The error object
 * @param options - Error handling options
 * @returns User-friendly error message
 */
export function handleApiError(
    error: unknown,
    options: ErrorHandlerOptions = {}
): string {
    const {
        showToast = false,
        logToMonitoring = true,
        defaultMessage = "An unexpected error occurred",
    } = options;

    let errorMessage: string = defaultMessage;

    // Extract error message
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === "string") {
        errorMessage = error;
    } else if (error && typeof error === "object" && "message" in error) {
        errorMessage = String(error.message);
    }

    // Log to monitoring service (if configured)
    if (logToMonitoring && process.env.NODE_ENV === "production") {
        // TODO: Integrate with monitoring service (Sentry, DataDog, etc.)
        // monitoringService.captureException(error);
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
        console.error("[Error Handler]", error);
    }

    // Show toast notification (if requested)
    if (showToast) {
        // TODO: Integrate with toast notification system
        // toast.error(errorMessage);
    }

    return errorMessage;
}

/**
 * Handle Supabase errors specifically
 */
export function handleSupabaseError(error: unknown): string {
    if (error && typeof error === "object" && "message" in error) {
        const supabaseError = error as { message: string; code?: string };
        
        // Map common Supabase error codes to user-friendly messages
        switch (supabaseError.code) {
            case "PGRST116":
                return "Item not found";
            case "23505":
                return "This item already exists";
            case "23503":
                return "Cannot delete: item is referenced elsewhere";
            case "42501":
                return "You don't have permission to perform this action";
            default:
                return supabaseError.message || "Database error occurred";
        }
    }

    return handleApiError(error, { defaultMessage: "Database error occurred" });
}
