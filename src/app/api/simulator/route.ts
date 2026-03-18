import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { anthropic } from "@/lib/claude";

// ── helpers ──────────────────────────────────────────────────────────

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

type ScenarioType =
  | "cut_category"
  | "boost_savings"
  | "pay_off_debt"
  | "income_drop";

const VALID_SCENARIOS: ScenarioType[] = [
  "cut_category",
  "boost_savings",
  "pay_off_debt",
  "income_drop",
];

interface ScenarioParams {
  category?: string;
  cutAmount?: number;
  extraSavings?: number;
  debtAmount?: number;
  monthlyPayment?: number;
  dropPercent?: number;
}

interface RequestBody {
  scenario: ScenarioType;
  params: ScenarioParams;
  goalId?: string | null;
  messages: Array<{ role: string; content: string }>;
}

// ── Shared baseline fetch ────────────────────────────────────────────

async function fetchBaseline(userId: string) {
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

  const [user, currentTransactions, budgets, goals, lastThreeMonthExpenses] =
    await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { monthlyIncome: true, currency: true },
      }),
      db.transaction.findMany({
        where: {
          userId,
          roomId: null,
          date: { gte: currentMonthStart, lt: currentMonthEnd },
        },
      }),
      db.budget.findMany({
        where: { userId, month: currentMonth, year: currentYear },
      }),
      db.goal.findMany({
        where: { userId },
        orderBy: { deadline: "asc" },
      }),
      db.transaction.findMany({
        where: {
          userId,
          roomId: null,
          type: "expense",
          date: { gte: threeMonthsAgo, lt: currentMonthStart },
        },
      }),
    ]);

  const incomeTransactions = currentTransactions.filter(
    (t) => t.type === "income"
  );
  const expenseTransactions = currentTransactions.filter(
    (t) => t.type === "expense"
  );

  const incomeSum = incomeTransactions.reduce((s, t) => s + t.amount, 0);
  const expenseSum = expenseTransactions.reduce((s, t) => s + t.amount, 0);

  const monthlyIncome = user?.monthlyIncome ?? incomeSum;
  const monthlyExpenses = expenseSum;
  const monthlySavings = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? monthlySavings / monthlyIncome : 0;

  // Category spend for current month
  const categorySpend: Record<string, number> = {};
  for (const t of expenseTransactions) {
    categorySpend[t.category] = (categorySpend[t.category] ?? 0) + t.amount;
  }

  // 3-month average by category
  const threeMonthCatTotals: Record<string, number> = {};
  for (const t of lastThreeMonthExpenses) {
    threeMonthCatTotals[t.category] =
      (threeMonthCatTotals[t.category] ?? 0) + t.amount;
  }
  const threeMonthAvgByCategory: Record<string, number> = {};
  for (const [cat, total] of Object.entries(threeMonthCatTotals)) {
    threeMonthAvgByCategory[cat] = total / 3;
  }

  // Goals with monthsToGoal
  const goalsWithProjection = goals.map((g) => {
    const needed = g.targetAmount - g.currentAmount;
    let monthsToGoal: number | null = null;
    if (monthlySavings > 0 && needed > 0) {
      monthsToGoal = Math.ceil(needed / monthlySavings);
    }
    return {
      id: g.id,
      name: g.name,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      deadline: g.deadline.toISOString(),
      color: g.color,
      monthsToGoal,
    };
  });

  return {
    monthlyIncome,
    monthlyExpenses,
    monthlySavings,
    savingsRate,
    categorySpend,
    threeMonthAvgByCategory,
    goals: goalsWithProjection,
    currency: user?.currency ?? "USD",
  };
}

// ── GET — Baseline data ──────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const baseline = await fetchBaseline(userId);

    console.log("[simulator/GET] baseline loaded", {
      userId,
      monthlyIncome: baseline.monthlyIncome,
      monthlySavings: baseline.monthlySavings,
      goalCount: baseline.goals.length,
    });

    return Response.json(baseline);
  } catch (err) {
    console.error("[simulator/GET] error", err);
    return Response.json(
      { error: "Failed to load baseline data" },
      { status: 500 }
    );
  }
}

// ── POST — Run scenario + stream Claude ──────────────────────────────

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { scenario, params, goalId, messages = [] } = body;

  // ── Validation ───────────────────────────────────────────────────
  if (!VALID_SCENARIOS.includes(scenario)) {
    return Response.json(
      { error: `Invalid scenario: ${scenario}` },
      { status: 400 }
    );
  }
  if (params.cutAmount !== undefined && params.cutAmount < 0) {
    return Response.json(
      { error: "cutAmount must be >= 0" },
      { status: 400 }
    );
  }
  if (params.extraSavings !== undefined && params.extraSavings < 0) {
    return Response.json(
      { error: "extraSavings must be >= 0" },
      { status: 400 }
    );
  }
  if (params.monthlyPayment !== undefined && params.monthlyPayment < 0) {
    return Response.json(
      { error: "monthlyPayment must be >= 0" },
      { status: 400 }
    );
  }
  if (params.debtAmount !== undefined && params.debtAmount <= 0) {
    return Response.json(
      { error: "debtAmount must be > 0" },
      { status: 400 }
    );
  }
  if (
    params.dropPercent !== undefined &&
    (params.dropPercent < 0 || params.dropPercent > 100)
  ) {
    return Response.json(
      { error: "dropPercent must be 0-100" },
      { status: 400 }
    );
  }

  try {
    // ── Step 1 — Re-fetch baseline ─────────────────────────────────
    const baseline = await fetchBaseline(userId);
    const { monthlyIncome, monthlyExpenses, monthlySavings, goals } = baseline;

    // ── Step 2 — Math engine ───────────────────────────────────────

    // Resolve goal
    const goal = goalId ? goals.find((g) => g.id === goalId) ?? null : null;
    const goalTarget = goal?.targetAmount ?? null;
    const startingAmount = goal?.currentAmount ?? 0;

    // Compute adjusted savings per scenario
    let adjustedMonthlySavings = monthlySavings;
    let adjustedMonthlyIncome = monthlyIncome;

    if (scenario === "cut_category") {
      adjustedMonthlySavings = monthlySavings + (params.cutAmount ?? 0);
    } else if (scenario === "boost_savings") {
      adjustedMonthlySavings = monthlySavings + (params.extraSavings ?? 0);
    } else if (scenario === "income_drop") {
      adjustedMonthlyIncome =
        monthlyIncome * (1 - (params.dropPercent ?? 0) / 100);
      adjustedMonthlySavings = adjustedMonthlyIncome - monthlyExpenses;
    }
    // pay_off_debt: handled in the loop

    // Build projection
    const MONTH_LABELS = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ];
    const now = new Date();
    const projectionData: {
      month: number;
      label: string;
      baseline: number;
      scenario: number;
    }[] = [];

    let baselineAccum = startingAmount;
    let scenarioAccum = startingAmount;
    let debtLeft = params.debtAmount ?? 0;
    let debtPayoffMonth: number | null = null;

    for (let i = 0; i <= 12; i++) {
      const label =
        i === 0 ? "NOW" : MONTH_LABELS[(now.getMonth() + i) % 12];

      projectionData.push({
        month: i,
        label,
        baseline: Math.round(baselineAccum * 100) / 100,
        scenario: Math.round(scenarioAccum * 100) / 100,
      });

      if (i < 12) {
        // Advance baseline
        baselineAccum += monthlySavings;
        if (goalTarget !== null) {
          baselineAccum = Math.min(baselineAccum, goalTarget);
        }

        // Advance scenario
        if (scenario === "pay_off_debt") {
          if (debtLeft > 0) {
            const payment = Math.min(debtLeft, params.monthlyPayment ?? 0);
            debtLeft -= payment;
            const effectiveSavings = monthlySavings - payment;
            scenarioAccum += effectiveSavings;
            if (debtLeft <= 0 && debtPayoffMonth === null) {
              debtPayoffMonth = i + 1;
            }
          } else {
            scenarioAccum += monthlySavings;
          }
        } else {
          scenarioAccum += adjustedMonthlySavings;
        }

        if (goalTarget !== null) {
          scenarioAccum = Math.min(scenarioAccum, goalTarget);
        }
      }
    }

    // Derived metrics
    let baselineGoalMonth: number | null = null;
    let scenarioGoalMonth: number | null = null;

    if (goalTarget !== null) {
      for (let i = 0; i <= 12; i++) {
        if (
          projectionData[i].baseline >= goalTarget &&
          baselineGoalMonth === null
        ) {
          baselineGoalMonth = i;
        }
        if (
          projectionData[i].scenario >= goalTarget &&
          scenarioGoalMonth === null
        ) {
          scenarioGoalMonth = i;
        }
      }
    }

    const monthsDelta =
      baselineGoalMonth !== null && scenarioGoalMonth !== null
        ? baselineGoalMonth - scenarioGoalMonth
        : null;

    const monthlyCashFlowDelta =
      scenario === "pay_off_debt"
        ? -(params.monthlyPayment ?? 0)
        : adjustedMonthlySavings - monthlySavings;

    const annualSavingsDelta = monthlyCashFlowDelta * 12;

    console.log("[simulator/POST] scenario computed", {
      userId,
      scenario,
      monthlyCashFlowDelta,
      scenarioGoalMonth,
      monthsDelta,
    });

    // ── Step 3 — Build Claude prompt ───────────────────────────────

    let contextStr = `Scenario: ${scenario}\n`;
    contextStr += `Parameters: ${JSON.stringify(params)}\n`;
    contextStr += `Monthly income: $${monthlyIncome.toFixed(2)}\n`;
    contextStr += `Monthly expenses: $${monthlyExpenses.toFixed(2)}\n`;
    contextStr += `Current monthly savings: $${monthlySavings.toFixed(2)}\n`;
    contextStr += `Monthly cash flow change: $${monthlyCashFlowDelta >= 0 ? "+" : ""}${monthlyCashFlowDelta.toFixed(2)}\n`;
    contextStr += `Annual savings impact: $${annualSavingsDelta >= 0 ? "+" : ""}${annualSavingsDelta.toFixed(2)}\n`;

    if (goal) {
      contextStr += `Goal: "${goal.name}" — target $${goal.targetAmount.toLocaleString()}, current $${goal.currentAmount.toLocaleString()}\n`;
      if (baselineGoalMonth !== null) {
        contextStr += `Baseline reaches goal in month ${baselineGoalMonth}\n`;
      } else {
        contextStr += `Baseline does NOT reach goal within 12 months\n`;
      }
      if (scenarioGoalMonth !== null) {
        contextStr += `Scenario reaches goal in month ${scenarioGoalMonth}\n`;
      } else {
        contextStr += `Scenario does NOT reach goal within 12 months\n`;
      }
      if (monthsDelta !== null) {
        contextStr +=
          monthsDelta > 0
            ? `That's ${monthsDelta} months faster\n`
            : monthsDelta < 0
              ? `That's ${Math.abs(monthsDelta)} months slower\n`
              : `Same timeline\n`;
      }
    }

    if (scenario === "pay_off_debt" && debtPayoffMonth !== null) {
      contextStr += `Debt fully paid off in month ${debtPayoffMonth}\n`;
    }
    if (scenario === "income_drop") {
      contextStr += `New monthly income after drop: $${adjustedMonthlyIncome.toFixed(2)}\n`;
    }

    const claudeMessages: Array<{
      role: "user" | "assistant";
      content: string;
    }> = [
      ...messages.slice(-10).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: contextStr },
    ];

    // ── Step 4 — Stream response ───────────────────────────────────

    const mathPayload = JSON.stringify({
      projectionData,
      baselineGoalMonth,
      scenarioGoalMonth,
      monthsDelta,
      monthlyCashFlowDelta,
      annualSavingsDelta,
      debtPayoffMonth: debtPayoffMonth ?? null,
      adjustedMonthlySavings,
    });

    const stream = anthropic.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 250,
      system:
        "You are Fintrak's AI Copilot. Write exactly 2-3 sentences summarizing what this financial scenario means for the user. Use the exact dollar amounts and month counts provided. Reference the goal name if one is given. Be specific and direct. No greetings, no sign-offs, no generic advice. Do not use bullet points. Just flowing sentences.",
      messages: claudeMessages,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        // First chunk: math payload
        controller.enqueue(encoder.encode(mathPayload + "\n"));

        stream.on("text", (text) => {
          controller.enqueue(encoder.encode(text));
        });

        stream.on("end", () => {
          controller.close();
        });

        stream.on("error", () => {
          controller.close();
        });
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[simulator/POST] error", err);
    return Response.json(
      { error: "Failed to run scenario" },
      { status: 500 }
    );
  }
}
