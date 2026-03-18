import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeAllBalances, simplifyDebts } from "@/lib/rooms";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const room = await db.room.findUnique({
    where: { id },
    include: {
      members: { include: { user: { select: { id: true, name: true, image: true } } } },
      transactions: {
        include: { splits: true, user: { select: { id: true, name: true } } },
        orderBy: { date: "desc" },
      },
      settlements: { orderBy: { createdAt: "desc" } },
      invites: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isMember = room.members.some((m) => m.userId === userId);
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const nameMap = new Map(room.members.map((m) => [m.userId, m.user.name ?? m.userId]));
  const balances = computeAllBalances(room.members, room.transactions, room.settlements);
  const debts = simplifyDebts(balances, nameMap);

  return NextResponse.json({
    id: room.id,
    name: room.name,
    budgetCap: room.budgetCap,
    createdById: room.createdById,
    createdAt: room.createdAt,
    members: room.members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      image: m.user.image,
      role: m.role,
      balance: balances.get(m.userId) ?? 0,
    })),
    transactions: room.transactions,
    settlements: room.settlements,
    invites: room.invites,
    debts,
    myBalance: balances.get(userId) ?? 0,
    totalExpenses: room.transactions.reduce((s, t) => s + t.amount, 0),
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const room = await db.room.findUnique({ where: { id } });
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (room.createdById !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.room.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const room = await db.room.findUnique({ where: { id } });
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (room.createdById !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const data: { name?: string; budgetCap?: number | null } = {};
  if (body?.name && typeof body.name === "string") data.name = body.name.trim();
  if ("budgetCap" in body) {
    data.budgetCap = body.budgetCap ? Number(body.budgetCap) : null;
  }

  const updated = await db.room.update({ where: { id }, data });
  return NextResponse.json(updated);
}
