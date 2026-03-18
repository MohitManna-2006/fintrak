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

async function findOwnedTransaction(id: string, userId: string) {
  const transaction = await db.transaction.findUnique({ where: { id } });

  if (!transaction || transaction.userId !== userId || transaction.roomId !== null) {
    return null;
  }

  return transaction;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await findOwnedTransaction(id, userId);
  if (!existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
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

  const transaction = await db.transaction.update({
    where: { id },
    data: {
      amount,
      type,
      category: category.trim(),
      description: description ?? null,
      date: parsedDate,
    },
  });

  return NextResponse.json(transaction);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await findOwnedTransaction(id, userId);
  if (!existing) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  await db.transaction.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
