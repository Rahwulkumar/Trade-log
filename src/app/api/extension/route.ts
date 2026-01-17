import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
    // Use admin client in DEV mode to bypass RLS, otherwise use regular client
    const isDevMode = req.headers.get("x-extension-mode") === "dev";
    const supabase = isDevMode ? createAdminClient() : await createClient();
    try {
        const body = await req.json();
        const { action, payload } = body;

        // AUTH CHECK (For MVP we trust localhost, but ideally check session/key)
        // AUTH CHECK (For MVP we trust localhost, but ideally check session/key)
        let { data: { user } } = await supabase.auth.getUser();

        // DEV MODE BYPASS: If no session, allow manual override for localhost testing
        console.log("[Extension Auth] No user session. NODE_ENV:", process.env.NODE_ENV, "Header:", req.headers.get("x-extension-mode"));
        if (!user && req.headers.get("x-extension-mode") === "dev") {
            console.log("[Extension Auth] DEV bypass triggered");
            // Try to find a user to impersonate: first from playbooks, then from profiles
            let helper: { user_id: string } | null = null;
            const { data: playbookHelper, error: playbookError } = await supabase
                .from("playbooks")
                .select("user_id")
                .limit(1)
                .single();

            if (playbookHelper) {
                helper = { user_id: (playbookHelper as any).user_id };
            }

            console.log("[Extension Auth] Playbooks query:", helper, playbookError?.message);

            // Fallback to profiles if no playbooks
            if (!helper) {
                const { data: profileHelper, error: profileError } = await supabase
                    .from("profiles")
                    .select("id")
                    .limit(1)
                    .single();
                console.log("[Extension Auth] Profiles query:", profileHelper, profileError?.message);
                if (profileHelper) {
                    helper = { user_id: (profileHelper as any).id };
                }
            }

            if (helper) {
                user = { id: helper.user_id } as any;
                console.log("[Extension Auth] Impersonating user:", user!.id);
            } else {
                // LAST RESORT: Create a mock user for truly empty databases
                // This allows extension testing even when no users exist
                console.log("[Extension Auth] No users found in database - using mock user");
                user = { id: "00000000-0000-0000-0000-000000000000" } as any;
            }
        }

        if (!user) {
            return NextResponse.json({ error: "Unauthorized. Please log in to the web app." }, { status: 401 });
        }

        switch (action) {
            case "get_strategies": {
                // In DEV mode with mock/impersonated user, show ALL strategies
                const isDevMode = req.headers.get("x-extension-mode") === "dev";
                let query = supabase.from("playbooks").select("id, name, rules");

                // Only filter by user_id if we have a real authenticated user
                if (!isDevMode) {
                    query = query.eq("user_id", user.id);
                }

                const { data: strategies, error } = await query;

                if (error) throw error;
                return NextResponse.json({ success: true, data: strategies });
            }

            case "create_trade": {
                const { error } = await supabase.from("trades").insert({
                    user_id: user.id,
                    ...payload,
                    status: "open", // Default to open
                });

                if (error) throw error;
                return NextResponse.json({ success: true });
            }

            case "seed_strategy": {
                // Determine user_id (fallback for dev)
                let targetUserId = user ? user.id : null;

                // If no user session (e.g. curl), try to find ANY user for demo purposes in DEV only
                if (!targetUserId && process.env.NODE_ENV === "development") {
                    // We can't query auth.users directly easily from client.
                    // IMPORTANT: The user MUST be logged in for this to work via Browser.
                    // IF we are using curl, we have no session.
                    // FAILSAFE: We will ask the user to trigger this via the Browser.
                    return NextResponse.json({ error: "Please trigger this via the browser while logged in." }, { status: 401 });
                }

                if (!targetUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

                const { data, error } = await (supabase as any).from("playbooks").insert({
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
                const { id, ...updates } = payload;
                const { error } = await (supabase as any)
                    .from("trades")
                    .update(updates)
                    .eq("id", id)
                    .eq("user_id", user.id); // Security check

                if (error) throw error;
                return NextResponse.json({ success: true });
            }

            default:
                return NextResponse.json({ error: "Invalid Action" }, { status: 400 });
        }

    } catch (e) {
        console.error("[Extension API Error]", e);
        return NextResponse.json({ error: e instanceof Error ? e.message : "Internal Server Error" }, { status: 500 });
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
