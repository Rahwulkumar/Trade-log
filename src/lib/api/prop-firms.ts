import { createClient } from "@/lib/supabase/client";
import { PropFirm, PropFirmChallenge, CreateAccountFromChallengeParams } from "@/lib/types/prop-firms";

/**
 * Fetch all active prop firms
 */
export async function getPropFirms(): Promise<PropFirm[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("prop_firms")
        .select("*")
        .eq("is_active", true)
        .order("name");

    if (error) throw error;
    return data;
}

/**
 * Fetch challenges for a specific firm
 */
export async function getFirmChallenges(firmId: string): Promise<PropFirmChallenge[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("prop_firm_challenges")
        .select("*, firm:prop_firms(*)")
        .eq("firm_id", firmId)
        .eq("is_active", true)
        .order("initial_balance", { ascending: true })
        .order("phase_order", { ascending: true });

    if (error) throw error;
    return data;
}

/**
 * Create a user prop account based on a challenge template
 */
export async function createAccountFromChallenge({
    userId,
    challengeId,
    name,
    startDate,
}: CreateAccountFromChallengeParams) {
    const supabase = createClient();

    // 1. Fetch challenge details to populate initial rules
    const { data: challenge, error: challengeError } = await supabase
        .from("prop_firm_challenges")
        .select("*, firm:prop_firms(name)")
        .eq("id", challengeId)
        .single();

    if (challengeError || !challenge) {
        throw new Error("Challenge not found");
    }

    const firmName = challenge.firm?.name || "Unknown Firm";

    // 2. Create the account
    const { data, error } = await supabase
        .from("prop_accounts")
        .insert({
            user_id: userId,
            name: name,
            firm: firmName, // Legacy field, kept for consistency
            phase: challenge.phase_name, // Legacy field

            initial_balance: challenge.initial_balance,
            current_balance: challenge.initial_balance,
            start_date: startDate,

            // Map challenge rules to account limits
            // Note: We might want to store exact amounts or percentages. 
            // For now, mapping percentages if available, otherwise calculating amount?
            // The schema for prop_accounts uses daily_dd_max (amount) or percent? 
            // Checking schema: daily_dd_max DECIMAL. Usually implies scalar amount.
            // Let's assume the user wants Amount for tracking.

            daily_dd_max: challenge.daily_loss_amount || (challenge.daily_loss_percent ? (challenge.initial_balance * (challenge.daily_loss_percent / 100)) : null),
            total_dd_max: challenge.max_loss_amount || (challenge.max_loss_percent ? (challenge.initial_balance * (challenge.max_loss_percent / 100)) : null),
            profit_target: challenge.profit_target_percent ? (challenge.initial_balance * (challenge.profit_target_percent / 100)) : null,

            // Link to challenge
            challenge_id: challenge.id,
            current_phase_status: 'in_progress',
            status: 'active'
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Admin: Upsert a Prop Firm
 */
export async function upsertPropFirm(firm: Partial<PropFirm>) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("prop_firms")
        .upsert(firm)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Admin: Upsert a Challenge
 */
export async function upsertChallenge(challenge: Partial<PropFirmChallenge>) {
    const supabase = createClient();
    // Remove joined fields before upsert
    const { firm, ...cleanChallenge } = challenge;

    const { data, error } = await supabase
        .from("prop_firm_challenges")
        .upsert(cleanChallenge)
        .select()
        .single();

    if (error) throw error;
    return data;
}
