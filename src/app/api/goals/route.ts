import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type GoalPayload = {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  deadline: string;
  color?: string;
};

type DeletePayload = {
  id: string;
};

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const goals = await db.goal.findMany({
    where: { userId },
    orderBy: { deadline: "asc" },
  });

  return NextResponse.json(goals);
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as GoalPayload | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, deadline, color } = body;
  const targetAmount = Number(body.targetAmount);
  const currentAmount = body.currentAmount !== undefined ? Number(body.currentAmount) : 0;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return NextResponse.json(
      { error: "targetAmount must be a positive number" },
      { status: 400 },
    );
  }

  if (!Number.isFinite(currentAmount) || currentAmount < 0) {
    return NextResponse.json(
      { error: "currentAmount must be a non-negative number" },
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

  const goal = await db.goal.create({
    data: {
      userId,
      name: name.trim(),
      targetAmount,
      currentAmount,
      deadline: parsedDeadline,
      color: color ?? null,
    },
  });

  return NextResponse.json(goal);
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

  const goal = await db.goal.findUnique({ where: { id: body.id } });

  if (!goal || goal.userId !== userId) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  await db.goal.delete({ where: { id: body.id } });

  return NextResponse.json({ success: true });
}
