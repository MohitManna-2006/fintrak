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

  // Load all room members and room name in one query
  const roomWithMembers = await db.room.findUnique({
    where: { id: roomId },
    select: {
      name: true,
      members: { select: { userId: true, role: true } },
    },
  });

  if (!roomWithMembers) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const memberMap = new Map(roomWithMembers.members.map((m) => [m.userId, m.role]));
  const roomName = roomWithMembers.name;

  const callerRole = memberMap.get(userId);
  if (!callerRole) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const { fromUserId, toUserId, amount, note } = body ?? {};

  if (!fromUserId || !toUserId || !amount || typeof amount !== "number" || !isFinite(amount) || amount <= 0) {
    console.error("[room-settle] validation failed", { reason: "missing or invalid fields", userId, roomId, fromUserId, toUserId, amount });
    return NextResponse.json({ error: "fromUserId, toUserId, and positive amount are required" }, { status: 400 });
  }

  if (!memberMap.has(fromUserId)) {
    console.error("[room-settle] validation failed", { reason: "fromUserId not a member", userId, roomId, fromUserId });
    return NextResponse.json({ error: "fromUserId is not a room member" }, { status: 400 });
  }

  if (!memberMap.has(toUserId)) {
    console.error("[room-settle] validation failed", { reason: "toUserId not a member", userId, roomId, toUserId });
    return NextResponse.json({ error: "toUserId is not a room member" }, { status: 400 });
  }

  if (fromUserId === toUserId) {
    console.error("[room-settle] validation failed", { reason: "self-settlement", userId, roomId, fromUserId });
    return NextResponse.json({ error: "fromUserId and toUserId must be different" }, { status: 400 });
  }

  // Auth: fromUserId must equal session userId OR caller must be admin
  if (fromUserId !== userId && callerRole !== "admin") {
    console.error("[room-settle] validation failed", { reason: "unauthorized settlement on behalf", userId, roomId, fromUserId });
    return NextResponse.json({ error: "You can only record settlements on your own behalf" }, { status: 403 });
  }

  // Fetch user names for transaction descriptions
  const [fromUser, toUser] = await Promise.all([
    db.user.findUnique({ where: { id: fromUserId }, select: { name: true } }),
    db.user.findUnique({ where: { id: toUserId }, select: { name: true } }),
  ]);

  const fromUserName = fromUser?.name ?? fromUserId;
  const toUserName = toUser?.name ?? toUserId;
  const roundedAmount = Math.round(Number(amount) * 100) / 100;

  // Create settlement + personal transactions atomically
  const [settlement] = await db.$transaction([
    db.settlement.create({
      data: {
        roomId,
        fromUserId,
        toUserId,
        amount: roundedAmount,
        note: note ?? null,
      },
    }),
    // Personal expense for the payer (fromUser)
    db.transaction.create({
      data: {
        userId: fromUserId,
        roomId: null,
        amount: roundedAmount,
        type: "expense",
        category: "Room Settlement",
        description: `Paid ${toUserName} · ${roomName}`,
        date: new Date(),
        paidByUserId: null,
        splitType: null,
      },
    }),
    // Personal income for the recipient (toUser)
    db.transaction.create({
      data: {
        userId: toUserId,
        roomId: null,
        amount: roundedAmount,
        type: "income",
        category: "Room Settlement",
        description: `Received from ${fromUserName} · ${roomName}`,
        date: new Date(),
        paidByUserId: null,
        splitType: null,
      },
    }),
  ]);

  console.log("[settle] settlement + transactions created", {
    settlementId: settlement.id,
    fromUserId,
    toUserId,
    amount: roundedAmount,
    roomId,
  });

  return NextResponse.json(settlement);
}
