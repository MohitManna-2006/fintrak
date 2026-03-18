import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE /api/rooms/[id]/members?userId=xxx  — leave or remove a member
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const currentUserId = session?.user?.id;
  if (!currentUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: roomId } = await params;
  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("userId") ?? currentUserId;

  const room = await db.room.findUnique({ where: { id: roomId } });
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Can remove yourself OR admin can remove others (but not creator)
  const currentMember = await db.roomMember.findFirst({ where: { roomId, userId: currentUserId } });
  if (!currentMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (targetUserId !== currentUserId) {
    if (currentMember.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (targetUserId === room.createdById) return NextResponse.json({ error: "Cannot remove room creator" }, { status: 400 });
  }

  const memberCount = await db.roomMember.count({ where: { roomId } });
  if (targetUserId === room.createdById && memberCount === 1) {
    return NextResponse.json({ error: "Creator cannot leave — delete the room instead" }, { status: 400 });
  }

  await db.roomMember.deleteMany({ where: { roomId, userId: targetUserId } });
  return NextResponse.json({ ok: true });
}
