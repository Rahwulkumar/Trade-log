import { createClient } from "@supabase/supabase-js";
import seedData from "../src/lib/data/prop_firms_seed.json";
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Load environment variables manually since this is a script
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function seedPropFirms() {
    console.log("🌱 Starting Prop Firm seed...");

    for (const firmData of seedData) {
        // 1. Upsert Firm
        console.log(`Processing firm: ${firmData.name}`);

        // Check if firm exists (by name)
        const { data: existingFirm } = await supabase
            .from("prop_firms")
            .select("id")
            .eq("name", firmData.name)
            .single();

        let firmId = existingFirm?.id;

        if (!firmId) {
            const { data: newFirm, error: firmError } = await supabase
                .from("prop_firms")
                .insert({
                    name: firmData.name,
                    website: firmData.website,
                    logo_url: firmData.logo_url,
                    is_active: true
                })
                .select()
                .single();

            if (firmError) {
                console.error(`Error inserting firm ${firmData.name}:`, firmError);
                continue;
            }
            firmId = newFirm.id;
        } else {
            // Update existing firm
            await supabase
                .from("prop_firms")
                .update({
                    website: firmData.website,
                    logo_url: firmData.logo_url,
                })
                .eq("id", firmId);
        }

        // 2. Upsert Challenges
        for (const challengeData of firmData.challenges) {
            // Check for existing challenge
            const { data: existingChallenge } = await supabase
                .from("prop_firm_challenges")
                .select("id")
                .eq("firm_id", firmId)
                .eq("name", challengeData.name)
                .eq("phase_name", challengeData.phase_name)
                .single();

            if (!existingChallenge) {
                const { error: challengeError } = await supabase
                    .from("prop_firm_challenges")
                    .insert({
                        firm_id: firmId,
                        ...challengeData
                    });

                if (challengeError) {
                    console.error(`Error inserting challenge ${challengeData.name} - ${challengeData.phase_name}:`, challengeError);
                }
            } else {
                // Update key rules
                const { error: updateError } = await supabase
                    .from("prop_firm_challenges")
                    .update({
                        ...challengeData
                    })
                    .eq("id", existingChallenge.id);

                if (updateError) {
                    console.error(`Error updating challenge ${challengeData.name}:`, updateError);
                }
            }
        }
    }

    console.log("✅ Seed completed!");
}

// Execute
seedPropFirms();
