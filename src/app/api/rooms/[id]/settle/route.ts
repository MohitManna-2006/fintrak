import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeAllBalances, simplifyDebts } from "@/lib/rooms";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: roomId } = await params;

  const room = await db.room.findUnique({
    where: { id: roomId },
    include: {
      members: { include: { user: { select: { id: true, name: true } } } },
      transactions: { include: { splits: true } },
      settlements: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isMember = room.members.some((m) => m.userId === userId);
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const nameMap = new Map(room.members.map((m) => [m.userId, m.user.name ?? m.userId]));
  const balances = computeAllBalances(room.members, room.transactions, room.settlements);
  const debts = simplifyDebts(balances, nameMap);

  return NextResponse.json({ debts, settlements: room.settlements });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: roomId } = await params;

  const member = await db.roomMember.findFirst({ where: { roomId, userId } });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const { fromUserId, toUserId, amount, note } = body ?? {};

  if (!fromUserId || !toUserId || !amount || typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "fromUserId, toUserId, and positive amount are required" }, { status: 400 });
  }

  const settlement = await db.settlement.create({
    data: {
      roomId,
      fromUserId,
      toUserId,
      amount: Math.round(Number(amount) * 100) / 100,
      note: note ?? null,
    },
  });

  return NextResponse.json(settlement);
}
