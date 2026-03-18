import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import DashboardShell from "@/app/(dashboard)/dashboard-shell";

export default async function RoomsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <DashboardShell
      user={{
        name: user.name ?? session.user.name ?? "Unknown User",
        email: user.email ?? session.user.email ?? "No email",
      }}
    >
      {children}
    </DashboardShell>
  );
}
