import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: roomId } = await params;

  const member = await db.roomMember.findFirst({ where: { roomId, userId } });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const transactions = await db.transaction.findMany({
    where: { roomId },
    include: {
      splits: { include: { user: { select: { id: true, name: true } } } },
      user: { select: { id: true, name: true, image: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(transactions);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: roomId } = await params;

  const member = await db.roomMember.findFirst({ where: { roomId, userId } });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { description, amount, category, date, paidByUserId, splitType, splits } = body;

  if (!amount || typeof amount !== "number" || amount <= 0)
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  if (!paidByUserId) return NextResponse.json({ error: "paidByUserId is required" }, { status: 400 });
  if (!splits || !Array.isArray(splits) || splits.length === 0)
    return NextResponse.json({ error: "splits are required" }, { status: 400 });

  // Verify all split user IDs are members
  const room = await db.room.findUnique({
    where: { id: roomId },
    include: { members: true },
  });
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const memberIds = new Set(room.members.map((m) => m.userId));
  for (const s of splits) {
    if (!memberIds.has(s.userId)) {
      return NextResponse.json({ error: `User ${s.userId} is not a room member` }, { status: 400 });
    }
  }

  const tx = await db.transaction.create({
    data: {
      userId,
      roomId,
      amount: Number(amount),
      type: "expense",
      category: category ?? "Other",
      description: description ?? null,
      date: date ? new Date(date) : new Date(),
      paidByUserId,
      splitType: splitType ?? "equal",
      splits: {
        create: splits.map((s: { userId: string; amount: number }) => ({
          userId: s.userId,
          amount: Number(s.amount),
        })),
      },
    },
    include: {
      splits: { include: { user: { select: { id: true, name: true } } } },
      user: { select: { id: true, name: true, image: true } },
    },
  });

  return NextResponse.json(tx);
}
