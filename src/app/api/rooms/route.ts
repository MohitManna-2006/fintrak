import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeUserBalance } from "@/lib/rooms";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await db.roomMember.findMany({
    where: { userId },
    include: {
      room: {
        include: {
          members: { include: { user: { select: { id: true, name: true, image: true } } } },
          transactions: { include: { splits: true } },
          settlements: true,
        },
      },
    },
  });

  const rooms = memberships.map(({ room }) => {
    const balance = computeUserBalance(userId, room.transactions, room.settlements);
    return {
      id: room.id,
      name: room.name,
      budgetCap: room.budgetCap,
      createdById: room.createdById,
      createdAt: room.createdAt,
      memberCount: room.members.length,
      members: room.members.map((m) => ({
        userId: m.userId,
        name: m.user.name,
        image: m.user.image,
        role: m.role,
      })),
      totalExpenses: room.transactions.reduce((s, t) => s + t.amount, 0),
      myBalance: balance,
    };
  });

  return NextResponse.json(rooms);
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const budgetCap = body.budgetCap ? Number(body.budgetCap) : null;
  if (budgetCap !== null && (!Number.isFinite(budgetCap) || budgetCap <= 0)) {
    return NextResponse.json({ error: "budgetCap must be a positive number" }, { status: 400 });
  }

  const room = await db.room.create({
    data: {
      name: body.name.trim(),
      createdById: userId,
      budgetCap,
      members: { create: { userId, role: "admin" } },
    },
    include: { members: true },
  });

  return NextResponse.json(room);
}
