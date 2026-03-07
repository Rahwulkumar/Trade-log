import { NextRequest, NextResponse } from "next/server";
import { requireAuthOrBearer } from "@/lib/auth/server";
import {
    ExtensionRequestSchema,
    CreateTradeSchema,
    UpdateTradeSchema,
    type CreateTradeInput,
    type UpdateTradeInput,
} from "@/lib/validation/extension-api";
import { getPlaybooks, createPlaybook } from "@/lib/api/playbooks";
import { createTrade, getOpenTrades, updateTrade } from "@/lib/api/trades";
import type { TradeUpdate } from "@/lib/db/schema";

/**
 * Extension API supports:
 * - Same-origin: session cookie (e.g. from the web app).
 * - Cross-origin (e.g. browser extension): send Authorization: Bearer <token>
 *   where token = await getToken() from the app (useAuth().getToken() or Clerk.session.getToken()).
 */
export async function POST(req: NextRequest) {
    const { userId, error: authError } = await requireAuthOrBearer(req);
    if (authError) return authError;

    try {
        const body = await req.json();

        const requestValidation = ExtensionRequestSchema.safeParse(body);
        if (!requestValidation.success) {
            return NextResponse.json(
                { error: "Invalid request format", details: requestValidation.error.issues },
                { status: 400 }
            );
        }

        const { action, payload } = requestValidation.data;

        switch (action) {
            case "get_strategies": {
                const playbooksList = await getPlaybooks(userId);
                const data = playbooksList.map((p) => ({
                    id: p.id,
                    name: p.name,
                    rules: p.rules,
                }));
                return NextResponse.json({ success: true, data });
            }

            case "create_trade": {
                const validation = CreateTradeSchema.safeParse(payload);
                if (!validation.success) {
                    return NextResponse.json(
                        { error: "Invalid trade data", details: validation.error.issues },
                        { status: 400 }
                    );
                }
                const v = validation.data as CreateTradeInput;
                await createTrade(userId, {
                    symbol: v.symbol,
                    direction: v.direction,
                    entryPrice: String(v.entry_price),
                    positionSize: String(v.position_size),
                    pnl: v.pnl != null ? String(v.pnl) : null,
                    entryDate: v.entry_date ? new Date(v.entry_date) : new Date(),
                    exitPrice: v.exit_price != null ? String(v.exit_price) : null,
                    exitDate: v.exit_date != null ? new Date(v.exit_date) : null,
                    stopLoss: v.stop_loss != null ? String(v.stop_loss) : null,
                    takeProfit: v.take_profit != null ? String(v.take_profit) : null,
                    commission: v.commission != null ? String(v.commission) : null,
                    swap: v.swap != null ? String(v.swap) : null,
                    notes: v.comment ?? null,
                    rMultiple: v.r_multiple != null ? String(v.r_multiple) : null,
                    status: "open",
                });
                return NextResponse.json({ success: true });
            }

            case "seed_strategy": {
                const demoRules = [
                    "Enter at 10:00 AM NY time on FVG retest",
                    "Below the swing low of the displacement leg",
                    "Opposing liquidity pool (PDH/PDL)",
                ];
                const created = await createPlaybook(userId, {
                    name: "ICT Silver Bullet (Demo)",
                    description: "A time-based liquidity run strategy.",
                    rules: demoRules,
                });
                return NextResponse.json({ success: true, data: created });
            }

            case "get_open_trades": {
                const data = await getOpenTrades(userId);
                return NextResponse.json({ success: true, data });
            }

            case "update_trade": {
                const validation = UpdateTradeSchema.safeParse(payload);
                if (!validation.success) {
                    return NextResponse.json(
                        { error: "Invalid update data", details: validation.error.issues },
                        { status: 400 }
                    );
                }
                const { id, ...updates } = validation.data as UpdateTradeInput;
                const tradeUpdate: TradeUpdate = {};
                if (updates.exit_price != null) tradeUpdate.exitPrice = String(updates.exit_price);
                if (updates.pnl != null) tradeUpdate.pnl = String(updates.pnl);
                if (updates.exit_date != null) tradeUpdate.exitDate = new Date(updates.exit_date);
                if (updates.status != null) tradeUpdate.status = updates.status;
                if (updates.stop_loss != null) tradeUpdate.stopLoss = String(updates.stop_loss);
                if (updates.take_profit != null) tradeUpdate.takeProfit = String(updates.take_profit);
                if (updates.commission != null) tradeUpdate.commission = String(updates.commission);
                if (updates.swap != null) tradeUpdate.swap = String(updates.swap);
                if (updates.comment != null) tradeUpdate.notes = updates.comment;
                if (updates.r_multiple != null) tradeUpdate.rMultiple = String(updates.r_multiple);

                await updateTrade(id, userId, tradeUpdate);
                return NextResponse.json({ success: true });
            }

            default:
                return NextResponse.json({ error: "Invalid Action" }, { status: 400 });
        }
    } catch (e) {
        if (process.env.NODE_ENV === "development") {
            console.error("[Extension API Error]", e);
        }
        return NextResponse.json(
            { error: e instanceof Error ? e.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
}
