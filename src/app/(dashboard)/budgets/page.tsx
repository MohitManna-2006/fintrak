"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, X, Wallet, AlertTriangle, Copy, Minus } from "lucide-react";

type Budget = {
  id: string;
  category: string;
  limit: number;
  month: number;
  year: number;
  spent: number;
};

type Transaction = {
  id: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  description: string | null;
  date: string;
  roomId: string | null;
};

const CATEGORIES = [
  "Food & Dining",
  "Rent & Housing",
  "Transport",
  "Shopping",
  "Subscriptions",
  "Health",
  "Entertainment",
  "Other",
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "#00c896",
  "Rent & Housing": "#ff4455",
  Transport: "#4d9fff",
  Shopping: "#9d7fea",
  Subscriptions: "#e8a000",
  Health: "#fb7185",
  Entertainment: "#38bdf8",
  Other: "#72727e",
};

const MONTH_NAMES = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const panel: React.CSSProperties = {
  background: "#0c0c0f",
  border: "1px solid rgba(255,255,255,0.055)",
  borderRadius: 8,
};

const inputBase: React.CSSProperties = {
  background: "#131318",
  border: "1px solid rgba(255,255,255,0.055)",
  borderRadius: 6,
  padding: "7px 12px",
  color: "#f0f0f4",
  fontFamily: "var(--font-space-mono)",
  fontSize: 11,
  outline: "none",
  WebkitAppearance: "none",
  appearance: "none" as const,
};

function formatAmount(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function computeHealthScore(budgets: Budget[]): number {
  if (budgets.length === 0) return -1;
  let score = 100;
  for (const b of budgets) {
    if (b.limit <= 0) continue;
    const pct = b.spent / b.limit;
    if (pct >= 1.0) score -= 15;
    else if (pct >= 0.8) score -= 5;
  }
  return Math.max(0, score);
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#00c896";
  if (score >= 50) return "#e8a000";
  return "#ff4455";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "ON TRACK";
  if (score >= 50) return "NEEDS ATTENTION";
  return "OVER BUDGET";
}

function getBarColor(pct: number, categoryColor: string): string {
  if (pct >= 1.0) return "#ff4455";
  if (pct >= 0.8) return "#e8a000";
  return categoryColor;
}

function getProjectedColor(projected: number, limit: number): string {
  if (limit <= 0) return "#72727e";
  const ratio = projected / limit;
  if (ratio >= 1.0) return "#ff4455";
  if (ratio >= 0.8) return "#e8a000";
  return "#00c896";
}

// ─── Budget Modal (Add / Edit) ───────────────────────────────────────

function BudgetModal({
  mode,
  formCategory,
  setFormCategory,
  formLimit,
  setFormLimit,
  availableCategories,
  saving,
  onSave,
  onClose,
}: {
  mode: "add" | "edit";
  formCategory: string;
  setFormCategory: (v: string) => void;
  formLimit: string;
  setFormLimit: (v: string) => void;
  availableCategories: string[];
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-space-mono)",
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#72727e",
    marginBottom: 7,
  };

  const fieldInput: React.CSSProperties = {
    ...inputBase,
    width: "100%",
    fontSize: 13,
    padding: "10px 14px",
    fontFamily: "var(--font-figtree)",
  };

  const allTaken = mode === "add" && availableCategories.length === 0;

  return (
    <div
      className="bgt-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        className="bgt-modal-inner"
        style={{
          width: 420,
          maxWidth: "calc(100vw - 32px)",
          background: "#0c0c0f",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10,
          animation: "modalUp 0.25s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 22px",
            borderBottom: "1px solid rgba(255,255,255,0.055)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-syne)",
              fontWeight: 600,
              fontSize: 16,
              color: "#f0f0f4",
            }}
          >
            {mode === "add" ? "Add Budget" : "Edit Budget"}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#72727e",
              cursor: "pointer",
              padding: 4,
              display: "flex",
            }}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18 }}>
          {allTaken ? (
            <div
              style={{
                fontFamily: "var(--font-figtree)",
                fontSize: 13,
                color: "#72727e",
                textAlign: "center",
                padding: "12px 0",
              }}
            >
              All categories have budgets this month
            </div>
          ) : (
            <>
              {/* Category */}
              <div>
                <div style={labelStyle}>Category</div>
                {mode === "edit" ? (
                  <div
                    style={{
                      ...fieldInput,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      opacity: 0.6,
                      cursor: "default",
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 2,
                        background: CATEGORY_COLORS[formCategory] ?? "#72727e",
                        flexShrink: 0,
                      }}
                    />
                    {formCategory}
                  </div>
                ) : (
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    style={{ ...fieldInput, cursor: "pointer" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,200,150,0.4)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.055)")}
                  >
                    {availableCategories.map((c) => (
                      <option key={c} value={c} style={{ background: "#131318" }}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Limit */}
              <div>
                <div style={labelStyle}>Monthly Limit</div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formLimit}
                  onChange={(e) => setFormLimit(e.target.value)}
                  placeholder="0.00"
                  style={{
                    ...fieldInput,
                    fontFamily: "var(--font-space-mono)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,200,150,0.4)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.055)")}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="bgt-modal-footer"
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            padding: "16px 22px",
            borderTop: "1px solid rgba(255,255,255,0.055)",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 18px",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.055)",
              background: "transparent",
              color: "#72727e",
              fontFamily: "var(--font-figtree)",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          {!allTaken && (
            <button
              onClick={onSave}
              disabled={saving}
              style={{
                padding: "8px 18px",
                borderRadius: 6,
                border: "none",
                background: saving ? "#0a7a5c" : "#00c896",
                color: "#000",
                fontFamily: "var(--font-figtree)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: saving ? "default" : "pointer",
                boxShadow: "0 0 0 1px rgba(0,200,150,0.3), 0 4px 16px rgba(0,200,150,0.2)",
                opacity: saving ? 0.7 : 1,
                transition: "opacity 0.15s ease",
              }}
            >
              {saving ? "Saving..." : "Save Budget"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Delete Modal ────────────────────────────────────────────────────

function DeleteModal({
  budget,
  saving,
  onConfirm,
  onClose,
}: {
  budget: Budget;
  saving: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="bgt-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        className="bgt-delete-modal-inner"
        style={{
          width: 360,
          maxWidth: "calc(100vw - 32px)",
          background: "#0c0c0f",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10,
          padding: "28px 24px 22px",
          textAlign: "center",
          animation: "modalUp 0.25s ease",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 10,
            background: "rgba(255,68,85,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <Trash2 size={22} color="#ff4455" strokeWidth={1.5} />
        </div>
        <div
          style={{
            fontFamily: "var(--font-syne)",
            fontWeight: 600,
            fontSize: 15,
            color: "#f0f0f4",
            marginBottom: 8,
          }}
        >
          Delete Budget
        </div>
        <div
          style={{
            fontFamily: "var(--font-figtree)",
            fontSize: 13,
            color: "#72727e",
            lineHeight: 1.5,
            marginBottom: 24,
          }}
        >
          Are you sure you want to delete the budget for &ldquo;{budget.category}&rdquo;? This
          action cannot be undone.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.055)",
              background: "transparent",
              color: "#72727e",
              fontFamily: "var(--font-figtree)",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            style={{
              padding: "8px 20px",
              borderRadius: 6,
              border: "none",
              background: saving ? "#aa3344" : "#ff4455",
              color: "#fff",
              fontFamily: "var(--font-figtree)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.7 : 1,
              transition: "opacity 0.15s ease",
            }}
          >
            {saving ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Card ───────────────────────────────────────────────────

function SkeletonCard({ index }: { index: number }) {
  return (
    <div
      style={{
        ...panel,
        padding: "18px 20px",
        animation: `fadeUp 0.35s ease both`,
        animationDelay: `${index * 60}ms`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 6, height: 6, borderRadius: 2, background: "#1a1a21" }} />
        <div style={{ width: 100, height: 12, borderRadius: 4, background: "#1a1a21", animation: "shimmer 1.5s infinite" }} />
        <div style={{ flex: 1 }} />
        <div style={{ width: 80, height: 10, borderRadius: 4, background: "#131318", animation: "shimmer 1.5s infinite", animationDelay: "0.2s" }} />
      </div>
      <div style={{ height: 3, borderRadius: 2, background: "#1a1a21", marginBottom: 14, animation: "shimmer 1.5s infinite", animationDelay: "0.1s" }} />
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ width: 70, height: 10, borderRadius: 3, background: "#131318", animation: "shimmer 1.5s infinite", animationDelay: "0.3s" }} />
        <div style={{ width: 80, height: 10, borderRadius: 3, background: "#131318", animation: "shimmer 1.5s infinite", animationDelay: "0.4s" }} />
        <div style={{ flex: 1 }} />
        <div style={{ width: 60, height: 10, borderRadius: 3, background: "#131318", animation: "shimmer 1.5s infinite", animationDelay: "0.5s" }} />
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function BudgetsPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);

  const [modal, setModal] = useState<null | "add" | "edit" | "delete">(null);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [saving, setSaving] = useState(false);

  const [formCategory, setFormCategory] = useState<string>(CATEGORIES[0]);
  const [formLimit, setFormLimit] = useState("");

  const [copying, setCopying] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [budgetRes, txRes] = await Promise.all([
        fetch(`/api/budgets?month=${month}&year=${year}`),
        fetch(`/api/transactions?month=${month}&year=${year}`),
      ]);
      if (budgetRes.ok) {
        const data = await budgetRes.json();
        setBudgets(data);
      }
      if (txRes.ok) {
        const data = await txRes.json();
        setAllTransactions(data);
      }
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modal) setModal(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal]);

  // ─── Derived Data ────────────────────────────────────────────────

  const budgetedCategories = new Set(budgets.map((b) => b.category));
  const availableCategories = CATEGORIES.filter((c) => !budgetedCategories.has(c));

  const expenses = allTransactions.filter(
    (tx) => tx.type === "expense" && tx.roomId === null,
  );

  const expenseByCategory = new Map<string, number>();
  for (const tx of expenses) {
    expenseByCategory.set(tx.category, (expenseByCategory.get(tx.category) ?? 0) + tx.amount);
  }

  const unbudgetedSpending: { category: string; amount: number }[] = [];
  for (const [cat, amt] of expenseByCategory) {
    if (!budgetedCategories.has(cat)) {
      unbudgetedSpending.push({ category: cat, amount: amt });
    }
  }

  const healthScore = computeHealthScore(budgets);
  const totalBudgeted = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const remaining = totalBudgeted - totalSpent;

  const isCurrentMonth = month === currentMonth && year === currentYear;
  const daysElapsed = isCurrentMonth ? currentDay : getDaysInMonth(month, year);
  const daysInMonth = getDaysInMonth(month, year);

  // ─── Actions ─────────────────────────────────────────────────────

  function openAdd(prefilledCategory?: string) {
    const cat = prefilledCategory && (availableCategories as string[]).includes(prefilledCategory)
      ? prefilledCategory
      : availableCategories[0] ?? CATEGORIES[0];
    setFormCategory(cat);
    setFormLimit("");
    setSelectedBudget(null);
    setModal("add");
  }

  function openEdit(b: Budget) {
    setFormCategory(b.category);
    setFormLimit(String(b.limit));
    setSelectedBudget(b);
    setModal("edit");
  }

  function openDelete(b: Budget) {
    setSelectedBudget(b);
    setModal("delete");
  }

  async function handleSave() {
    const limit = parseFloat(formLimit);
    if (!formLimit || !Number.isFinite(limit) || limit <= 0) return;

    setSaving(true);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: formCategory, limit, month, year }),
      });
      if (res.ok) {
        await fetchData();
        setModal(null);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedBudget) return;
    setSaving(true);
    try {
      const res = await fetch("/api/budgets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedBudget.id }),
      });
      if (res.ok) {
        await fetchData();
        setModal(null);
      }
    } finally {
      setSaving(false);
    }
  }

  async function quickAdjust(b: Budget, delta: number) {
    const newLimit = Math.max(0, b.limit + delta);
    if (newLimit === b.limit) return;

    setBudgets((prev) =>
      prev.map((x) => (x.id === b.id ? { ...x, limit: newLimit } : x)),
    );

    await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: b.category, limit: newLimit, month, year }),
    });
  }

  async function copyLastMonth() {
    setCopying(true);
    setCopyMessage("");
    try {
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const res = await fetch(`/api/budgets?month=${prevMonth}&year=${prevYear}`);
      if (!res.ok) return;

      const lastBudgets: Budget[] = await res.json();
      if (lastBudgets.length === 0) {
        setCopyMessage("No budgets found for last month");
        setTimeout(() => setCopyMessage(""), 3000);
        return;
      }

      await Promise.all(
        lastBudgets.map((b) =>
          fetch("/api/budgets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category: b.category, limit: b.limit, month, year }),
          }),
        ),
      );

      await fetchData();
    } finally {
      setCopying(false);
    }
  }

  const selectStyle: React.CSSProperties = {
    ...inputBase,
    cursor: "pointer",
    fontSize: 13,
    color: "#f0f0f4",
    border: "1px solid rgba(255,255,255,0.15)",
  };

  return (
    <div
      className="bgt-page"
      style={{
        width: "100%",
        maxWidth: 1100,
        padding: "32px 40px 48px",
        fontFamily: "var(--font-figtree), sans-serif",
      }}
    >
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalUp {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shimmer {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
        @keyframes barGrow {
          from { width: 0%; }
        }
        @keyframes modalSlideUp {
          from { opacity:0; transform:translateY(100%); }
          to { opacity:1; transform:translateY(0); }
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] { -moz-appearance: textfield; }
        @media (max-width:639px) {
          .bgt-page { padding:20px 16px 32px !important; }
          .bgt-header {
            flex-direction:column !important;
            align-items:stretch !important;
            gap:14px !important;
          }
          .bgt-header-right {
            flex-direction:column !important;
            align-items:stretch !important;
            gap:8px !important;
          }
          .bgt-header-right > * { width:100% !important; }
          .bgt-header-selects { width:100% !important; }
          .bgt-add-btn {
            width:100% !important;
            justify-content:center !important;
          }
          .bgt-score-card {
            flex-direction:column !important;
            gap:20px !important;
          }
          .bgt-score-stats {
            flex-direction:column !important;
            gap:12px !important;
          }
          .bgt-card-actions { opacity:1 !important; }
          .bgt-card-actions button { opacity:0.4; transition:opacity 0.15s ease; }
          .bgt-card-actions button:active { opacity:1; }
          .bgt-quick-btns { opacity:1 !important; }
          .bgt-modal-overlay { align-items:flex-end !important; }
          .bgt-modal-inner,
          .bgt-delete-modal-inner {
            width:calc(100% - 48px) !important;
            max-width:none !important;
            border-radius:12px 12px 0 0 !important;
            animation:modalSlideUp 0.3s ease !important;
          }
          .bgt-modal-footer {
            padding-bottom:calc(16px + env(safe-area-inset-bottom)) !important;
          }
          .bgt-delete-modal-inner {
            padding-bottom:calc(22px + env(safe-area-inset-bottom)) !important;
          }
        }
      `}</style>

      {/* ── HEADER ── */}
      <div
        className="bgt-header"
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          paddingBottom: 24,
          marginBottom: 24,
          borderBottom: "1px solid rgba(255,255,255,0.055)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: -1,
            left: 0,
            width: 48,
            height: 1,
            background: "#00c896",
            boxShadow: "0 0 8px #00c896",
          }}
        />
        <div>
          <div
            style={{
              fontFamily: "var(--font-syne)",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.8px",
              color: "#f0f0f4",
              lineHeight: 1,
            }}
          >
            Budgets
          </div>
          <div
            style={{
              fontFamily: "var(--font-space-mono)",
              fontSize: 12,
              color: "#72727e",
              marginTop: 5,
              letterSpacing: "0.06em",
            }}
          >
            {`// ${MONTH_NAMES[month - 1]} ${year}`}
          </div>
        </div>

        <div
          className="bgt-header-right"
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <div className="bgt-header-selects" style={{ display: "flex", gap: 8 }}>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              style={selectStyle}
            >
              {MONTH_SHORT.map((m, i) => (
                <option key={i} value={i + 1} style={{ background: "#131318" }}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              style={selectStyle}
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y} style={{ background: "#131318" }}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {!loading && budgets.length === 0 && (
            <button
              onClick={copyLastMonth}
              disabled={copying}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "7px 13px",
                borderRadius: 6,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.055)",
                color: "#72727e",
                fontFamily: "var(--font-figtree)",
                fontSize: 12.5,
                fontWeight: 500,
                cursor: copying ? "default" : "pointer",
                opacity: copying ? 0.6 : 1,
                transition: "border-color 0.15s ease, color 0.15s ease, opacity 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                e.currentTarget.style.color = "#f0f0f4";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.055)";
                e.currentTarget.style.color = "#72727e";
              }}
            >
              <Copy size={12} strokeWidth={1.5} />
              {copying ? "Copying..." : "Copy from last month"}
            </button>
          )}

          <button
            className="bgt-add-btn"
            onClick={() => openAdd()}
            disabled={availableCategories.length === 0 && !loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 13px",
              borderRadius: 6,
              background: availableCategories.length === 0 && !loading ? "#0a7a5c" : "#00c896",
              border: "none",
              color: "#000",
              fontFamily: "var(--font-figtree)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: availableCategories.length === 0 && !loading ? "default" : "pointer",
              boxShadow: "0 0 0 1px rgba(0,200,150,0.3), 0 4px 16px rgba(0,200,150,0.2)",
              opacity: availableCategories.length === 0 && !loading ? 0.5 : 1,
            }}
          >
            <Plus size={12} strokeWidth={2.5} /> Add Budget
          </button>
        </div>
      </div>

      {/* Copy message toast */}
      {copyMessage && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 16px",
            borderRadius: 6,
            background: "rgba(232,160,0,0.12)",
            border: "1px solid rgba(232,160,0,0.25)",
            fontFamily: "var(--font-figtree)",
            fontSize: 13,
            color: "#e8a000",
            animation: "fadeUp 0.25s ease both",
          }}
        >
          {copyMessage}
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </div>
      ) : budgets.length === 0 && !copyMessage ? (
        /* ── EMPTY STATE ── */
        <div
          style={{
            ...panel,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 20px",
            animation: "fadeUp 0.4s ease both",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "#131318",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Wallet size={24} color="#363640" strokeWidth={1.5} />
          </div>
          <div
            style={{
              fontFamily: "var(--font-syne)",
              fontWeight: 600,
              fontSize: 16,
              color: "#f0f0f4",
              marginBottom: 6,
            }}
          >
            No budgets set
          </div>
          <div
            style={{
              fontFamily: "var(--font-figtree)",
              fontSize: 13,
              color: "#72727e",
              marginBottom: 20,
              textAlign: "center",
            }}
          >
            Add a budget to start tracking your spending against limits
          </div>
          <button
            onClick={() => openAdd()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 13px",
              borderRadius: 6,
              background: "#00c896",
              border: "none",
              color: "#000",
              fontFamily: "var(--font-figtree)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 0 0 1px rgba(0,200,150,0.3), 0 4px 16px rgba(0,200,150,0.2)",
            }}
          >
            <Plus size={12} strokeWidth={2.5} /> Add Budget
          </button>
        </div>
      ) : budgets.length > 0 ? (
        <>
          {/* ── HEALTH SCORE CARD ── */}
          <div
            className="bgt-score-card"
            style={{
              ...panel,
              padding: "24px 28px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 32,
              animation: "fadeUp 0.35s ease both",
            }}
          >
            {/* Score */}
            <div style={{ textAlign: "center", minWidth: 90 }}>
              <div
                style={{
                  fontFamily: "var(--font-syne)",
                  fontSize: 72,
                  fontWeight: 800,
                  letterSpacing: "-2px",
                  fontVariantNumeric: "tabular-nums",
                  color: healthScore < 0 ? "#72727e" : getScoreColor(healthScore),
                  lineHeight: 1,
                }}
              >
                {healthScore < 0 ? "\u2014" : healthScore}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-space-mono)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  marginTop: 8,
                  color: healthScore < 0 ? "#72727e" : getScoreColor(healthScore),
                }}
              >
                {healthScore < 0 ? "SET BUDGETS" : getScoreLabel(healthScore)}
              </div>
            </div>

            {/* Divider */}
            <div
              style={{
                width: 1,
                height: 56,
                background: "rgba(255,255,255,0.055)",
                flexShrink: 0,
              }}
            />

            {/* Stats */}
            <div
              className="bgt-score-stats"
              style={{ display: "flex", gap: 32, flex: 1, alignItems: "stretch" }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-space-mono)",
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#4a4a56",
                    marginBottom: 6,
                  }}
                >
                  BUDGETED
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-space-mono)",
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: "-0.5px",
                    fontVariantNumeric: "tabular-nums",
                    color: "#f0f0f4",
                  }}
                >
                  ${formatAmount(totalBudgeted)}
                </div>
              </div>
              <div
                style={{
                  width: 1,
                  background: "rgba(255,255,255,0.055)",
                  alignSelf: "stretch",
                  flexShrink: 0,
                }}
              />
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-space-mono)",
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#4a4a56",
                    marginBottom: 6,
                  }}
                >
                  SPENT
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-space-mono)",
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: "-0.5px",
                    fontVariantNumeric: "tabular-nums",
                    color: "#f0f0f4",
                  }}
                >
                  ${formatAmount(totalSpent)}
                </div>
              </div>
              <div
                style={{
                  width: 1,
                  background: "rgba(255,255,255,0.055)",
                  alignSelf: "stretch",
                  flexShrink: 0,
                }}
              />
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-space-mono)",
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#4a4a56",
                    marginBottom: 6,
                  }}
                >
                  REMAINING
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-space-mono)",
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: "-0.5px",
                    fontVariantNumeric: "tabular-nums",
                    color: remaining >= 0 ? "#00c896" : "#ff4455",
                  }}
                >
                  {remaining >= 0 ? "" : "\u2212"}${formatAmount(Math.abs(remaining))}
                </div>
              </div>
            </div>
          </div>

          {/* ── UNBUDGETED SPENDING ALERT ── */}
          {unbudgetedSpending.length > 0 && (
            <div
              style={{
                ...panel,
                borderLeft: "2px solid #e8a000",
                background: "rgba(232,160,0,0.06)",
                padding: "18px 20px",
                marginBottom: 20,
                animation: "fadeUp 0.35s ease both",
                animationDelay: "60ms",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <AlertTriangle size={14} color="#e8a000" strokeWidth={1.5} />
                <span
                  style={{
                    fontFamily: "var(--font-syne)",
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#f0f0f4",
                  }}
                >
                  Unbudgeted Spending Detected
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {unbudgetedSpending.map((item) => (
                  <div
                    key={item.category}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 2,
                          background: CATEGORY_COLORS[item.category] ?? "#72727e",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "var(--font-figtree)",
                          fontSize: 13,
                          color: "#f0f0f4",
                        }}
                      >
                        {item.category}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-figtree)",
                          fontSize: 13,
                          color: "#72727e",
                        }}
                      >
                        &mdash;{" "}
                        <span
                          style={{
                            fontFamily: "var(--font-space-mono)",
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#e8a000",
                          }}
                        >
                          ${formatAmount(item.amount)}
                        </span>{" "}
                        spent, no budget set
                      </span>
                    </div>
                    <button
                      onClick={() => openAdd(item.category)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 4,
                        border: "1px solid rgba(232,160,0,0.25)",
                        background: "rgba(232,160,0,0.08)",
                        color: "#e8a000",
                        fontFamily: "var(--font-space-mono)",
                        fontSize: 9.5,
                        fontWeight: 700,
                        cursor: "pointer",
                        flexShrink: 0,
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(232,160,0,0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(232,160,0,0.08)";
                      }}
                    >
                      Set Budget
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── BUDGET CARDS ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {budgets.map((b, index) => {
              const color = CATEGORY_COLORS[b.category] ?? "#72727e";
              const pct = b.limit > 0 ? b.spent / b.limit : 0;
              const barColor = getBarColor(pct, color);
              const remainingAmt = b.limit - b.spent;
              const isOver = remainingAmt < 0;

              const projected =
                b.spent > 0 && daysElapsed > 0
                  ? (b.spent / daysElapsed) * daysInMonth
                  : 0;
              const projectedColor =
                b.spent > 0 ? getProjectedColor(projected, b.limit) : "#72727e";

              return (
                <BudgetCard
                  key={b.id}
                  budget={b}
                  index={index}
                  color={color}
                  pct={pct}
                  barColor={barColor}
                  remainingAmt={remainingAmt}
                  isOver={isOver}
                  projected={projected}
                  projectedColor={projectedColor}
                  onEdit={() => openEdit(b)}
                  onDelete={() => openDelete(b)}
                  onQuickAdjust={(delta) => quickAdjust(b, delta)}
                />
              );
            })}
          </div>
        </>
      ) : null}

      {/* ── MODALS ── */}
      {(modal === "add" || modal === "edit") && (
        <BudgetModal
          mode={modal}
          formCategory={formCategory}
          setFormCategory={setFormCategory}
          formLimit={formLimit}
          setFormLimit={setFormLimit}
          availableCategories={[...availableCategories]}
          saving={saving}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "delete" && selectedBudget && (
        <DeleteModal
          budget={selectedBudget}
          saving={saving}
          onConfirm={handleDelete}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ─── Budget Card ─────────────────────────────────────────────────────

function BudgetCard({
  budget,
  index,
  color,
  pct,
  barColor,
  remainingAmt,
  isOver,
  projected,
  projectedColor,
  onEdit,
  onDelete,
  onQuickAdjust,
}: {
  budget: Budget;
  index: number;
  color: string;
  pct: number;
  barColor: string;
  remainingAmt: number;
  isOver: boolean;
  projected: number;
  projectedColor: string;
  onEdit: () => void;
  onDelete: () => void;
  onQuickAdjust: (delta: number) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="bgt-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...panel,
        padding: "18px 20px",
        borderColor: hovered ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.055)",
        transition: "border-color 0.15s ease",
        animation: `fadeUp 0.35s ease both`,
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Top Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            background: color,
            boxShadow: `0 0 6px ${color}40`,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-figtree)",
            fontSize: 15,
            fontWeight: 600,
            color: "#f0f0f4",
          }}
        >
          {budget.category}
        </span>

        <div style={{ flex: 1 }} />

        {/* Projected badge */}
        <span
          style={{
            fontFamily: "var(--font-space-mono)",
            fontSize: 10.5,
            fontVariantNumeric: "tabular-nums",
            padding: "3px 8px",
            borderRadius: 4,
            background:
              projectedColor === "#ff4455"
                ? "rgba(255,68,85,0.1)"
                : projectedColor === "#e8a000"
                  ? "rgba(232,160,0,0.12)"
                  : projectedColor === "#00c896"
                    ? "rgba(0,200,150,0.12)"
                    : "transparent",
            color: projectedColor,
            border: `1px solid ${
              projectedColor === "#ff4455"
                ? "rgba(255,68,85,0.3)"
                : projectedColor === "#e8a000"
                  ? "rgba(232,160,0,0.3)"
                  : projectedColor === "#00c896"
                    ? "rgba(0,200,150,0.3)"
                    : "rgba(255,255,255,0.055)"
            }`,
          }}
        >
          {projected > 0 ? `Projected: $${formatAmount(projected)}` : "No spending yet"}
        </span>

        {/* Edit / Delete */}
        <div
          className="bgt-card-actions"
          style={{
            display: "flex",
            gap: 4,
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.15s ease",
            flexShrink: 0,
          }}
        >
          <button
            onClick={onEdit}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.055)",
              borderRadius: 5,
              padding: 6,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#72727e",
              transition: "border-color 0.15s ease, color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              e.currentTarget.style.color = "#f0f0f4";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.055)";
              e.currentTarget.style.color = "#72727e";
            }}
          >
            <Pencil size={13} strokeWidth={1.5} />
          </button>
          <button
            onClick={onDelete}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.055)",
              borderRadius: 5,
              padding: 6,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#72727e",
              transition: "border-color 0.15s ease, color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,68,85,0.25)";
              e.currentTarget.style.color = "#ff4455";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.055)";
              e.currentTarget.style.color = "#72727e";
            }}
          >
            <Trash2 size={13} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          position: "relative",
          height: 4,
          background: "rgba(255,255,255,0.055)",
          borderRadius: 2,
          marginBottom: 10,
          overflow: "visible",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(pct * 100, 100)}%`,
            background: barColor,
            borderRadius: 2,
            position: "relative",
            animation: `barGrow 0.6s ease both`,
            animationDelay: `${index * 50 + 200}ms`,
          }}
        >
          {/* Glowing dot */}
          {pct > 0 && (
            <div
              style={{
                position: "absolute",
                right: -2.5,
                top: -1,
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: barColor,
                boxShadow: `0 0 6px ${barColor}`,
              }}
            />
          )}
        </div>
      </div>

      {/* Quick Adjust Buttons */}
      <div
        className="bgt-quick-btns"
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 12,
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.15s ease",
        }}
      >
        <button
          onClick={() => onQuickAdjust(-50)}
          style={{
            padding: "4px 10px",
            borderRadius: 99,
            background: "#1a1a21",
            border: "1px solid rgba(255,255,255,0.055)",
            fontFamily: "var(--font-space-mono)",
            fontSize: 11,
            color: "#72727e",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 3,
            transition: "border-color 0.15s ease, color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            e.currentTarget.style.color = "#a0a0ac";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.055)";
            e.currentTarget.style.color = "#72727e";
          }}
        >
          <Minus size={9} strokeWidth={2} />
          $50
        </button>
        <button
          onClick={() => onQuickAdjust(50)}
          style={{
            padding: "4px 10px",
            borderRadius: 99,
            background: "#1a1a21",
            border: "1px solid rgba(255,255,255,0.055)",
            fontFamily: "var(--font-space-mono)",
            fontSize: 11,
            color: "#72727e",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 3,
            transition: "border-color 0.15s ease, color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            e.currentTarget.style.color = "#a0a0ac";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.055)";
            e.currentTarget.style.color = "#72727e";
          }}
        >
          <Plus size={9} strokeWidth={2} />
          $50
        </button>
      </div>

      {/* Bottom Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ display: "flex", alignItems: "baseline" }}>
          <span
            style={{
              fontFamily: "var(--font-space-mono)",
              fontSize: 13,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              color: isOver ? "#ff4455" : "#00c896",
            }}
          >
            ${formatAmount(budget.spent)}
          </span>
          <span
            style={{
              fontFamily: "var(--font-space-mono)",
              fontSize: 9,
              color: "#4a4a56",
              marginLeft: 3,
            }}
          >
            spent
          </span>
        </span>
        <span style={{ display: "flex", alignItems: "baseline" }}>
          {isOver ? (
            <>
              <span
                style={{
                  fontFamily: "var(--font-space-mono)",
                  fontSize: 9,
                  color: "#4a4a56",
                  marginRight: 3,
                }}
              >
                OVER by
              </span>
              <span
                style={{
                  fontFamily: "var(--font-space-mono)",
                  fontSize: 13,
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                  color: "#ff4455",
                }}
              >
                ${formatAmount(Math.abs(remainingAmt))}
              </span>
            </>
          ) : (
            <>
              <span
                style={{
                  fontFamily: "var(--font-space-mono)",
                  fontSize: 13,
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                  color: "#f0f0f4",
                }}
              >
                ${formatAmount(remainingAmt)}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-space-mono)",
                  fontSize: 9,
                  color: "#4a4a56",
                  marginLeft: 3,
                }}
              >
                remaining
              </span>
            </>
          )}
        </span>
        <span style={{ display: "flex", alignItems: "baseline" }}>
          <span
            style={{
              fontFamily: "var(--font-space-mono)",
              fontSize: 13,
              fontWeight: 400,
              fontVariantNumeric: "tabular-nums",
              color: "#72727e",
            }}
          >
            ${formatAmount(budget.limit)}
          </span>
          <span
            style={{
              fontFamily: "var(--font-space-mono)",
              fontSize: 9,
              color: "#4a4a56",
              marginLeft: 3,
            }}
          >
            limit
          </span>
        </span>
      </div>
    </div>
  );
}
