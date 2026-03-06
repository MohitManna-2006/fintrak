import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import DashboardShell from "./dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardShell
      user={{
        name: session.user.name ?? "Unknown User",
        email: session.user.email ?? "No email",
      }}
    >
      {children}
    </DashboardShell>
  );
}
