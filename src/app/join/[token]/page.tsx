import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/join/${token}`);
  }

  const userId = session.user.id;

  const invite = await db.roomInvite.findUnique({
    where: { token },
    include: { room: true },
  });

  if (!invite) {
    return (
      <div style={{ minHeight: "100vh", background: "#040406", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Figtree, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Invalid Invite</h1>
          <p style={{ color: "#888" }}>This invite link is invalid or has been revoked.</p>
          <a href="/rooms" style={{ display: "inline-block", marginTop: 24, padding: "10px 24px", background: "#00c896", color: "#000", borderRadius: 8, fontWeight: 600, textDecoration: "none" }}>Go to Rooms</a>
        </div>
      </div>
    );
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return (
      <div style={{ minHeight: "100vh", background: "#040406", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Figtree, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Invite Expired</h1>
          <p style={{ color: "#888" }}>This invite link has expired. Ask the room admin for a new one.</p>
          <a href="/rooms" style={{ display: "inline-block", marginTop: 24, padding: "10px 24px", background: "#00c896", color: "#000", borderRadius: 8, fontWeight: 600, textDecoration: "none" }}>Go to Rooms</a>
        </div>
      </div>
    );
  }

  // Check if already a member
  const existing = await db.roomMember.findFirst({
    where: { roomId: invite.roomId, userId },
  });

  if (!existing) {
    await db.roomMember.create({
      data: { roomId: invite.roomId, userId, role: "member" },
    });
  }

  redirect(`/rooms/${invite.roomId}`);
}
