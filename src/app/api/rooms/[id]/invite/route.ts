import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const member = await db.roomMember.findFirst({ where: { roomId: id, userId } });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Create invite with 7-day expiry
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const invite = await db.roomInvite.create({
    data: { roomId: id, expiresAt },
  });

  return NextResponse.json({ token: invite.token, expiresAt: invite.expiresAt });
}
