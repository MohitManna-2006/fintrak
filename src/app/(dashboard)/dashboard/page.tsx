import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import DashboardClient from "./dashboard-client";

const MONTH_LABELS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "#00c896",
  "Rent & Housing": "#ff4455",
  Transport: "#4d9fff",
  Shopping: "#9d7fea",
  Subscriptions: "#e8a000",
  Health: "#fb7185",
  Entertainment: "#38bdf8",
  Other: "#72727e",
  Income: "#00c896",
};

function calcDelta(
  current: number,
  previous: number,
): { label: string; dir: "pos" | "neg" | "neutral" } {
  if (previous === 0) {
    return current > 0
      ? { label: "+100%", dir: "pos" }
      : { label: "—", dir: "neutral" };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  const sign = pct >= 0 ? "+" : "−";
  return {
    label: `${sign}${Math.abs(pct)}%`,
    dir: pct >= 0 ? "pos" : "neg",
  };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const startOfMonth = new Date(thisYear, thisMonth, 1);
  const startOfNextMonth = new Date(thisYear, thisMonth + 1, 1);
  const startOfLastMonth = new Date(thisYear, thisMonth - 1, 1);
  const sixMonthsAgo = new Date(thisYear, thisMonth - 5, 1);

  const [thisMonthTxns, lastMonthTxns, allRecentTxns, budgets] =
    await Promise.all([
      db.transaction.findMany({
        where: {
          userId,
          roomId: null,
          date: { gte: startOfMonth, lt: startOfNextMonth },
        },
        orderBy: { date: "desc" },
      }),
      db.transaction.findMany({
        where: {
          userId,
          roomId: null,
          date: { gte: startOfLastMonth, lt: startOfMonth },
        },
      }),
      db.transaction.findMany({
        where: {
          userId,
          roomId: null,
          date: { gte: sixMonthsAgo, lt: startOfNextMonth },
        },
      }),
      db.budget.findMany({
        where: { userId, month: thisMonth + 1, year: thisYear },
      }),
    ]);

  const incomeThisMonth = thisMonthTxns
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expensesThisMonth = thisMonthTxns
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const netBalance = incomeThisMonth - expensesThisMonth;
  const txCount = thisMonthTxns.length;

  const incomeLastMonth = lastMonthTxns
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expensesLastMonth = lastMonthTxns
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const incomeDelta = calcDelta(incomeThisMonth, incomeLastMonth);
  const rawExpDelta = calcDelta(expensesThisMonth, expensesLastMonth);
  const expensesDeltaDir: "pos" | "neg" | "neutral" =
    rawExpDelta.dir === "pos"
      ? "neg"
      : rawExpDelta.dir === "neg"
        ? "pos"
        : "neutral";

  // Pie data: top 6 expense categories
  const expenseTxns = thisMonthTxns.filter((t) => t.type === "expense");
  const categoryMap = new Map<string, number>();
  for (const t of expenseTxns) {
    categoryMap.set(t.category, (categoryMap.get(t.category) ?? 0) + t.amount);
  }
  const totalExpenses = expensesThisMonth || 1;
  const pieData = Array.from(categoryMap.entries())
    .map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
      pct: Math.round((value / totalExpenses) * 100),
      color: CATEGORY_COLORS[name] ?? "#72727e",
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Trend data: 6 months
  const trendData: { m: string; income: number; expenses: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(thisYear, thisMonth - i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    const monthTxns = allRecentTxns.filter((t) => {
      const td = new Date(t.date);
      return td.getMonth() === m && td.getFullYear() === y;
    });
    trendData.push({
      m: MONTH_LABELS[m],
      income: monthTxns
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0),
      expenses: monthTxns
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0),
    });
  }

  // Recent transactions (top 5)
  const recentTxns = thisMonthTxns.slice(0, 5).map((t) => {
    const td = new Date(t.date);
    const day = String(td.getDate()).padStart(2, "0");
    return {
      id: t.id,
      name: t.description || t.category,
      cat: t.category,
      amount: t.type === "income" ? t.amount : -t.amount,
      type: t.type,
      date: `${MONTH_LABELS[td.getMonth()]} ${day}`,
      color: CATEGORY_COLORS[t.category] ?? "#72727e",
    };
  });

  // Budget progress
  const budgetProgress = budgets.map((b) => {
    const spent = thisMonthTxns
      .filter((t) => t.type === "expense" && t.category === b.category)
      .reduce((s, t) => s + t.amount, 0);
    return {
      name: b.category,
      spent: Math.round(spent * 100) / 100,
      limit: b.limit,
      color: CATEGORY_COLORS[b.category] ?? "#72727e",
    };
  });

  // AI insight
  let aiInsight = "Add transactions to start seeing AI-powered insights.";
  if (budgetProgress.length > 0) {
    const worst = budgetProgress.reduce((a, b) =>
      b.spent / b.limit > a.spent / a.limit ? b : a,
    );
    const pct = Math.round((worst.spent / worst.limit) * 100);
    aiInsight = `${worst.name} is at ${pct}% of your budget ($${worst.spent.toLocaleString()} of $${worst.limit.toLocaleString()}).`;
  }

  const userName = session.user.name ?? "there";

  return (
    <DashboardClient
      month={thisMonth + 1}
      year={thisYear}
      userName={userName}
      stats={{
        income: incomeThisMonth,
        expenses: expensesThisMonth,
        netBalance,
        txCount,
        incomeDelta: incomeDelta.label,
        incomeDeltaDir: incomeDelta.dir,
        expensesDelta: rawExpDelta.label,
        expensesDeltaDir,
      }}
      pieData={pieData}
      trendData={trendData}
      recentTxns={recentTxns}
      budgetProgress={budgetProgress}
      aiInsight={aiInsight}
      hasData={thisMonthTxns.length > 0}
    />
  );
}
