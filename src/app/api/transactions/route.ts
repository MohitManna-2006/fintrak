import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type TransactionPayload = {
  amount: number;
  type: string;
  category: string;
  description?: string;
  date: string;
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

  const where: Record<string, unknown> = { userId, roomId: null };

  if (monthParam || yearParam) {
    if (!monthParam || !yearParam) {
      return NextResponse.json(
        { error: "Both month and year must be provided" },
        { status: 400 },
      );
    }

    const month = parseInt(monthParam, 10);
    const year = parseInt(yearParam, 10);

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

    where.date = { gte: startDate, lt: endDate };
  }

  const transactions = await db.transaction.findMany({
    where,
    orderBy: { date: "desc" },
  });

  return NextResponse.json(transactions);
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as TransactionPayload | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const amount = Number(body.amount);
  const { type, category, description, date } = body;

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "amount must be a positive number" },
      { status: 400 },
    );
  }

  if (type !== "income" && type !== "expense") {
    return NextResponse.json(
      { error: 'type must be "income" or "expense"' },
      { status: 400 },
    );
  }

  if (!category || typeof category !== "string" || !category.trim()) {
    return NextResponse.json(
      { error: "category is required" },
      { status: 400 },
    );
  }

  if (!date) {
    return NextResponse.json(
      { error: "date is required" },
      { status: 400 },
    );
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json(
      { error: "date must be a valid date string" },
      { status: 400 },
    );
  }

  const transaction = await db.transaction.create({
    data: {
      userId,
      amount,
      type,
      category: category.trim(),
      description: description ?? null,
      date: parsedDate,
      roomId: null,
    },
  });

  return NextResponse.json(transaction, { status: 201 });
}
