import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const anthropic = new Anthropic();

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export async function GET(request: Request) {
  // Verify cron secret — Vercel injects this automatically in production
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-indexed
  const currentYear = now.getFullYear();
  const dayOfMonth = now.getDate();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);

  const currentMonthStart = new Date(currentYear, currentMonth - 1, 1);
  const currentMonthEnd = new Date(currentYear, currentMonth, 1);
  const threeMonthsAgoStart = new Date(currentYear, currentMonth - 4, 1);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const users = await db.user.findMany({ where: { onboarded: true } });

  let processed = 0;
  let nudgesSent = 0;

  for (const user of users) {
    try {
      const [currentExpenses, prevExpenses, budgets, goals, recentNotifs] = await Promise.all([
        db.transaction.findMany({
          where: {
            userId: user.id,
            type: "expense",
            roomId: null,
            date: { gte: currentMonthStart, lt: currentMonthEnd },
          },
        }),
        db.transaction.findMany({
          where: {
            userId: user.id,
            type: "expense",
            roomId: null,
            date: { gte: threeMonthsAgoStart, lt: currentMonthStart },
          },
        }),
        db.budget.findMany({
          where: { userId: user.id, month: currentMonth, year: currentYear },
        }),
        db.goal.findMany({ where: { userId: user.id } }),
        db.notification.findMany({
          where: { userId: user.id, createdAt: { gte: threeDaysAgo } },
        }),
      ]);

      // Skip users with no activity
      if (currentExpenses.length === 0 && goals.length === 0) continue;

      const recentTypes = new Set(recentNotifs.map((n) => n.type));

      // Current month spending by category
      const spentByCategory = new Map<string, number>();
      for (const tx of currentExpenses) {
        spentByCategory.set(tx.category, (spentByCategory.get(tx.category) ?? 0) + tx.amount);
      }
      const totalExpensesThisMonth = [...spentByCategory.values()].reduce((s, v) => s + v, 0);

      // Previous 3 months average by category
      const prevTotalByCategory = new Map<string, number>();
      for (const tx of prevExpenses) {
        prevTotalByCategory.set(
          tx.category,
          (prevTotalByCategory.get(tx.category) ?? 0) + tx.amount,
        );
      }
      const avgByCategory = new Map<string, number>();
      for (const [cat, total] of prevTotalByCategory) {
        avgByCategory.set(cat, total / 3);
      }

      const totalBudget = budgets.reduce((s, b) => s + b.limit, 0);
      const triggers: { type: string; context: string }[] = [];

      // ── Trigger (a): Budget ≥ 80% ──────────────────────────────────
      if (!recentTypes.has("budget_warning")) {
        const overBudgets = budgets
          .map((b) => {
            const spent = spentByCategory.get(b.category) ?? 0;
            const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0;
            return { b, spent, pct };
          })
          .filter(({ pct }) => pct >= 80)
          .sort((a, b) => b.pct - a.pct);

        if (overBudgets.length > 0) {
          const { b, spent, pct } = overBudgets[0];
          const status = pct >= 100 ? "Exceeded" : "Alert";
          triggers.push({
            type: "budget_warning",
            context: `Budget ${status}:\nCategory: ${b.category}\nBudget limit: $${b.limit.toFixed(2)}/month\nSpent so far this month: $${spent.toFixed(2)} (${Math.round(pct)}%)\nDays remaining in month: ${daysInMonth - dayOfMonth}`,
          });
        }
      }

      // ── Trigger (b): Goal pace miss ─────────────────────────────────
      if (!recentTypes.has("goal_pace")) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const goal of goals) {
          if (goal.currentAmount >= goal.targetAmount) continue;

          const dl = new Date(goal.deadline);
          const daysLeft = Math.floor((dl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 0) continue;

          const needed = goal.targetAmount - goal.currentAmount;
          const requiredMonthly = needed / Math.max(1, daysLeft / 30);
          const monthlyIncome = user.monthlyIncome ?? 3000;
          const progress = goal.currentAmount / goal.targetAmount;

          const isAtRisk =
            requiredMonthly > monthlyIncome * 0.3 ||
            (daysLeft <= 30 && progress < 0.7);

          if (isAtRisk) {
            const dlStr = dl.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            triggers.push({
              type: "goal_pace",
              context: `Goal at Risk:\nGoal name: ${goal.name}\nTarget: $${goal.targetAmount.toLocaleString()}\nSaved so far: $${goal.currentAmount.toLocaleString()} (${Math.round(progress * 100)}%)\nDeadline: ${dlStr} (${daysLeft} days away)\nAmount still needed: $${needed.toFixed(2)}\nRequired monthly savings to hit deadline: $${requiredMonthly.toFixed(2)}`,
            });
            break;
          }
        }
      }

      // ── Trigger (c): Category 2× above 3-month average ─────────────
      if (!recentTypes.has("category_spike")) {
        const spikes = [...spentByCategory.entries()]
          .map(([cat, spent]) => {
            const avg = avgByCategory.get(cat) ?? 0;
            return { cat, spent, avg, factor: avg > 0 ? spent / avg : 0 };
          })
          .filter(({ factor }) => factor >= 2)
          .sort((a, b) => b.factor - a.factor);

        if (spikes.length > 0) {
          const { cat, spent, avg, factor } = spikes[0];
          triggers.push({
            type: "category_spike",
            context: `Spending Spike:\nCategory: ${cat}\nThis month's spending: $${spent.toFixed(2)}\n3-month average for this category: $${avg.toFixed(2)}\nSpike factor: ${factor.toFixed(1)}x above your normal`,
          });
        }
      }

      // ── Trigger (d): Month-end trajectory (days 18–25 only) ─────────
      if (
        !recentTypes.has("trajectory_alert") &&
        dayOfMonth >= 18 &&
        dayOfMonth <= 25 &&
        totalBudget > 0 &&
        totalExpensesThisMonth > 0
      ) {
        const dailyRate = totalExpensesThisMonth / dayOfMonth;
        const projected = dailyRate * daysInMonth;

        if (projected > totalBudget * 1.2) {
          const overspend = projected - totalBudget;
          triggers.push({
            type: "trajectory_alert",
            context: `Month-End Forecast:\nToday is day ${dayOfMonth} of ${daysInMonth}\nTotal spent so far this month: $${totalExpensesThisMonth.toFixed(2)}\nProjected end-of-month total: $${projected.toFixed(2)}\nTotal monthly budget: $${totalBudget.toFixed(2)}\nProjected overspend by month-end: $${overspend.toFixed(2)}`,
          });
        }
      }

      // ── Generate nudge for each trigger ─────────────────────────────
      for (const trigger of triggers) {
        const response = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 150,
          system:
            "You are Fintrak's notification system. Write ONE short, specific nudge message (2 sentences max) for a user based on the financial data below. Use the exact dollar amounts and names provided. Be direct, specific, and actionable — not generic or preachy. Do not use greetings or sign-offs. Return only the message text.",
          messages: [{ role: "user", content: trigger.context }],
        });

        const text =
          response.content[0].type === "text" ? response.content[0].text.trim() : "";

        if (text) {
          await db.notification.create({
            data: { userId: user.id, type: trigger.type, message: text, isRead: false },
          });
          nudgesSent++;
        }
      }

      processed++;
    } catch {
      // Continue processing remaining users if one fails
    }
  }

  return NextResponse.json({ ok: true, processed, nudgesSent });
}
