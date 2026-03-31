import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { dailyPlans, playbooks } from '@/lib/db/schema';
import { parseDailyPlanUpsert } from '@/lib/validation/daily-plan';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

// GET /api/daily-plans?date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const from = request.nextUrl.searchParams.get('from');
  const to = request.nextUrl.searchParams.get('to');

  if (from || to) {
    if (!from || !to) {
      return NextResponse.json(
        { error: 'Both from and to are required for ranged daily-plan queries.' },
        { status: 400 },
      );
    }
    if (!isIsoDate(from) || !isIsoDate(to)) {
      return NextResponse.json(
        { error: 'from and to must be valid YYYY-MM-DD dates.' },
        { status: 400 },
      );
    }
    if (from > to) {
      return NextResponse.json(
        { error: 'from must be earlier than or equal to to.' },
        { status: 400 },
      );
    }

    const rows = await db
      .select({
        plan: dailyPlans,
        playbookName: playbooks.name,
        playbookRules: playbooks.rules,
      })
      .from(dailyPlans)
      .leftJoin(playbooks, eq(dailyPlans.playbookId, playbooks.id))
      .where(
        and(
          eq(dailyPlans.userId, userId),
          gte(dailyPlans.date, from),
          lte(dailyPlans.date, to),
        ),
      )
      .orderBy(asc(dailyPlans.date));

    return NextResponse.json(
      rows.map(({ plan, playbookName, playbookRules }) => ({
        ...plan,
        playbookName: playbookName ?? null,
        playbookRules: (playbookRules as string[]) ?? [],
      })),
    );
  }

  const date = request.nextUrl.searchParams.get('date') ?? todayIso();
  if (!isIsoDate(date)) {
    return NextResponse.json(
      { error: 'date must be a valid YYYY-MM-DD value.' },
      { status: 400 },
    );
  }

  const [plan] = await db
    .select()
    .from(dailyPlans)
    .where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.date, date)))
    .limit(1);

  if (!plan) {
    return NextResponse.json(null);
  }

  // If a playbook is linked, include its rules for the strategy checklist
  let playbookRules: string[] = [];
  if (plan.playbookId) {
    const [pb] = await db
      .select({ rules: playbooks.rules })
      .from(playbooks)
      .where(eq(playbooks.id, plan.playbookId))
      .limit(1);
    playbookRules = (pb?.rules as string[]) ?? [];
  }

  return NextResponse.json({ ...plan, playbookRules });
}

// PUT /api/daily-plans  — upsert by (userId, date)
export async function PUT(request: NextRequest) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const result = parseDailyPlanUpsert(body);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid daily plan payload', details: result.error.flatten() },
      { status: 400 },
    );
  }

  const data = result.data;

  try {
    const [upserted] = await db
      .insert(dailyPlans)
      .values({
        userId,
        date: data.date,
        bias: data.bias ?? null,
        playbookId: data.playbook_id ?? null,
        maxTrades: data.max_trades ?? null,
        dailyLimit: data.daily_limit ?? null,
        universalRulesChecked: data.universal_rules_checked ?? [],
        strategyRulesChecked: data.strategy_rules_checked ?? [],
        preNote: data.pre_note ?? null,
        dayGrade: data.day_grade ?? null,
        wentWell: data.went_well ?? null,
        wentWrong: data.went_wrong ?? null,
      })
      .onConflictDoUpdate({
        target: [dailyPlans.userId, dailyPlans.date],
        set: {
          bias: data.bias ?? null,
          playbookId: data.playbook_id ?? null,
          maxTrades: data.max_trades ?? null,
          dailyLimit: data.daily_limit ?? null,
          universalRulesChecked: data.universal_rules_checked ?? [],
          strategyRulesChecked: data.strategy_rules_checked ?? [],
          preNote: data.pre_note ?? null,
          dayGrade: data.day_grade ?? null,
          wentWell: data.went_well ?? null,
          wentWrong: data.went_wrong ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    // Fetch playbook rules to include in response
    let playbookRules: string[] = [];
    if (upserted.playbookId) {
      const [pb] = await db
        .select({ rules: playbooks.rules })
        .from(playbooks)
        .where(eq(playbooks.id, upserted.playbookId))
        .limit(1);
      playbookRules = (pb?.rules as string[]) ?? [];
    }

    return NextResponse.json({ ...upserted, playbookRules });
  } catch (routeError) {
    const message = routeError instanceof Error ? routeError.message : 'Failed to save daily plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
