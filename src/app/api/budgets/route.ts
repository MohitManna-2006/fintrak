import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const VALID_CATEGORIES = [
  "Food & Dining",
  "Rent & Housing",
  "Transport",
  "Shopping",
  "Subscriptions",
  "Health",
  "Entertainment",
  "Other",
];

type BudgetPayload = {
  category: string;
  limit: number;
  month: number;
  year: number;
};

type DeletePayload = {
  id: string;
};

export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month");
  const yearParam = searchParams.get("year");

  const now = new Date();
  const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
  const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "month must be an integer between 1 and 12" },
      { status: 400 },
    );
  }

  if (!Number.isInteger(year) || year < 1) {
    return NextResponse.json(
      { error: "year must be a positive integer" },
      { status: 400 },
    );
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const [budgets, spending] = await Promise.all([
    db.budget.findMany({
      where: { userId, month, year },
    }),
    db.transaction.groupBy({
      by: ["category"],
      where: {
        userId,
        type: "expense",
        roomId: null,
        date: { gte: startDate, lt: endDate },
      },
      _sum: { amount: true },
    }),
  ]);

  const spentMap = new Map(
    spending.map((s) => [s.category, s._sum.amount ?? 0]),
  );

  const result = budgets.map((b) => ({
    id: b.id,
    category: b.category,
    limit: b.limit,
    month: b.month,
    year: b.year,
    spent: spentMap.get(b.category) ?? 0,
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as BudgetPayload | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { category, month, year } = body;
  const limit = Number(body.limit);

  if (!category || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json(
      { error: "category must be one of the valid categories" },
      { status: 400 },
    );
  }

  if (!Number.isFinite(limit) || limit <= 0) {
    return NextResponse.json(
      { error: "limit must be a positive number" },
      { status: 400 },
    );
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "month must be an integer between 1 and 12" },
      { status: 400 },
    );
  }

  if (!Number.isInteger(year) || year < 1) {
    return NextResponse.json(
      { error: "year must be a positive integer" },
      { status: 400 },
    );
  }

  const existing = await db.budget.findFirst({
    where: { userId, category, month, year },
  });

  let budget;
  if (existing) {
    budget = await db.budget.update({
      where: { id: existing.id },
      data: { limit },
    });
  } else {
    budget = await db.budget.create({
      data: { userId, category, limit, month, year },
    });
  }

  return NextResponse.json(budget);
}

export async function DELETE(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as DeletePayload | null;

  if (!body?.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const budget = await db.budget.findUnique({ where: { id: body.id } });

  if (!budget || budget.userId !== userId) {
    return NextResponse.json({ error: "Budget not found" }, { status: 404 });
  }

  await db.budget.delete({ where: { id: body.id } });

  return NextResponse.json({ success: true });
}
