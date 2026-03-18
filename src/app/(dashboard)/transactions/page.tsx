"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, X, CreditCard } from "lucide-react";
import { format } from "date-fns";

type Transaction = {
  id: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  description: string | null;
  date: string;
  createdAt: string;
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
  "Income",
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
  Income: "#00c896",
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

function toInputDate(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd");
}

// ─── Transaction Row ────────────────────────────────────────────────

function TransactionRow({
  tx,
  isLast,
  index,
  onEdit,
  onDelete,
}: {
  tx: Transaction;
  isLast: boolean;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = CATEGORY_COLORS[tx.category] ?? "#72727e";
  const dateStr = format(new Date(tx.date), "MMM dd, yyyy").toUpperCase();

  return (
    <div
      className="txn-row"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 20px",
        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.055)",
        background: hovered ? "rgba(255,255,255,0.02)" : "transparent",
        transition: "background 0.15s ease",
        animation: `fadeUp 0.35s ease both`,
        animationDelay: `${index * 40}ms`,
      }}
    >
      <div
        style={{
          width: 2,
          height: 34,
          borderRadius: 2,
          background: color,
          boxShadow: `0 0 8px ${color}40`,
          flexShrink: 0,
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="txn-desc"
          style={{
            fontFamily: "var(--font-figtree)",
            fontWeight: 600,
            fontSize: 14,
            color: "#f0f0f4",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {tx.description || tx.category}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
          <span
            style={{
              fontFamily: "var(--font-space-mono)",
              fontSize: 9.5,
              color: "#4a4a56",
            }}
          >
            {dateStr}
          </span>
          <span
            className="txn-cat-pill"
            style={{
              fontFamily: "var(--font-space-mono)",
              fontSize: 9,
              padding: "1px 5px",
              borderRadius: 4,
              border: "1px solid rgba(255,255,255,0.055)",
              color: "#50505c",
            }}
          >
            {tx.category}
          </span>
        </div>
      </div>

      <div
        className="txn-amount"
        style={{
          fontFamily: "var(--font-space-mono)",
          fontWeight: 700,
          fontSize: 14,
          fontVariantNumeric: "tabular-nums",
          color: tx.type === "income" ? "#00c896" : "#ff4455",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        {tx.type === "income" ? "+" : "−"}${formatAmount(tx.amount)}
      </div>

      <div
        className="txn-actions"
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
  );
}

// ─── Transaction Modal (Add / Edit) ────────────────────────────────

function TransactionModal({
  mode,
  formType,
  setFormType,
  formAmount,
  setFormAmount,
  formCategory,
  setFormCategory,
  formDescription,
  setFormDescription,
  formDate,
  setFormDate,
  saving,
  onSave,
  onClose,
}: {
  mode: "add" | "edit";
  formType: "income" | "expense";
  setFormType: (v: "income" | "expense") => void;
  formAmount: string;
  setFormAmount: (v: string) => void;
  formCategory: string;
  setFormCategory: (v: string) => void;
  formDescription: string;
  setFormDescription: (v: string) => void;
  formDate: string;
  setFormDate: (v: string) => void;
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

  return (
    <div
      className="txn-modal-overlay"
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
        className="txn-modal-inner"
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
            {mode === "add" ? "Add Transaction" : "Edit Transaction"}
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
          {/* Description */}
          <div>
            <div style={labelStyle}>Description</div>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="What was this for?"
              style={fieldInput}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,200,150,0.4)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.055)")}
            />
          </div>

          {/* Type Toggle */}
          <div>
            <div style={labelStyle}>Type</div>
            <div style={{ display: "flex", gap: 8 }}>
              {(["expense", "income"] as const).map((t) => {
                const active = formType === t;
                const isExpense = t === "expense";
                const activeColor = isExpense ? "#ff4455" : "#00c896";
                const activeBg = isExpense ? "rgba(255,68,85,0.1)" : "rgba(0,200,150,0.12)";
                const activeBorder = isExpense ? "rgba(255,68,85,0.25)" : "rgba(0,200,150,0.25)";
                return (
                  <button
                    key={t}
                    onClick={() => setFormType(t)}
                    style={{
                      flex: 1,
                      padding: "9px 0",
                      borderRadius: 6,
                      border: `1px solid ${active ? activeBorder : "rgba(255,255,255,0.055)"}`,
                      background: active ? activeBg : "#131318",
                      color: active ? activeColor : "#72727e",
                      fontFamily: "var(--font-space-mono)",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      textTransform: "capitalize",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount */}
          <div>
            <div style={labelStyle}>Amount</div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
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

          {/* Category */}
          <div>
            <div style={labelStyle}>Category</div>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              style={{ ...fieldInput, cursor: "pointer" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,200,150,0.4)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.055)")}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} style={{ background: "#131318" }}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <div style={labelStyle}>Date</div>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              style={{
                ...fieldInput,
                fontFamily: "var(--font-space-mono)",
                colorScheme: "dark",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,200,150,0.4)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.055)")}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="txn-modal-footer"
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
            {saving ? "Saving..." : "Save Transaction"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Modal ───────────────────────────────────────────────────

function DeleteModal({
  tx,
  saving,
  onConfirm,
  onClose,
}: {
  tx: Transaction;
  saving: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="txn-modal-overlay"
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
        className="txn-delete-modal-inner"
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
          Delete Transaction
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
          Are you sure you want to delete &ldquo;{tx.description || tx.category}&rdquo;? This
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

// ─── Skeleton Row ───────────────────────────────────────────────────

function SkeletonRow({ index }: { index: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 20px",
        borderBottom: index < 4 ? "1px solid rgba(255,255,255,0.055)" : "none",
        animation: `fadeUp 0.35s ease both`,
        animationDelay: `${index * 60}ms`,
      }}
    >
      <div style={{ width: 2, height: 32, borderRadius: 2, background: "#1a1a21", flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ width: 140, height: 12, borderRadius: 4, background: "#1a1a21", marginBottom: 8, animation: "shimmer 1.5s infinite" }} />
        <div style={{ width: 90, height: 9, borderRadius: 3, background: "#131318", animation: "shimmer 1.5s infinite", animationDelay: "0.15s" }} />
      </div>
      <div style={{ width: 70, height: 14, borderRadius: 4, background: "#1a1a21", animation: "shimmer 1.5s infinite", animationDelay: "0.3s" }} />
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function TransactionsPage() {
  const now = new Date();
  const currentYear = now.getFullYear();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(currentYear);
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const [modalMode, setModalMode] = useState<null | "add" | "edit" | "delete">(null);
  const [activeTransaction, setActiveTransaction] = useState<Transaction | null>(null);
  const [saving, setSaving] = useState(false);

  const [formType, setFormType] = useState<"income" | "expense">("expense");
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState<string>(CATEGORIES[0]);
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState(format(now, "yyyy-MM-dd"));

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions?month=${month}&year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modalMode) setModalMode(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalMode]);

  const filtered = transactions.filter((tx) => {
    if (filterType !== "all" && tx.type !== filterType) return false;
    if (filterCategory !== "all" && tx.category !== filterCategory) return false;
    return true;
  });

  function openAdd() {
    setFormType("expense");
    setFormAmount("");
    setFormCategory(CATEGORIES[0]);
    setFormDescription("");
    setFormDate(format(new Date(), "yyyy-MM-dd"));
    setActiveTransaction(null);
    setModalMode("add");
  }

  function openEdit(tx: Transaction) {
    setFormType(tx.type);
    setFormAmount(String(tx.amount));
    setFormCategory(tx.category);
    setFormDescription(tx.description ?? "");
    setFormDate(toInputDate(tx.date));
    setActiveTransaction(tx);
    setModalMode("edit");
  }

  function openDelete(tx: Transaction) {
    setActiveTransaction(tx);
    setModalMode("delete");
  }

  async function handleSave() {
    const amount = parseFloat(formAmount);
    if (!formAmount || !Number.isFinite(amount) || amount <= 0) return;
    if (!formDate) return;

    setSaving(true);
    try {
      const body = {
        amount,
        type: formType,
        category: formCategory,
        description: formDescription || null,
        date: formDate,
      };

      const url =
        modalMode === "edit" && activeTransaction
          ? `/api/transactions/${activeTransaction.id}`
          : "/api/transactions";
      const method = modalMode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await fetchTransactions();
        setModalMode(null);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!activeTransaction) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/transactions/${activeTransaction.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchTransactions();
        setModalMode(null);
      }
    } finally {
      setSaving(false);
    }
  }

  const selectStyle: React.CSSProperties = {
    ...inputBase,
    cursor: "pointer",
  };

  return (
    <div
      className="txn-page"
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
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] { -moz-appearance: textfield; }
        @keyframes modalSlideUp {
          from { opacity:0; transform:translateY(100%); }
          to { opacity:1; transform:translateY(0); }
        }
        @media (max-width:639px) {
          .txn-page { padding:20px 16px 32px !important; }
          .txn-header {
            flex-direction:column !important;
            align-items:stretch !important;
            gap:14px !important;
          }
          .txn-add-btn {
            width:100% !important;
            justify-content:center !important;
          }
          .txn-filter-bar {
            display:grid !important;
            grid-template-columns:1fr 1fr !important;
            gap:8px !important;
          }
          .txn-filter-month,
          .txn-filter-year { width:100% !important; }
          .txn-filter-type {
            grid-column:1 / -1;
            margin-left:0 !important;
          }
          .txn-filter-type button { flex:1; }
          .txn-filter-category { display:none !important; }
          .txn-row { padding:12px 14px !important; gap:10px !important; }
          .txn-desc { font-size:13px !important; max-width:20ch !important; }
          .txn-cat-pill { display:none !important; }
          .txn-amount { font-size:13px !important; }
          .txn-actions { opacity:1 !important; }
          .txn-actions button { opacity:0.4; transition:opacity 0.15s ease; }
          .txn-actions button:active { opacity:1; }
          .txn-modal-overlay { align-items:flex-end !important; }
          .txn-modal-inner,
          .txn-delete-modal-inner {
            width:calc(100% - 48px) !important;
            max-width:none !important;
            border-radius:12px 12px 0 0 !important;
            animation:modalSlideUp 0.3s ease !important;
          }
          .txn-modal-footer {
            padding-bottom:calc(16px + env(safe-area-inset-bottom)) !important;
          }
          .txn-delete-modal-inner {
            padding-bottom:calc(22px + env(safe-area-inset-bottom)) !important;
          }
        }
      `}</style>

      {/* ── HEADER ── */}
      <div
        className="txn-header"
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
            Transactions
          </div>
          <div
            style={{
              fontFamily: "var(--font-space-mono)",
              fontSize: 11,
              color: "#72727e",
              opacity: 0.75,
              marginTop: 5,
              letterSpacing: "0.06em",
            }}
          >
            {`// ${MONTH_NAMES[month - 1]} ${year}`}
          </div>
        </div>
        <button
          className="txn-add-btn"
          onClick={openAdd}
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
          <Plus size={12} strokeWidth={2.5} /> Add Transaction
        </button>
      </div>

      {/* ── FILTER BAR ── */}
      <div
        className="txn-filter-bar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <select
          className="txn-filter-month"
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
          className="txn-filter-year"
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

        <div className="txn-filter-type" style={{ display: "flex", gap: 0, marginLeft: 4 }}>
          {(["all", "income", "expense"] as const).map((t, i) => {
            const active = filterType === t;
            return (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                style={{
                  padding: "7px 14px",
                  borderRadius:
                    i === 0 ? "6px 0 0 6px" : i === 2 ? "0 6px 6px 0" : "0",
                  border: `1px solid ${active ? "rgba(0,200,150,0.25)" : "rgba(255,255,255,0.055)"}`,
                  borderRight: i < 2 ? "none" : undefined,
                  background: active ? "rgba(0,200,150,0.12)" : "#131318",
                  color: active ? "#00c896" : "#72727e",
                  fontFamily: "var(--font-space-mono)",
                  fontSize: 11,
                  fontWeight: active ? 700 : 400,
                  cursor: "pointer",
                  textTransform: "capitalize",
                  transition: "all 0.15s ease",
                }}
              >
                {t === "all" ? "All" : t}
              </button>
            );
          })}
        </div>

        <select
          className="txn-filter-category"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ ...selectStyle, marginLeft: 4 }}
        >
          <option value="all" style={{ background: "#131318" }}>
            All Categories
          </option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c} style={{ background: "#131318" }}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* ── TRANSACTION LIST ── */}
      <div style={panel}>
        {loading ? (
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} index={i} />
            ))}
          </>
        ) : filtered.length === 0 ? (
          <div
            style={{
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
              <CreditCard size={24} color="#363640" strokeWidth={1.5} />
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
              No transactions yet
            </div>
            <div
              style={{
                fontFamily: "var(--font-figtree)",
                fontSize: 13,
                color: "#72727e",
                marginBottom: 20,
              }}
            >
              Add your first transaction to start tracking
            </div>
            <button
              onClick={openAdd}
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
                boxShadow:
                  "0 0 0 1px rgba(0,200,150,0.3), 0 4px 16px rgba(0,200,150,0.2)",
              }}
            >
              <Plus size={12} strokeWidth={2.5} /> Add Transaction
            </button>
          </div>
        ) : (
          filtered.map((tx, i) => (
            <TransactionRow
              key={tx.id}
              tx={tx}
              isLast={i === filtered.length - 1}
              index={i}
              onEdit={() => openEdit(tx)}
              onDelete={() => openDelete(tx)}
            />
          ))
        )}
      </div>

      {/* ── MODALS ── */}
      {(modalMode === "add" || modalMode === "edit") && (
        <TransactionModal
          mode={modalMode}
          formType={formType}
          setFormType={setFormType}
          formAmount={formAmount}
          setFormAmount={setFormAmount}
          formCategory={formCategory}
          setFormCategory={setFormCategory}
          formDescription={formDescription}
          setFormDescription={setFormDescription}
          formDate={formDate}
          setFormDate={setFormDate}
          saving={saving}
          onSave={handleSave}
          onClose={() => setModalMode(null)}
        />
      )}

      {modalMode === "delete" && activeTransaction && (
        <DeleteModal
          tx={activeTransaction}
          saving={saving}
          onConfirm={handleDelete}
          onClose={() => setModalMode(null)}
        />
      )}
    </div>
  );
}
