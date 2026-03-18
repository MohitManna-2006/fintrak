"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type GoalOption =
  | "Save for something big"
  | "Pay off debt"
  | "Build emergency fund"
  | "General tracking";

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD"] as const;

const BUDGET_CONFIG = [
  { key: "Food & Dining", placeholder: "400", color: "#00c896" },
  { key: "Rent & Housing", placeholder: "1200", color: "#ff4455" },
  { key: "Transport", placeholder: "200", color: "#4d9fff" },
  { key: "Shopping", placeholder: "300", color: "#9d7fea" },
  { key: "Subscriptions", placeholder: "100", color: "#e8a000" },
  { key: "Health", placeholder: "150", color: "#fb7185" },
] as const;

const GOAL_OPTIONS: GoalOption[] = [
  "Save for something big",
  "Pay off debt",
  "Build emergency fund",
  "General tracking",
];

const CURRENCY_SYMBOL: Record<(typeof CURRENCIES)[number], string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  CAD: "C$",
  AUD: "A$",
};

type OnboardingFormProps = {
  defaultCurrency: string;
  defaultMonthlyIncome?: number | null;
  defaultFinancialGoal?: string | null;
};

export function OnboardingForm({
  defaultCurrency,
  defaultMonthlyIncome,
  defaultFinancialGoal,
}: OnboardingFormProps) {
  const router = useRouter();
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);

  const [monthlyIncome, setMonthlyIncome] = useState(
    defaultMonthlyIncome ? String(defaultMonthlyIncome) : "",
  );
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>(
    (CURRENCIES.includes(defaultCurrency as (typeof CURRENCIES)[number])
      ? defaultCurrency
      : "USD") as (typeof CURRENCIES)[number],
  );
  const [financialGoal, setFinancialGoal] = useState<GoalOption | "">(
    GOAL_OPTIONS.includes(defaultFinancialGoal as GoalOption)
      ? (defaultFinancialGoal as GoalOption)
      : "",
  );
  const [budgets, setBudgets] = useState<Record<string, string>>(
    Object.fromEntries(BUDGET_CONFIG.map((b) => [b.key, ""])),
  );
  const [activeSection, setActiveSection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completedCount = useMemo(() => {
    let count = 0;
    if (monthlyIncome.trim()) count += 1;
    if (currency.trim()) count += 1;
    if (financialGoal) count += 1;
    if (BUDGET_CONFIG.some((item) => budgets[item.key].trim())) count += 1;
    return count;
  }, [monthlyIncome, currency, financialGoal, budgets]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-section-index"));
            if (!Number.isNaN(idx)) setActiveSection(idx);
          }
        });
      },
      { threshold: 0.45 },
    );

    sectionRefs.current.forEach((section) => section && observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const updateBudget = (key: string, value: string) => {
    setBudgets((prev) => ({ ...prev, [key]: value }));
  };

  const parseBudgetValue = (category: string, value: string) => {
    const numeric = Number.parseFloat(value);
    if (Number.isFinite(numeric) && numeric >= 0) return numeric;

    const fallback = BUDGET_CONFIG.find((item) => item.key === category)?.placeholder ?? "0";
    return Number.parseFloat(fallback);
  };

  const submit = async () => {
    if (!monthlyIncome.trim()) {
      setError("Please enter your monthly income.");
      return;
    }

    if (!financialGoal) {
      setError("Please select your main financial goal.");
      return;
    }

    const incomeValue = Number.parseFloat(monthlyIncome);
    if (!Number.isFinite(incomeValue) || incomeValue < 0) {
      setError("Income must be a valid positive number.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        monthlyIncome: incomeValue,
        currency,
        financialGoal,
        budgets: BUDGET_CONFIG.map((item) => ({
          category: item.key,
          limit: parseBudgetValue(item.key, budgets[item.key]),
        })),
      };

      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Failed to set up workspace.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="progress-wrap">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className={`progress-dot ${idx < completedCount ? "active" : ""}`}
          />
        ))}
      </div>

      <div className="sections">
        <section
          data-section-index={0}
          ref={(el) => {
            sectionRefs.current[0] = el;
          }}
          className="section section-1"
        >
          <label className="section-label">What&apos;s your monthly income?</label>
          <div className="input-wrap">
            <span className="prefix">{CURRENCY_SYMBOL[currency]}</span>
            <input
              value={monthlyIncome}
              onChange={(event) => setMonthlyIncome(event.target.value)}
              inputMode="decimal"
              type="number"
              step="0.01"
              className="onb-input onb-num with-prefix"
              placeholder="4,500"
            />
          </div>
        </section>

        <section
          data-section-index={1}
          ref={(el) => {
            sectionRefs.current[1] = el;
          }}
          className="section section-2"
        >
          <label className="section-label">Currency</label>
          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value as (typeof CURRENCIES)[number])}
            className="onb-input"
          >
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </section>

        <section
          data-section-index={2}
          ref={(el) => {
            sectionRefs.current[2] = el;
          }}
          className="section section-3"
        >
          <label className="section-label">What&apos;s your main goal right now?</label>
          <div className="goals-grid">
            {GOAL_OPTIONS.map((goal) => {
              const selected = financialGoal === goal;
              return (
                <button
                  key={goal}
                  type="button"
                  onClick={() => setFinancialGoal(goal)}
                  className={`goal-pill ${selected ? "selected" : ""}`}
                >
                  {goal}
                </button>
              );
            })}
          </div>
        </section>

        <section
          data-section-index={3}
          ref={(el) => {
            sectionRefs.current[3] = el;
          }}
          className="section section-4"
        >
          <label className="section-label">Set your monthly spending limits</label>
          <div className="budget-list">
            {BUDGET_CONFIG.map((item) => (
              <div key={item.key} className="budget-row">
                <div className="budget-name">
                    <span
                      className="budget-pip"
                      style={{ background: item.color, boxShadow: `0 0 8px ${item.color}80` }}
                    />
                  <span>{item.key}</span>
                </div>
                <input
                  value={budgets[item.key]}
                  onChange={(event) => updateBudget(item.key, event.target.value)}
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  className="onb-input onb-num budget-input"
                  placeholder={item.placeholder}
                />
              </div>
            ))}
          </div>
          <p className="budget-note">You can adjust these anytime</p>
        </section>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <button type="button" onClick={submit} disabled={isSubmitting} className="submit-btn">
        {isSubmitting ? "Setting up..." : "Set up my workspace \u2192"}
      </button>

      <style>{`
        .progress-wrap {
          margin-bottom: 20px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 7px;
        }

        .progress-dot {
          height: 4px;
          border-radius: 999px;
          background: #1a1a21;
          transition: background-color 0.22s ease, box-shadow 0.22s ease;
        }

        .progress-dot.active {
          background: #00c896;
          box-shadow: 0 0 10px rgba(0, 200, 150, 0.4);
        }

        .sections {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .section {
          animation: onbFadeUp 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }

        .section-1 {
          animation-delay: 0.02s;
        }
        .section-2 {
          animation-delay: 0.08s;
        }
        .section-3 {
          animation-delay: 0.14s;
        }
        .section-4 {
          animation-delay: 0.2s;
        }

        .section-label {
          display: block;
          margin-bottom: 12px;
          font-family: var(--font-space-mono), monospace;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color:rgb(152, 152, 168);
        }

        .input-wrap {
          position: relative;
        }

        .prefix {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #00c896;
          font-family: var(--font-space-mono), monospace;
          font-size: 13px;
          pointer-events: none;
        }

        .onb-input {
          width: 100%;
          min-height: 40px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.055);
          background: #131318;
          padding: 10px 14px;
          color: #f0f0f4;
          font-size: 13px;
          font-family: var(--font-figtree), sans-serif;
          outline: none;
          transition: border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .onb-input:focus {
          border-color: rgba(0, 200, 150, 0.4);
          box-shadow: 0 0 0 2px rgba(0, 200, 150, 0.08), 0 0 12px rgba(0, 200, 150, 0.1);
        }

        .onb-input::placeholder {
          color: #50505c;
        }

        .with-prefix {
          padding-left: 44px;
        }

        .onb-num {
          font-family: var(--font-space-mono), monospace;
          font-variant-numeric: tabular-nums;
          -moz-appearance: textfield;
        }

        .onb-num::-webkit-outer-spin-button,
        .onb-num::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .goals-grid {
          display: grid;
          gap: 8px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .goal-pill {
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.055);
          background: #0c0c0f;
          color: #72727e;
          text-align: left;
          padding: 11px 12px;
          font-family: var(--font-figtree), sans-serif;
          font-size: 13px;
          cursor: pointer;
          transition: border-color 0.18s ease, background-color 0.18s ease, color 0.18s ease;
        }

        .goal-pill:hover {
          border-color: rgba(255, 255, 255, 0.1);
        }

        .goal-pill.selected {
          background: rgba(0, 200, 150, 0.08);
          border-color: rgba(0, 200, 150, 0.35);
          color: #00c896;
          font-weight: 500;
        }

        .budget-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .budget-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 132px;
          gap: 10px;
          align-items: center;
          background: #131318;
          border: 1px solid rgba(255, 255, 255, 0.055);
          border-radius: 6px;
          padding: 9px 12px;
        }

        .budget-name {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #c9c9d2;
          font-size: 13px;
        }

        .budget-pip {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          flex-shrink: 0;
          box-shadow: 0 0 8px currentColor;
        }

        .budget-input {
          text-align: right;
          font-size: 12px;
        }

        .budget-note {
          margin-top: 8px;
          color: #72727e;
          font-size: 11px;
          line-height: 1.4;
        }

        .error-text {
          margin-top: 16px;
          margin-bottom: 0;
          color: #ff4455;
          font-size: 12px;
        }

        .submit-btn {
          width: 100%;
          margin-top: 22px;
          min-height: 42px;
          border: 0;
          border-radius: 6px;
          background: #00c896;
          color: #000;
          font-family: var(--font-figtree), sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 0 0 1px rgba(0, 200, 150, 0.3), 0 4px 16px rgba(0, 200, 150, 0.2);
          transition: opacity 0.16s ease, transform 0.16s ease;
        }

        .submit-btn:hover {
          transform: translateY(-1px);
        }

        .submit-btn:disabled {
          cursor: not-allowed;
          opacity: 0.65;
          transform: none;
        }

        @keyframes onbFadeUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 560px) {
          .goals-grid {
            grid-template-columns: 1fr;
          }

          .budget-row {
            grid-template-columns: minmax(0, 1fr) 118px;
          }
        }
      `}</style>
    </div>
  );
}
