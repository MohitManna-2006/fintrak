import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import DashboardShell from "./dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { onboarded: true, name: true, email: true },
  });

  if (!user) {
    redirect("/login");
  }

  if (!user.onboarded) {
    redirect("/onboarding");
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
