/**
 * Extension API Validation Schemas
 * Zod schemas for validating extension API requests
 */

import { z } from 'zod';

/**
 * Schema for creating a new trade via extension
 */
export const CreateTradeSchema = z.object({
    symbol: z.string().min(1).max(20).trim(),
    direction: z.enum(['LONG', 'SHORT']),
    entry_price: z.number().positive('Entry price must be positive'),
    position_size: z.number().positive('Position size must be positive'),
    pnl: z.number().optional(),
    entry_date: z.string().datetime().optional(),
    exit_price: z.number().positive().optional(),
    exit_date: z.string().datetime().optional(),
    stop_loss: z.number().positive().optional(),
    take_profit: z.number().positive().optional(),
    commission: z.number().optional(),
    swap: z.number().optional(),
    comment: z.string().max(500).optional(),
    r_multiple: z.number().optional(),
});

/**
 * Schema for updating an existing trade via extension
 * Only allows specific fields to be updated
 */
export const UpdateTradeSchema = z.object({
    id: z.string().uuid('Invalid trade ID format'),
    exit_price: z.number().positive().optional(),
    pnl: z.number().optional(),
    exit_date: z.string().datetime().optional(),
    status: z.enum(['open', 'closed']).optional(),
    stop_loss: z.number().positive().optional(),
    take_profit: z.number().positive().optional(),
    commission: z.number().optional(),
    swap: z.number().optional(),
    comment: z.string().max(500).optional(),
    r_multiple: z.number().optional(),
}).refine(
    (data) => {
        // At least one field must be provided for update
        const { id, ...updates } = data;
        return Object.keys(updates).length > 0;
    },
    {
        message: 'At least one field must be provided for update',
    }
);

/**
 * Schema for extension API request body
 */
export const ExtensionRequestSchema = z.object({
    action: z.enum(['get_strategies', 'create_trade', 'update_trade', 'get_open_trades', 'seed_strategy']),
    payload: z.record(z.unknown()).optional(),
});

/**
 * Type exports for use in route handlers
 */
export type CreateTradeInput = z.infer<typeof CreateTradeSchema>;
export type UpdateTradeInput = z.infer<typeof UpdateTradeSchema>;
export type ExtensionRequest = z.infer<typeof ExtensionRequestSchema>;
