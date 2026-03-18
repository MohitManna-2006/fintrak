import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const MONTH_LABELS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

type RequestBody = {
  message: string;
  history: { role: string; content: string }[];
};

function formatDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  return `${MONTH_LABELS[d.getMonth()]} ${day}`;
}

function buildSystemPrompt(
  transactions: { amount: number; type: string; category: string; description: string | null; date: Date }[],
  budgets: { category: string; limit: number }[],
  goals: { name: string; targetAmount: number; currentAmount: number; deadline: Date }[],
): string {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const thisMonthTxns = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  const incomeThisMonth = thisMonthTxns
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expensesThisMonth = thisMonthTxns
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const netBalance = incomeThisMonth - expensesThisMonth;

  const txLines = transactions
    .map((t) => {
      const d = new Date(t.date);
      const label = t.type === "income" ? "INCOME" : "EXPENSE";
      const desc = t.description || t.category;
      return `[${formatDate(d)}] ${label} $${t.amount.toFixed(2)} - ${desc} (${t.category})`;
    })
    .join("\n");

  const budgetLines = budgets
    .map((b) => {
      const spent = thisMonthTxns
        .filter((t) => t.type === "expense" && t.category === b.category)
        .reduce((s, t) => s + t.amount, 0);
      const pct = b.limit > 0 ? Math.round((spent / b.limit) * 100) : 0;
      return `${b.category}: $${spent.toFixed(0)} spent of $${b.limit.toFixed(0)} limit (${pct}%)`;
    })
    .join("\n");

  const goalLines = goals
    .map((g) => {
      const dl = new Date(g.deadline);
      const dlStr = dl.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return `${g.name}: $${g.currentAmount.toLocaleString()} of $${g.targetAmount.toLocaleString()} target, deadline ${dlStr}`;
    })
    .join("\n");

  return `You are Fintrak AI Copilot, a personal finance assistant. Today is ${now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.

Here is the user's financial data:

SUMMARY (THIS MONTH):
- Total income: $${incomeThisMonth.toFixed(2)}
- Total expenses: $${expensesThisMonth.toFixed(2)}
- Net balance: $${netBalance.toFixed(2)}

TRANSACTIONS (LAST 90 DAYS):
${txLines || "No transactions recorded yet."}

BUDGETS (THIS MONTH):
${budgetLines || "No budgets set."}

GOALS:
${goalLines || "No goals set."}

INSTRUCTIONS:
- Answer questions about the user's actual financial data above.
- Be specific — reference real transaction names, amounts, and dates.
- Be concise — 2-4 sentences unless a detailed breakdown is asked for.
- Format any lists with line breaks for readability.
- Never make up transactions or numbers not in the provided data.
- Respond conversationally, not like a formal report.`;
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = (await request.json().catch(() => null)) as RequestBody | null;

  if (!body || !body.message || typeof body.message !== "string" || !body.message.trim()) {
    return new Response(JSON.stringify({ error: "message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { message, history = [] } = body;
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);

  const [transactions, budgets, goals] = await Promise.all([
    db.transaction.findMany({
      where: { userId, roomId: null, date: { gte: ninetyDaysAgo } },
      orderBy: { date: "desc" },
    }),
    db.budget.findMany({
      where: { userId, month: now.getMonth() + 1, year: now.getFullYear() },
    }),
    db.goal.findMany({ where: { userId } }),
  ]);

  const systemPrompt = buildSystemPrompt(transactions, budgets, goals);

  const messages: Anthropic.MessageParam[] = [
    ...history.slice(-40).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const encoder = new TextEncoder();
  let fullResponse = "";

  const readable = new ReadableStream({
    async start(controller) {
      stream.on("text", (text) => {
        fullResponse += text;
        controller.enqueue(encoder.encode(text));
      });

      stream.on("end", () => {
        db.chatMessage
          .createMany({
            data: [
              { userId, role: "user", content: message, roomId: null },
              { userId, role: "assistant", content: fullResponse, roomId: null },
            ],
          })
          .catch(() => {});
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
}
