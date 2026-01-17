/**
 * Input validation for MT5 credentials and parameters
 */

export interface MT5Credentials {
    server: string;
    login: string;
    password: string;
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * Validates MT5 server name
 * - Alphanumeric + hyphens only
 * - Max 100 characters
 */
function validateServer(server: string): string[] {
    const errors: string[] = [];

    if (!server || server.trim().length === 0) {
        errors.push('Server name is required');
        return errors;
    }

    if (server.length > 100) {
        errors.push('Server name must be less than 100 characters');
    }

    if (!/^[a-zA-Z0-9\-]+$/.test(server)) {
        errors.push('Server name can only contain letters, numbers, and hyphens');
    }

    return errors;
}

/**
 * Validates MT5 login
 * - Numeric only (MT5 accounts are numbers)
 * - 6-12 digits
 */
function validateLogin(login: string): string[] {
    const errors: string[] = [];

    if (!login || login.trim().length === 0) {
        errors.push('Login is required');
        return errors;
    }

    if (!/^[0-9]{6,12}$/.test(login)) {
        errors.push('Login must be 6-12 digits');
    }

    return errors;
}

/**
 * Validates MT5 password
 * - Min 8 characters
 * - Sanitization for SQL injection patterns
 */
function validatePassword(password: string): string[] {
    const errors: string[] = [];

    if (!password || password.length === 0) {
        errors.push('Password is required');
        return errors;
    }

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters');
    }

    // Check for suspicious SQL patterns
    const sqlPatterns = [/;.*--/, /union.*select/i, /drop.*table/i, /insert.*into/i];
    for (const pattern of sqlPatterns) {
        if (pattern.test(password)) {
            errors.push('Password contains invalid characters');
            break;
        }
    }

    return errors;
}

/**
 * Main validation function for MT5 credentials
 */
export function validateMT5Credentials(credentials: MT5Credentials): ValidationResult {
    const errors: string[] = [
        ...validateServer(credentials.server),
        ...validateLogin(credentials.login),
        ...validatePassword(credentials.password),
    ];

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Sanitize input to prevent XSS and injection attacks
 */
export function sanitizeInput(input: string): string {
    return input
        .trim()
        .replace(/[<>]/g, '') // Remove angle brackets
        .substring(0, 500); // Limit length
}
