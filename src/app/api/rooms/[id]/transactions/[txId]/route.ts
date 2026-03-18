import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; txId: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: roomId, txId } = await params;

  const tx = await db.transaction.findUnique({ where: { id: txId } });
  if (!tx || tx.roomId !== roomId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Allow: the person who added it OR room admin
  if (tx.userId !== userId) {
    const member = await db.roomMember.findFirst({ where: { roomId, userId } });
    if (!member || member.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await db.transaction.delete({ where: { id: txId } });
  return NextResponse.json({ ok: true });
}
