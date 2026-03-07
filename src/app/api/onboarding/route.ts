import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type OnboardingBudgetInput = {
  category: string;
  limit: number;
};

type OnboardingPayload = {
  monthlyIncome: number;
  currency: string;
  financialGoal: string;
  budgets: OnboardingBudgetInput[];
};

export async function POST(request: Request) {
  const session = await auth();

  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as OnboardingPayload | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const monthlyIncome = Number(body.monthlyIncome);
  const currency = typeof body.currency === "string" ? body.currency : "USD";
  const financialGoal = typeof body.financialGoal === "string" ? body.financialGoal : "";
  const budgets = Array.isArray(body.budgets) ? body.budgets : [];

  if (!Number.isFinite(monthlyIncome) || monthlyIncome < 0) {
    return NextResponse.json({ error: "monthlyIncome must be a valid number" }, { status: 400 });
  }

  if (!financialGoal.trim()) {
    return NextResponse.json({ error: "financialGoal is required" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { onboarded: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.onboarded) {
    return NextResponse.json({ success: true });
  }

  const normalizedBudgets = budgets
    .filter((budget) => typeof budget?.category === "string")
    .map((budget) => ({
      category: budget.category.trim(),
      limit: Number(budget.limit),
    }))
    .filter((budget) => budget.category.length > 0 && Number.isFinite(budget.limit) && budget.limit >= 0);

  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        onboarded: true,
        monthlyIncome,
        currency,
        financialGoal,
      },
    });

    if (normalizedBudgets.length > 0) {
      await tx.budget.deleteMany({
        where: {
          userId,
          month,
          year,
          category: { in: normalizedBudgets.map((budget) => budget.category) },
        },
      });

      await tx.budget.createMany({
        data: normalizedBudgets.map((budget) => ({
          userId,
          category: budget.category,
          limit: budget.limit,
          month,
          year,
        })),
      });
    }
  });

  return NextResponse.json({ success: true });
}
