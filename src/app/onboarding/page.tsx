import { TrendingUp } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { onboarded: true, currency: true, monthlyIncome: true, financialGoal: true },
  });

  if (!user) {
    redirect("/login");
  }

  if (user.onboarded) {
    redirect("/dashboard");
  }

  return (
    <main className="onb-root">
      <div className="onb-bg-glow" />
      <div className="onb-noise" />

      <section className="onb-card">
        <div className="onb-brand">
          <div className="onb-logo">
            <TrendingUp size={16} color="#000" strokeWidth={2.4} />
          </div>
          <span className="onb-wordmark">Fintrak</span>
        </div>

        <h1 className="onb-title">Let&apos;s set up your workspace</h1>
        <p className="onb-subtitle">
          This takes 60 seconds. We&apos;ll personalize everything to your finances.
        </p>

        <OnboardingForm
          defaultCurrency={user.currency ?? "USD"}
          defaultMonthlyIncome={user.monthlyIncome}
          defaultFinancialGoal={user.financialGoal}
        />
      </section>

      <style>{`
        .onb-root {
          min-height: 100dvh;
          background: #040406;
          padding: 32px 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          font-family: var(--font-figtree), sans-serif;
        }

        .onb-bg-glow {
          position: absolute;
          width: 680px;
          height: 680px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(0, 200, 150, 0.14) 0%, rgba(0, 200, 150, 0) 72%);
          filter: blur(2px);
          top: -220px;
          right: -160px;
          pointer-events: none;
        }

        .onb-noise {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.08;
          background-image:
            radial-gradient(rgba(255, 255, 255, 0.5) 0.5px, transparent 0.5px),
            radial-gradient(rgba(255, 255, 255, 0.32) 0.5px, transparent 0.5px);
          background-size: 3px 3px, 5px 5px;
          background-position: 0 0, 1px 1px;
        }

        .onb-card {
          width: 100%;
          max-width: 520px;
          background: #0c0c0f;
          border: 1px solid rgba(255, 255, 255, 0.055);
          border-radius: 8px;
          padding: 30px 26px 24px;
          position: relative;
          z-index: 1;
          transition: border-color 0.2s ease;
        }

        .onb-card:hover {
          border-color: rgba(255, 255, 255, 0.1);
        }

        .onb-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
        }

        .onb-logo {
          width: 30px;
          height: 30px;
          border-radius: 6px;
          background: #00c896;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 14px rgba(0, 200, 150, 0.35);
        }

        .onb-wordmark {
          font-family: var(--font-syne), sans-serif;
          font-weight: 700;
          font-size: 24px;
          line-height: 1;
          color: #f0f0f4;
        }

        .onb-title {
          margin: 0;
          font-family: var(--font-syne), sans-serif;
          font-weight: 800;
          font-size: 34px;
          line-height: 1.1;
          color: #f0f0f4;
          letter-spacing: -0.4px;
        }

        .onb-subtitle {
          margin-top: 12px;
          margin-bottom: 24px;
          color: #72727e;
          font-size: 14px;
          line-height: 1.45;
          font-weight: 300;
        }
      `}</style>
    </main>
  );
}
