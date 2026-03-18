import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type EditPayload = {
  name: string;
  targetAmount: number;
  deadline: string;
  color?: string;
};

type ContributePayload = {
  amount: number;
};

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

  const goal = await db.goal.findUnique({ where: { id } });

  if (!goal || goal.userId !== userId) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as EditPayload | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, deadline, color } = body;
  const targetAmount = Number(body.targetAmount);

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return NextResponse.json(
      { error: "targetAmount must be a positive number" },
      { status: 400 },
    );
  }

  if (!deadline) {
    return NextResponse.json({ error: "deadline is required" }, { status: 400 });
  }

  const parsedDeadline = new Date(deadline);
  if (isNaN(parsedDeadline.getTime())) {
    return NextResponse.json({ error: "deadline must be a valid date" }, { status: 400 });
  }

  const updated = await db.goal.update({
    where: { id },
    data: {
      name: name.trim(),
      targetAmount,
      deadline: parsedDeadline,
      color: color ?? null,
    },
  });

  return NextResponse.json(updated);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const goal = await db.goal.findUnique({ where: { id } });

  if (!goal || goal.userId !== userId) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as ContributePayload | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const amount = Number(body.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "amount must be a positive number" },
      { status: 400 },
    );
  }

  const newAmount = Math.min(goal.currentAmount + amount, goal.targetAmount);

  const updated = await db.goal.update({
    where: { id },
    data: { currentAmount: newAmount },
  });

  return NextResponse.json(updated);
}
