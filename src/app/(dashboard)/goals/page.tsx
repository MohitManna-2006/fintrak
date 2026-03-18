"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, X, Target, PlusCircle } from "lucide-react";

type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  color: string | null;
};

const GOAL_COLORS = [
  "#00c896",
  "#4d9fff",
  "#9d7fea",
  "#e8a000",
  "#ff4455",
  "#fb7185",
];

const DEFAULT_COLOR = "#00c896";

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

function toDateInputValue(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function localDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDaysRemaining(deadline: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline);
  const dl = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((dl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getDeadlineLabel(deadline: string): string {
  const d = new Date(deadline);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type GoalStatus = "complete" | "overdue" | "urgent" | "active";

function getGoalStatus(goal: Goal): GoalStatus {
  const progress = goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0;
  if (progress >= 1) return "complete";
  const daysLeft = getDaysRemaining(goal.deadline);
  if (daysLeft < 0) return "overdue";
  if (daysLeft <= 30 && progress < 0.9) return "urgent";
  return "active";
}

function getBarColor(status: GoalStatus, goalColor: string): string {
  if (status === "overdue") return "#ff4455";
  if (status === "urgent") return "#e8a000";
  return goalColor;
}

// ─── Goal Modal (Add / Edit) ─────────────────────────────────────────

function GoalModal({
  mode,
  formName,
  setFormName,
  formTarget,
  setFormTarget,
  formDeadline,
  setFormDeadline,
  formColor,
  setFormColor,
  saving,
  onSave,
  onClose,
}: {
  mode: "add" | "edit";
  formName: string;
  setFormName: (v: string) => void;
  formTarget: string;
  setFormTarget: (v: string) => void;
  formDeadline: string;
  setFormDeadline: (v: string) => void;
  formColor: string;
  setFormColor: (v: string) => void;
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
    boxSizing: "border-box",
  };

  return (
    <div
      className="gl-modal-overlay"
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
        className="gl-modal-inner"
        style={{
          width: 440,
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
            {mode === "add" ? "Add Goal" : "Edit Goal"}
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
          {/* Goal Name */}
          <div>
            <div style={labelStyle}>Goal Name</div>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Emergency Fund, New Car..."
              style={fieldInput}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,200,150,0.4)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.055)")}
            />
          </div>

          {/* Target Amount */}
          <div>
            <div style={labelStyle}>Target Amount</div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formTarget}
              onChange={(e) => setFormTarget(e.target.value)}
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

          {/* Deadline */}
          <div>
            <div style={labelStyle}>Target Date</div>
            <input
              type="date"
              value={formDeadline}
              onChange={(e) => setFormDeadline(e.target.value)}
              style={{ ...fieldInput, colorScheme: "dark" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,200,150,0.4)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.055)")}
            />
          </div>

          {/* Color */}
          <div>
            <div style={labelStyle}>Color</div>
            <div style={{ display: "flex", gap: 10 }}>
              {GOAL_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setFormColor(c)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: c,
                    border: formColor === c ? "2px solid #f0f0f4" : "2px solid transparent",
                    cursor: "pointer",
                    boxShadow: formColor === c ? `0 0 8px ${c}` : "none",
                    transition: "all 0.15s ease",
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="gl-modal-footer"
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
            {saving ? "Saving..." : mode === "add" ? "Add Goal" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Contribute Modal ────────────────────────────────────────────────

function ContributeModal({
  goal,
  saving,
  onContribute,
  onClose,
}: {
  goal: Goal;
  saving: boolean;
  onContribute: (amount: number) => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const goalColor = goal.color ?? DEFAULT_COLOR;

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-space-mono)",
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#72727e",
    marginBottom: 7,
  };

  function handleSubmit() {
    const n = parseFloat(amount);
    if (Number.isFinite(n) && n > 0) onContribute(n);
  }

  return (
    <div
      className="gl-modal-overlay"
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
        className="gl-modal-inner"
        style={{
          width: 380,
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: goalColor,
                boxShadow: `0 0 6px ${goalColor}`,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-syne)",
                fontWeight: 600,
                fontSize: 16,
                color: "#f0f0f4",
              }}
            >
              Add Contribution
            </span>
          </div>
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
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontFamily: "var(--font-figtree)",
              fontSize: 13,
              color: "#72727e",
            }}
          >
            Contributing to{" "}
            <span style={{ color: "#f0f0f4", fontWeight: 500 }}>{goal.name}</span>
          </div>

          <div
            style={{
              padding: "10px 14px",
              borderRadius: 6,
              background: "#131318",
              border: "1px solid rgba(255,255,255,0.055)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-space-mono)",
                fontSize: 10,
                color: "#72727e",
                letterSpacing: "0.08em",
              }}
            >
              REMAINING
            </span>
            <span
              style={{
                fontFamily: "var(--font-space-mono)",
                fontSize: 13,
                color: "#f0f0f4",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              ${formatAmount(remaining)}
            </span>
          </div>

          <div>
            <div style={labelStyle}>Amount</div>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="0.00"
              style={{
                ...inputBase,
                width: "100%",
                fontSize: 13,
                padding: "10px 14px",
                fontFamily: "var(--font-space-mono)",
                fontVariantNumeric: "tabular-nums",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,200,150,0.4)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.055)")}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="gl-modal-footer"
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
            onClick={handleSubmit}
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
            {saving ? "Saving..." : "Contribute"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Modal ────────────────────────────────────────────────────

function DeleteModal({
  goal,
  saving,
  onConfirm,
  onClose,
}: {
  goal: Goal;
  saving: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="gl-modal-overlay"
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
        className="gl-delete-modal-inner"
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
          Delete Goal
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
          Are you sure you want to delete &ldquo;{goal.name}&rdquo;? Your progress will be lost
          and this cannot be undone.
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
        padding: "20px",
        animation: `fadeUp 0.35s ease both`,
        animationDelay: `${index * 60}ms`,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: "#1a1a21",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1a1a21" }} />
        <div
          style={{
            width: 120,
            height: 13,
            borderRadius: 4,
            background: "#1a1a21",
            animation: "shimmer 1.5s infinite",
          }}
        />
        <div style={{ flex: 1 }} />
        <div
          style={{
            width: 60,
            height: 10,
            borderRadius: 4,
            background: "#131318",
            animation: "shimmer 1.5s infinite",
            animationDelay: "0.2s",
          }}
        />
      </div>
      <div
        style={{
          width: 100,
          height: 20,
          borderRadius: 4,
          background: "#1a1a21",
          marginBottom: 12,
          animation: "shimmer 1.5s infinite",
          animationDelay: "0.1s",
        }}
      />
      <div
        style={{
          height: 3,
          borderRadius: 2,
          background: "#1a1a21",
          marginBottom: 12,
          animation: "shimmer 1.5s infinite",
          animationDelay: "0.15s",
        }}
      />
      <div style={{ display: "flex", gap: 10 }}>
        <div
          style={{
            width: 70,
            height: 10,
            borderRadius: 3,
            background: "#131318",
            animation: "shimmer 1.5s infinite",
            animationDelay: "0.3s",
          }}
        />
        <div style={{ flex: 1 }} />
        <div
          style={{
            width: 60,
            height: 10,
            borderRadius: 3,
            background: "#131318",
            animation: "shimmer 1.5s infinite",
            animationDelay: "0.4s",
          }}
        />
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | "add" | "edit" | "delete" | "contribute">(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formDeadline, setFormDeadline] = useState("");
  const [formColor, setFormColor] = useState(DEFAULT_COLOR);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/goals");
      if (res.ok) setGoals(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modal) setModal(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal]);

  // ─── Derived stats ────────────────────────────────────────────────
  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const completeCount = goals.filter((g) => g.currentAmount >= g.targetAmount).length;

  // ─── Actions ──────────────────────────────────────────────────────

  function openAdd() {
    setFormName("");
    setFormTarget("");
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    setFormDeadline(localDateString(d));
    setFormColor(DEFAULT_COLOR);
    setSelectedGoal(null);
    setModal("add");
  }

  function openEdit(g: Goal) {
    setFormName(g.name);
    setFormTarget(String(g.targetAmount));
    setFormDeadline(toDateInputValue(g.deadline));
    setFormColor(g.color ?? DEFAULT_COLOR);
    setSelectedGoal(g);
    setModal("edit");
  }

  function openDelete(g: Goal) {
    setSelectedGoal(g);
    setModal("delete");
  }

  function openContribute(g: Goal) {
    setSelectedGoal(g);
    setModal("contribute");
  }

  async function handleSave() {
    if (!formName.trim() || !formTarget || !formDeadline) return;
    const target = parseFloat(formTarget);
    if (!Number.isFinite(target) || target <= 0) return;

    setSaving(true);
    try {
      if (modal === "add") {
        const res = await fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            targetAmount: target,
            deadline: formDeadline,
            color: formColor,
          }),
        });
        if (res.ok) {
          await fetchGoals();
          setModal(null);
        }
      } else if (modal === "edit" && selectedGoal) {
        const res = await fetch(`/api/goals/${selectedGoal.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            targetAmount: target,
            deadline: formDeadline,
            color: formColor,
          }),
        });
        if (res.ok) {
          await fetchGoals();
          setModal(null);
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedGoal) return;
    setSaving(true);
    try {
      const res = await fetch("/api/goals", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedGoal.id }),
      });
      if (res.ok) {
        await fetchGoals();
        setModal(null);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleContribute(amount: number) {
    if (!selectedGoal) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/goals/${selectedGoal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (res.ok) {
        await fetchGoals();
        setModal(null);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="gl-page"
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
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(0.4);
          cursor: pointer;
        }
        .gl-card-actions { opacity: 0; transition: opacity 0.15s ease; }
        .gl-card:hover .gl-card-actions { opacity: 1; }
        .gl-contribute-btn { opacity: 0; transition: opacity 0.15s ease; }
        .gl-card:hover .gl-contribute-btn { opacity: 1; }
        @media (max-width:639px) {
          .gl-page { padding:20px 16px 32px !important; }
          .gl-header {
            flex-direction:column !important;
            align-items:stretch !important;
            gap:14px !important;
          }
          .gl-add-btn {
            width:100% !important;
            justify-content:center !important;
          }
          .gl-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .gl-grid { grid-template-columns: 1fr !important; }
          .gl-card-actions { opacity:1 !important; }
          .gl-card-actions button { opacity:0.4; transition:opacity 0.15s ease; }
          .gl-card-actions button:active { opacity:1; }
          .gl-contribute-btn { opacity:1 !important; }
          .gl-modal-overlay { align-items:flex-end !important; }
          .gl-modal-inner,
          .gl-delete-modal-inner {
            width:calc(100% - 48px) !important;
            max-width:none !important;
            border-radius:12px 12px 0 0 !important;
            animation:modalSlideUp 0.3s ease !important;
          }
          .gl-modal-footer {
            padding-bottom:calc(16px + env(safe-area-inset-bottom)) !important;
          }
          .gl-delete-modal-inner {
            padding-bottom:calc(22px + env(safe-area-inset-bottom)) !important;
          }
        }
      `}</style>

      {/* ── HEADER ── */}
      <div
        className="gl-header"
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
            Goals
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
            {loading
              ? "// SAVINGS GOALS"
              : `// ${goals.length} SAVINGS GOAL${goals.length !== 1 ? "S" : ""}`}
          </div>
        </div>

        <button
          className="gl-add-btn"
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
          <Plus size={12} strokeWidth={2.5} /> Add Goal
        </button>
      </div>

      {/* ── STATS ── */}
      {!loading && goals.length > 0 && (
        <div
          className="gl-stats"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            marginBottom: 24,
            animation: "fadeUp 0.35s ease both",
          }}
        >
          {[
            { label: "TOTAL SAVED", value: `$${formatAmount(totalSaved)}`, color: "#00c896" },
            { label: "TOTAL TARGET", value: `$${formatAmount(totalTarget)}`, color: "#f0f0f4" },
            {
              label: "GOALS COMPLETE",
              value: `${completeCount} / ${goals.length}`,
              color: completeCount === goals.length ? "#00c896" : "#f0f0f4",
            },
          ].map((stat) => (
            <div key={stat.label} style={{ ...panel, padding: "16px 18px" }}>
              <div
                style={{
                  fontFamily: "var(--font-space-mono)",
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "#72727e",
                  marginBottom: 6,
                }}
              >
                {stat.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-space-mono)",
                  fontSize: 18,
                  fontWeight: 700,
                  color: stat.color,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.3px",
                }}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CONTENT ── */}
      {loading ? (
        <div
          className="gl-grid"
          style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </div>
      ) : goals.length === 0 ? (
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
            <Target size={24} color="#363640" strokeWidth={1.5} />
          </div>
          <div
            style={{
              fontFamily: "var(--font-syne)",
              fontWeight: 600,
              fontSize: 16,
              color: "#f0f0f4",
              marginBottom: 8,
            }}
          >
            No goals yet
          </div>
          <div
            style={{
              fontFamily: "var(--font-figtree)",
              fontSize: 13,
              color: "#72727e",
              marginBottom: 24,
              textAlign: "center",
              maxWidth: 320,
              lineHeight: 1.6,
            }}
          >
            Set a savings goal to track your progress toward big milestones — emergency fund,
            vacation, new car, anything.
          </div>
          <button
            onClick={openAdd}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 18px",
              borderRadius: 6,
              background: "#00c896",
              border: "none",
              color: "#000",
              fontFamily: "var(--font-figtree)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 0 0 1px rgba(0,200,150,0.3), 0 4px 16px rgba(0,200,150,0.2)",
            }}
          >
            <Plus size={13} strokeWidth={2.5} /> Add your first goal
          </button>
        </div>
      ) : (
        /* ── GOAL CARDS ── */
        <div
          className="gl-grid"
          style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}
        >
          {goals.map((goal, i) => {
            const goalColor = goal.color ?? DEFAULT_COLOR;
            const progress =
              goal.targetAmount > 0
                ? Math.min(goal.currentAmount / goal.targetAmount, 1)
                : 0;
            const pct = Math.round(progress * 100);
            const status = getGoalStatus(goal);
            const daysLeft = getDaysRemaining(goal.deadline);
            const barColor = getBarColor(status, goalColor);
            const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
            const dailyNeeded = daysLeft > 0 ? remaining / daysLeft : null;
            const deadlineLabel = getDeadlineLabel(goal.deadline);

            const statusBadge = {
              complete: {
                label: "COMPLETE",
                color: "#00c896",
                bg: "rgba(0,200,150,0.12)",
                border: "rgba(0,200,150,0.25)",
              },
              overdue: {
                label: "OVERDUE",
                color: "#ff4455",
                bg: "rgba(255,68,85,0.1)",
                border: "rgba(255,68,85,0.2)",
              },
              urgent: {
                label: "URGENT",
                color: "#e8a000",
                bg: "rgba(232,160,0,0.12)",
                border: "rgba(232,160,0,0.25)",
              },
              active: {
                label: "IN PROGRESS",
                color: "#72727e",
                bg: "rgba(255,255,255,0.04)",
                border: "rgba(255,255,255,0.08)",
              },
            }[status];

            return (
              <div
                key={goal.id}
                className="gl-card"
                style={{
                  ...panel,
                  padding: "20px",
                  animation: "fadeUp 0.35s ease both",
                  animationDelay: `${i * 60}ms`,
                  position: "relative",
                  overflow: "hidden",
                  transition: "border-color 0.15s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "rgba(255,255,255,0.055)")
                }
              >
                {/* Color accent top bar */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: goalColor,
                    opacity: 0.7,
                  }}
                />

                {/* Top row: dot + name + badge + actions */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: goalColor,
                      boxShadow: `0 0 6px ${goalColor}`,
                      flexShrink: 0,
                      marginTop: 4,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-syne)",
                        fontSize: 15,
                        fontWeight: 600,
                        color: "#f0f0f4",
                        lineHeight: 1.2,
                        marginBottom: 6,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {goal.name}
                    </div>
                    <span
                      style={{
                        fontFamily: "var(--font-space-mono)",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        color: statusBadge.color,
                        background: statusBadge.bg,
                        border: `1px solid ${statusBadge.border}`,
                        borderRadius: 3,
                        padding: "2px 6px",
                      }}
                    >
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* Edit / Delete */}
                  <div
                    className="gl-card-actions"
                    style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
                  >
                    <button
                      onClick={() => openEdit(goal)}
                      title="Edit goal"
                      style={{
                        width: 26,
                        height: 26,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 4,
                        border: "1px solid rgba(255,255,255,0.055)",
                        background: "transparent",
                        color: "#72727e",
                        cursor: "pointer",
                        transition: "color 0.15s ease, border-color 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#f0f0f4";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#72727e";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.055)";
                      }}
                    >
                      <Pencil size={11} strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => openDelete(goal)}
                      title="Delete goal"
                      style={{
                        width: 26,
                        height: 26,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 4,
                        border: "1px solid rgba(255,255,255,0.055)",
                        background: "transparent",
                        color: "#72727e",
                        cursor: "pointer",
                        transition: "color 0.15s ease, border-color 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#ff4455";
                        e.currentTarget.style.borderColor = "rgba(255,68,85,0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#72727e";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.055)";
                      }}
                    >
                      <Trash2 size={11} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                {/* Amount row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 6,
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-space-mono)",
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#f0f0f4",
                      fontVariantNumeric: "tabular-nums",
                      letterSpacing: "-0.5px",
                    }}
                  >
                    ${formatAmount(goal.currentAmount)}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-space-mono)",
                      fontSize: 11,
                      color: "#72727e",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    / ${formatAmount(goal.targetAmount)}
                  </span>
                  <div style={{ flex: 1 }} />
                  <span
                    style={{
                      fontFamily: "var(--font-space-mono)",
                      fontSize: 11,
                      fontWeight: 700,
                      color: barColor,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {pct}%
                  </span>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    position: "relative",
                    height: 3,
                    borderRadius: 2,
                    background: "#1a1a21",
                    marginBottom: 14,
                    overflow: "visible",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      height: "100%",
                      width: `${pct}%`,
                      borderRadius: 2,
                      background: barColor,
                      boxShadow: `0 0 6px ${barColor}`,
                      animation: "barGrow 0.6s ease both",
                      animationDelay: `${i * 60 + 200}ms`,
                    }}
                  />
                  {pct > 0 && pct < 100 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: `${pct}%`,
                        transform: "translate(-50%, -50%)",
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: barColor,
                        boxShadow: `0 0 8px ${barColor}`,
                      }}
                    />
                  )}
                </div>

                {/* Footer row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {status !== "complete" && (
                    <span
                      style={{
                        fontFamily: "var(--font-space-mono)",
                        fontSize: 9.5,
                        color:
                          daysLeft < 0 ? "#ff4455" : daysLeft <= 14 ? "#e8a000" : "#72727e",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {daysLeft < 0
                        ? `${Math.abs(daysLeft)}D OVERDUE`
                        : daysLeft === 0
                          ? "DUE TODAY"
                          : `${daysLeft}D LEFT`}
                    </span>
                  )}
                  {status !== "complete" && dailyNeeded !== null && dailyNeeded > 0 && (
                    <>
                      <span
                        style={{
                          color: "#1a1a21",
                          fontFamily: "var(--font-space-mono)",
                          fontSize: 9.5,
                        }}
                      >
                        ·
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-space-mono)",
                          fontSize: 9.5,
                          color: "#72727e",
                          letterSpacing: "0.05em",
                        }}
                      >
                        ${formatAmount(dailyNeeded)}/DAY
                      </span>
                    </>
                  )}
                  {status === "complete" && (
                    <span
                      style={{
                        fontFamily: "var(--font-space-mono)",
                        fontSize: 9.5,
                        color: "#00c896",
                        letterSpacing: "0.05em",
                      }}
                    >
                      TARGET REACHED
                    </span>
                  )}
                  <span
                    style={{
                      fontFamily: "var(--font-space-mono)",
                      fontSize: 9.5,
                      color: "#363640",
                      letterSpacing: "0.05em",
                      marginLeft: "auto",
                    }}
                  >
                    {deadlineLabel.toUpperCase()}
                  </span>
                </div>

                {/* Contribute button */}
                {status !== "complete" && (
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <button
                      className="gl-contribute-btn"
                      onClick={() => openContribute(goal)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "6px 12px",
                        borderRadius: 5,
                        background: "transparent",
                        border: `1px solid ${goalColor}33`,
                        color: goalColor,
                        fontFamily: "var(--font-figtree)",
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "background 0.15s ease, border-color 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `${goalColor}14`;
                        e.currentTarget.style.borderColor = `${goalColor}66`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = `${goalColor}33`;
                      }}
                    >
                      <PlusCircle size={12} strokeWidth={1.5} />
                      Add contribution
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODALS ── */}
      {(modal === "add" || modal === "edit") && (
        <GoalModal
          mode={modal}
          formName={formName}
          setFormName={setFormName}
          formTarget={formTarget}
          setFormTarget={setFormTarget}
          formDeadline={formDeadline}
          setFormDeadline={setFormDeadline}
          formColor={formColor}
          setFormColor={setFormColor}
          saving={saving}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "contribute" && selectedGoal && (
        <ContributeModal
          goal={selectedGoal}
          saving={saving}
          onContribute={handleContribute}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "delete" && selectedGoal && (
        <DeleteModal
          goal={selectedGoal}
          saving={saving}
          onConfirm={handleDelete}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
