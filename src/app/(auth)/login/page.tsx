import { TrendingUp } from "lucide-react";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  // Only allow relative paths to prevent open-redirect attacks
  const raw = params.callbackUrl ?? "";
  const callbackUrl = raw.startsWith("/") ? raw : "/dashboard";

  if (session?.user) {
    redirect(callbackUrl);
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#070708",
        padding: "24px",
        fontFamily: "var(--font-figtree), sans-serif",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 460,
          background: "#0c0c0f",
          border: "1px solid rgba(255,255,255,0.055)",
          borderRadius: 8,
          padding: "32px 28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 26 }}>
          <div
            style={{
              width: 30,
              height: 30,
              background: "#00c896",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 14px rgba(0,200,150,0.35)",
            }}
          >
            <TrendingUp size={16} color="#000" strokeWidth={2.4} />
          </div>
          <span
            style={{
              fontFamily: "var(--font-syne), sans-serif",
              fontWeight: 700,
              fontSize: 24,
              color: "#f0f0f4",
              lineHeight: 1,
            }}
          >
            Fintrak
          </span>
        </div>

        <h1
          style={{
            fontFamily: "var(--font-syne), sans-serif",
            fontWeight: 800,
            fontSize: 30,
            lineHeight: 1.15,
            color: "#f0f0f4",
            margin: 0,
          }}
        >
          Your finances, finally making sense.
        </h1>

        <p
          style={{
            marginTop: 12,
            marginBottom: 26,
            color: "#72727e",
            fontWeight: 300,
            fontSize: 14,
            lineHeight: 1.45,
          }}
        >
          Sign in to access your dashboard, budgets, and AI copilot insights.
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl });
          }}
        >
          <button
            type="submit"
            style={{
              width: "100%",
              minHeight: 44,
              borderRadius: 8,
              border: "1px solid transparent",
              background: "#00c896",
              color: "#000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              fontFamily: "var(--font-figtree), sans-serif",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M21.8 12.2c0-.77-.07-1.5-.2-2.2H12v4.17h5.5a4.7 4.7 0 0 1-2.04 3.08v2.55h3.3c1.94-1.79 3.04-4.44 3.04-7.6z"
                fill="#000"
              />
              <path
                d="M12 22c2.76 0 5.08-.92 6.77-2.48l-3.3-2.55c-.91.61-2.07.98-3.47.98-2.67 0-4.93-1.8-5.74-4.22H2.85v2.63A10 10 0 0 0 12 22z"
                fill="#000"
              />
              <path
                d="M6.26 13.73A5.97 5.97 0 0 1 5.94 12c0-.6.11-1.18.32-1.73V7.64H2.85A10 10 0 0 0 2 12c0 1.61.39 3.13 1.08 4.36l3.18-2.63z"
                fill="#000"
              />
              <path
                d="M12 6.05c1.5 0 2.85.52 3.91 1.53l2.93-2.93A9.76 9.76 0 0 0 12 2 10 10 0 0 0 2.85 7.64l3.41 2.63C7.07 7.85 9.33 6.05 12 6.05z"
                fill="#000"
              />
            </svg>
            Continue with Google
          </button>
        </form>
      </section>
    </main>
  );
}
