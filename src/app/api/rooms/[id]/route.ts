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
  const totalExpenses = room.transactions.reduce((s, t) => s + t.amount, 0);

  // Safety net: $0 expenses → all balances must be $0
  if (totalExpenses === 0) {
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
        balance: 0,
      })),
      transactions: room.transactions,
      settlements: room.settlements,
      invites: room.invites,
      debts: [],
      myBalance: 0,
      totalExpenses: 0,
    });
  }

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
    totalExpenses,
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
  if (!body || typeof body !== "object") {
    console.error("[room-patch] validation failed", { reason: "null or invalid body", userId, roomId: id });
    return NextResponse.json({ error: "Request body is required" }, { status: 400 });
  }

  const data: { name?: string; budgetCap?: number | null } = {};

  if ("name" in body) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      console.error("[room-patch] validation failed", { reason: "empty name", userId, roomId: id });
      return NextResponse.json({ error: "Room name cannot be empty" }, { status: 400 });
    }
    data.name = body.name.trim();
  }

  if ("budgetCap" in body) {
    if (body.budgetCap === null) {
      data.budgetCap = null;
    } else {
      const cap = Number(body.budgetCap);
      if (!isFinite(cap) || cap <= 0) {
        console.error("[room-patch] validation failed", { reason: "invalid budgetCap", userId, roomId: id, budgetCap: body.budgetCap });
        return NextResponse.json({ error: "budgetCap must be a positive number or null" }, { status: 400 });
      }
      data.budgetCap = cap;
    }
  }

  if (Object.keys(data).length === 0) {
    console.error("[room-patch] validation failed", { reason: "no valid fields", userId, roomId: id });
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const updated = await db.room.update({ where: { id }, data });
  console.log("[room-patch] updated", { id: updated.id, userId, roomId: id, fields: Object.keys(data) });
  return NextResponse.json(updated);
}
