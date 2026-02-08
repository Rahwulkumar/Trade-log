import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { 
    ExtensionRequestSchema, 
    CreateTradeSchema, 
    UpdateTradeSchema,
    type CreateTradeInput,
    type UpdateTradeInput 
} from "@/lib/validation/extension-api";
import type { TradeInsert, TradeUpdate } from "@/lib/supabase/types";

export async function POST(req: NextRequest) {
    // Only allow admin client in development AND localhost
    const isDevMode = process.env.NODE_ENV === "development" && 
                      req.headers.get("x-extension-mode") === "dev" &&
                      (req.headers.get("host")?.includes("localhost") || 
                       req.headers.get("host")?.includes("127.0.0.1"));
    
    const supabase = isDevMode ? createAdminClient() : await createClient();
    
    try {
        const body = await req.json();
        
        // Validate request structure
        const requestValidation = ExtensionRequestSchema.safeParse(body);
        if (!requestValidation.success) {
            return NextResponse.json(
                { error: "Invalid request format", details: requestValidation.error.errors },
                { status: 400 }
            );
        }
        
        const { action, payload } = requestValidation.data;

        // AUTH CHECK - Always require authentication
        let { data: { user }, error: authError } = await supabase.auth.getUser();

        // DEV MODE: Only allow bypass in development AND localhost
        if (!user && isDevMode) {
            if (process.env.NODE_ENV === "development") {
                // In dev mode, try to find a user for testing
                const { data: profileHelper } = await supabase
                    .from("profiles")
                    .select("id")
                    .limit(1)
                    .single();
                
                if (profileHelper) {
                    user = { id: profileHelper.id } as { id: string };
                } else {
                    return NextResponse.json(
                        { error: "No authenticated user found. Please log in to the web app." },
                        { status: 401 }
                    );
                }
            } else {
                return NextResponse.json(
                    { error: "Unauthorized. Please log in to the web app." },
                    { status: 401 }
                );
            }
        }

        if (!user) {
            return NextResponse.json({ error: "Unauthorized. Please log in to the web app." }, { status: 401 });
        }

        switch (action) {
            case "get_strategies": {
                // Always filter by user_id for security
                const { data: strategies, error } = await supabase
                    .from("playbooks")
                    .select("id, name, rules")
                    .eq("user_id", user.id);

                if (error) throw error;
                return NextResponse.json({ success: true, data: strategies });
            }

            case "create_trade": {
                // Validate payload with Zod schema
                const validation = CreateTradeSchema.safeParse(payload);
                if (!validation.success) {
                    return NextResponse.json(
                        { error: "Invalid trade data", details: validation.error.errors },
                        { status: 400 }
                    );
                }

                const tradeData: TradeInsert = {
                    user_id: user.id,
                    symbol: validation.data.symbol,
                    direction: validation.data.direction,
                    entry_price: validation.data.entry_price,
                    position_size: validation.data.position_size,
                    pnl: validation.data.pnl ?? 0,
                    entry_date: validation.data.entry_date || new Date().toISOString(),
                    exit_price: validation.data.exit_price ?? null,
                    exit_date: validation.data.exit_date ?? null,
                    stop_loss: validation.data.stop_loss ?? null,
                    take_profit: validation.data.take_profit ?? null,
                    commission: validation.data.commission ?? null,
                    swap: validation.data.swap ?? null,
                    notes: validation.data.comment ?? null,
                    r_multiple: validation.data.r_multiple ?? null,
                    status: "open",
                };

                const { error } = await supabase.from("trades").insert(tradeData);

                if (error) throw error;
                return NextResponse.json({ success: true });
            }

            case "seed_strategy": {
                const targetUserId: string = user.id;

                const { data, error } = await supabase.from("playbooks").insert({
                    user_id: targetUserId,
                    name: "ICT Silver Bullet (Demo)",
                    description: "A time-based liquidity run strategy.",
                    rules: {
                        "Entry": "Enter at 10:00 AM NY time on FVG retest",
                        "Stop": "Below the swing low of the displacement leg",
                        "Target": "Opposing liquidity pool (PDH/PDL)"
                    },
                    is_active: true
                }).select().single();

                if (error) throw error;
                return NextResponse.json({ success: true, data });
            }

            case "get_open_trades": {
                const { data, error } = await supabase
                    .from("trades")
                    .select("*")
                    .eq("user_id", user.id)
                    .eq("status", "open")
                    .order("created_at", { ascending: false });

                if (error) throw error;
                return NextResponse.json({ success: true, data });
            }

            case "update_trade": {
                // Validate payload with Zod schema
                const validation = UpdateTradeSchema.safeParse(payload);
                if (!validation.success) {
                    return NextResponse.json(
                        { error: "Invalid update data", details: validation.error.errors },
                        { status: 400 }
                    );
                }

                const { id, ...updates } = validation.data;
                
                // Map validated fields to TradeUpdate type
                const tradeUpdate: TradeUpdate = {
                    exit_price: updates.exit_price ?? undefined,
                    pnl: updates.pnl ?? undefined,
                    exit_date: updates.exit_date ?? undefined,
                    status: updates.status ?? undefined,
                    stop_loss: updates.stop_loss ?? undefined,
                    take_profit: updates.take_profit ?? undefined,
                    commission: updates.commission ?? undefined,
                    swap: updates.swap ?? undefined,
                    notes: updates.comment ?? undefined,
                    r_multiple: updates.r_multiple ?? undefined,
                };

                // Remove undefined fields
                Object.keys(tradeUpdate).forEach(key => {
                    if (tradeUpdate[key as keyof TradeUpdate] === undefined) {
                        delete tradeUpdate[key as keyof TradeUpdate];
                    }
                });

                const { error } = await supabase
                    .from("trades")
                    .update(tradeUpdate)
                    .eq("id", id)
                    .eq("user_id", user.id); // Security check

                if (error) throw error;
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

// Enable CORS for the extension
export async function OPTIONS(request: Request) {
    return new NextResponse(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
}
