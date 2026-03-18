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

  // Load room members BEFORE reading body — needed for all validation
  const room = await db.room.findUnique({
    where: { id: roomId },
    include: { members: true },
  });
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const memberIds = new Set(room.members.map((m) => m.userId));

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { description, amount, category, date, paidByUserId, splitType, splits } = body;

  if (!amount || typeof amount !== "number" || !isFinite(amount) || amount <= 0) {
    console.error("[room-transactions] validation failed", { reason: "invalid amount", userId, roomId, amount });
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  if (!paidByUserId) {
    console.error("[room-transactions] validation failed", { reason: "missing paidByUserId", userId, roomId });
    return NextResponse.json({ error: "paidByUserId is required" }, { status: 400 });
  }

  // Validate paidByUserId is a room member
  if (!memberIds.has(paidByUserId)) {
    console.error("[room-transactions] validation failed", { reason: "paidByUserId not a member", userId, roomId, paidByUserId });
    return NextResponse.json({ error: "paidByUserId is not a room member" }, { status: 400 });
  }

  const effectiveSplitType = splitType ?? "equal";
  let computedSplits: { userId: string; amount: number }[];

  if (effectiveSplitType === "equal") {
    // Compute splits server-side
    const sortedMemberIds = Array.from(memberIds).sort();
    const count = sortedMemberIds.length;
    const base = Math.floor((amount / count) * 100) / 100;
    const totalBase = Math.round(base * count * 100);
    const totalCents = Math.round(amount * 100);
    const remainderCents = totalCents - totalBase;

    computedSplits = sortedMemberIds.map((mid, i) => ({
      userId: mid,
      amount: i < remainderCents ? base + 0.01 : base,
    }));
  } else if (effectiveSplitType === "weighted") {
    // Validate client-provided splits
    if (!splits || !Array.isArray(splits) || splits.length === 0) {
      console.error("[room-transactions] validation failed", { reason: "weighted split missing splits array", userId, roomId });
      return NextResponse.json({ error: "splits array is required for weighted split" }, { status: 400 });
    }

    // Check for duplicate userIds
    const splitUserIds = splits.map((s: { userId: string }) => s.userId);
    const uniqueUserIds = new Set(splitUserIds);
    if (uniqueUserIds.size !== splitUserIds.length) {
      console.error("[room-transactions] validation failed", { reason: "duplicate userIds in splits", userId, roomId });
      return NextResponse.json({ error: "Duplicate userIds in splits" }, { status: 400 });
    }

    // Validate each split
    for (const s of splits as { userId: string; amount: number }[]) {
      if (!memberIds.has(s.userId)) {
        console.error("[room-transactions] validation failed", { reason: "split userId not a member", userId, roomId, splitUserId: s.userId });
        return NextResponse.json({ error: `User ${s.userId} is not a room member` }, { status: 400 });
      }
      if (typeof s.amount !== "number" || !isFinite(s.amount) || s.amount < 0) {
        console.error("[room-transactions] validation failed", { reason: "invalid split amount", userId, roomId, splitUserId: s.userId, splitAmount: s.amount });
        return NextResponse.json({ error: `Split amount for user ${s.userId} must be a non-negative finite number` }, { status: 400 });
      }
    }

    // Validate sum matches total
    const splitsSum = (splits as { amount: number }[]).reduce((acc, s) => acc + s.amount, 0);
    if (Math.abs(splitsSum - amount) > 0.01) {
      console.error("[room-transactions] validation failed", { reason: "splits sum mismatch", userId, roomId, amount, splitsSum });
      return NextResponse.json({ error: `Splits sum (${splitsSum}) does not equal amount (${amount})` }, { status: 400 });
    }

    computedSplits = (splits as { userId: string; amount: number }[]).map((s) => ({
      userId: s.userId,
      amount: Number(s.amount),
    }));
  } else {
    console.error("[room-transactions] validation failed", { reason: "invalid splitType", userId, roomId, splitType });
    return NextResponse.json({ error: "splitType must be \"equal\" or \"weighted\"" }, { status: 400 });
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
      splitType: effectiveSplitType,
      splits: {
        create: computedSplits.map((s) => ({
          userId: s.userId,
          amount: s.amount,
        })),
      },
    },
    include: {
      splits: { include: { user: { select: { id: true, name: true } } } },
      user: { select: { id: true, name: true, image: true } },
    },
  });

  console.log("[room-transactions] created", { id: tx.id, userId, roomId });
  return NextResponse.json(tx);
}
