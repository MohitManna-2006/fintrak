"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Users,
  CheckCircle,
  MessageSquare,
  Link,
  Trash2,
  X,
  Send,
  Copy,
  Check,
  TrendingDown,
  TrendingUp,
  Settings,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

type Member = {
  userId: string;
  name: string | null;
  image: string | null;
  role: string;
  balance: number;
};

type Split = {
  userId: string;
  amount: number;
  user: { id: string; name: string | null };
};

type Transaction = {
  id: string;
  description: string | null;
  amount: number;
  category: string;
  date: string;
  paidByUserId: string | null;
  splitType: string | null;
  splits: Split[];
  user: { id: string; name: string | null; image: string | null };
};

type Settlement = {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  note: string | null;
  createdAt: string;
};

type DebtLine = {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
};

type Invite = {
  id: string;
  token: string;
  expiresAt: string | null;
};

type RoomDetail = {
  id: string;
  name: string;
  budgetCap: number | null;
  createdById: string;
  createdAt: string;
  members: Member[];
  transactions: Transaction[];
  settlements: Settlement[];
  invites: Invite[];
  debts: DebtLine[];
  myBalance: number;
  totalExpenses: number;
};

// ─── CATEGORIES ────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Food & Drink", "Transport", "Accommodation", "Entertainment",
  "Shopping", "Utilities", "Health", "Travel", "Other",
];

// ─── HELPERS ───────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function Avatar({ name, image, size = 32 }: { name: string | null; image: string | null; size?: number }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: image ? "transparent" : "#1e1e26",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}>
      {image ? (
        <img src={image} alt={name ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{ fontFamily: "Figtree, sans-serif", fontSize: size * 0.38, fontWeight: 600, color: "#72727e" }}>
          {(name ?? "?")[0].toUpperCase()}
        </span>
      )}
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────

type Tab = "expenses" | "settle" | "copilot";

export default function RoomDetailPage() {
  const { id: roomId } = useParams<{ id: string }>();
  const router = useRouter();

  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("expenses");
  const [currentUserId, setCurrentUserId] = useState<string>("");

  async function fetchRoom() {
    const res = await fetch(`/api/rooms/${roomId}`);
    if (!res.ok) { router.push("/rooms"); return; }
    const data = await res.json();
    setRoom(data);
    setLoading(false);
  }

  // Get current session user id from members + myBalance hint (we know their balance)
  useEffect(() => {
    fetchRoom();
    // Also fetch current user id from /api/auth/session
    fetch("/api/auth/session").then((r) => r.json()).then((s) => {
      if (s?.user?.id) setCurrentUserId(s.user.id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  if (loading) {
    return (
      <div style={{ padding: "32px 24px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ height: 32, background: "#0c0c0f", borderRadius: 8, width: 200, marginBottom: 32, animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ height: 200, background: "#0c0c0f", borderRadius: 16, animation: "pulse 1.5s ease-in-out infinite" }} />
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      </div>
    );
  }

  if (!room) return null;

  return (
    <div style={{ padding: "32px 24px", maxWidth: 900, margin: "0 auto" }}>
      {/* Back + Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <button onClick={() => router.push("/rooms")} style={{ background: "none", border: "none", cursor: "pointer", color: "#72727e", padding: 4, display: "flex" }}>
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: 24, fontWeight: 700, color: "#fff", margin: 0, flex: 1 }}>
          {room.name}
        </h1>
        <InviteButton roomId={room.id} />
      </div>

      {/* Summary strip */}
      <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <Stat label="Total Expenses" value={`$${room.totalExpenses.toFixed(2)}`} color="#fff" />
        {room.budgetCap && (
          <Stat
            label="Budget Cap"
            value={`$${room.budgetCap.toFixed(2)}`}
            color={room.totalExpenses > room.budgetCap ? "#ff4455" : "#e8a000"}
          />
        )}
        <Stat
          label={room.myBalance > 0 ? "You're owed" : room.myBalance < 0 ? "You owe" : "All settled"}
          value={`$${Math.abs(room.myBalance).toFixed(2)}`}
          color={room.myBalance > 0 ? "#00c896" : room.myBalance < 0 ? "#ff4455" : "#72727e"}
        />
        <Stat label="Members" value={String(room.members.length)} color="#72727e" />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "#0c0c0f", borderRadius: 12, padding: 4, marginBottom: 24, width: "fit-content" }}>
        {([
          { key: "expenses", label: "Expenses", icon: Plus },
          { key: "settle", label: "Settle Up", icon: CheckCircle },
          { key: "copilot", label: "Copilot", icon: MessageSquare },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 9,
              border: "none",
              background: tab === key ? "#1e1e26" : "transparent",
              color: tab === key ? "#fff" : "#72727e",
              fontFamily: "Figtree, sans-serif",
              fontSize: 13,
              fontWeight: tab === key ? 600 : 400,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <Icon size={14} strokeWidth={1.5} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "expenses" && (
        <ExpensesTab room={room} currentUserId={currentUserId} onRefresh={fetchRoom} />
      )}
      {tab === "settle" && (
        <SettleTab room={room} currentUserId={currentUserId} onRefresh={fetchRoom} />
      )}
      {tab === "copilot" && (
        <CopilotTab roomId={room.id} />
      )}

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}

// ─── STAT PILL ──────────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: "#0c0c0f", border: "1px solid #1e1e26", borderRadius: 12, padding: "12px 18px" }}>
      <div style={{ fontFamily: "Figtree, sans-serif", fontSize: 11, color: "#72727e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "Space Mono, monospace", fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

// ─── INVITE BUTTON ─────────────────────────────────────────────────────────

function InviteButton({ roomId }: { roomId: string }) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleInvite() {
    setLoading(true);
    const res = await fetch(`/api/rooms/${roomId}/invite`, { method: "POST" });
    if (res.ok) {
      const { token } = await res.json();
      const url = `${window.location.origin}/join/${token}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleInvite}
      disabled={loading}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        background: "#1e1e26",
        border: "1px solid #2a2a36",
        borderRadius: 10,
        color: copied ? "#00c896" : "#fff",
        fontFamily: "Figtree, sans-serif",
        fontSize: 13,
        fontWeight: 500,
        cursor: loading ? "not-allowed" : "pointer",
        transition: "color 0.2s",
      }}
    >
      {copied ? <Check size={14} strokeWidth={2} /> : <Link size={14} strokeWidth={1.5} />}
      {copied ? "Copied!" : loading ? "..." : "Invite"}
    </button>
  );
}

// ─── EXPENSES TAB ──────────────────────────────────────────────────────────

function ExpensesTab({
  room,
  currentUserId,
  onRefresh,
}: {
  room: RoomDetail;
  currentUserId: string;
  onRefresh: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(txId: string) {
    setDeleting(txId);
    await fetch(`/api/rooms/${room.id}/transactions/${txId}`, { method: "DELETE" });
    setDeleting(null);
    onRefresh();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 18px",
            background: "#00c896",
            color: "#000",
            border: "none",
            borderRadius: 10,
            fontFamily: "Figtree, sans-serif",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Plus size={15} strokeWidth={2} />
          Add Expense
        </button>
      </div>

      {room.transactions.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#72727e", fontFamily: "Figtree, sans-serif", fontSize: 14 }}>
          No expenses yet. Add the first one!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {room.transactions.map((tx) => {
            const payer = room.members.find((m) => m.userId === tx.paidByUserId);
            const mySplit = tx.splits.find((s) => s.userId === currentUserId);
            const canDelete = tx.user.id === currentUserId || room.members.find((m) => m.userId === currentUserId)?.role === "admin";
            return (
              <div
                key={tx.id}
                style={{
                  background: "#0c0c0f",
                  border: "1px solid #1e1e26",
                  borderRadius: 14,
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: "Figtree, sans-serif", fontSize: 15, fontWeight: 600, color: "#fff" }}>
                      {tx.description ?? tx.category}
                    </span>
                    <span style={{
                      fontFamily: "Figtree, sans-serif",
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: "#1e1e26",
                      color: "#72727e",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}>
                      {tx.category}
                    </span>
                  </div>
                  <div style={{ fontFamily: "Figtree, sans-serif", fontSize: 12, color: "#72727e", marginTop: 4 }}>
                    Paid by {payer?.name ?? tx.paidByUserId} · {timeAgo(tx.date)} ·{" "}
                    {tx.splitType === "equal" ? "split equally" : "custom split"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "Space Mono, monospace", fontSize: 16, fontWeight: 700, color: "#fff" }}>
                    ${tx.amount.toFixed(2)}
                  </div>
                  {mySplit && (
                    <div style={{ fontFamily: "Figtree, sans-serif", fontSize: 11, color: "#72727e", marginTop: 2 }}>
                      your share: ${mySplit.amount.toFixed(2)}
                    </div>
                  )}
                </div>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(tx.id)}
                    disabled={deleting === tx.id}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#72727e", padding: 4, display: "flex" }}
                  >
                    <Trash2 size={15} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <AddExpenseModal
          room={room}
          currentUserId={currentUserId}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); onRefresh(); }}
        />
      )}
    </div>
  );
}

// ─── ADD EXPENSE MODAL ─────────────────────────────────────────────────────

function AddExpenseModal({
  room,
  currentUserId,
  onClose,
  onSaved,
}: {
  room: RoomDetail;
  currentUserId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food & Drink");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [paidByUserId, setPaidByUserId] = useState(currentUserId || room.members[0]?.userId);
  const [splitType, setSplitType] = useState<"equal" | "weighted">("equal");
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalAmt = Number(amount) || 0;
  const memberCount = room.members.length;

  function buildSplits() {
    if (splitType === "equal") {
      const each = Math.round((totalAmt / memberCount) * 100) / 100;
      // Distribute rounding to first member
      return room.members.map((m, i) => ({
        userId: m.userId,
        amount: i === 0 ? Math.round((totalAmt - each * (memberCount - 1)) * 100) / 100 : each,
      }));
    }
    return room.members.map((m) => ({
      userId: m.userId,
      amount: Number(customSplits[m.userId] ?? 0),
    }));
  }

  const splits = buildSplits();
  const splitTotal = splits.reduce((s, x) => s + x.amount, 0);
  const splitValid = splitType === "equal" || Math.abs(splitTotal - totalAmt) < 0.02;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!splitValid) { setError(`Split total $${splitTotal.toFixed(2)} must equal expense $${totalAmt.toFixed(2)}`); return; }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/rooms/${room.id}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, amount: totalAmt, category, date, paidByUserId, splitType, splits }),
    });
    if (res.ok) {
      onSaved();
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to save");
    }
    setSaving(false);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    background: "#040406",
    border: "1px solid #1e1e26",
    borderRadius: 10,
    color: "#fff",
    fontFamily: "Figtree, sans-serif",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "#0c0c0f", border: "1px solid #1e1e26", borderRadius: 20, padding: 28, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 }}>Add Expense</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#72727e" }}>
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontFamily: "Figtree, sans-serif", fontSize: 12, color: "#72727e", display: "block", marginBottom: 6 }}>Description</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Dinner at Mario's" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontFamily: "Figtree, sans-serif", fontSize: 12, color: "#72727e", display: "block", marginBottom: 6 }}>Amount *</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#72727e", fontFamily: "Space Mono, monospace", fontSize: 13 }}>$</span>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" min="0.01" step="0.01" required style={{ ...inputStyle, paddingLeft: 26 }} />
              </div>
            </div>
            <div>
              <label style={{ fontFamily: "Figtree, sans-serif", fontSize: 12, color: "#72727e", display: "block", marginBottom: 6 }}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
            </div>
            <div>
              <label style={{ fontFamily: "Figtree, sans-serif", fontSize: 12, color: "#72727e", display: "block", marginBottom: 6 }}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontFamily: "Figtree, sans-serif", fontSize: 12, color: "#72727e", display: "block", marginBottom: 6 }}>Paid by</label>
              <select value={paidByUserId} onChange={(e) => setPaidByUserId(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
                {room.members.map((m) => <option key={m.userId} value={m.userId}>{m.name ?? m.userId}</option>)}
              </select>
            </div>
          </div>

          {/* Split type */}
          <div>
            <label style={{ fontFamily: "Figtree, sans-serif", fontSize: 12, color: "#72727e", display: "block", marginBottom: 8 }}>Split</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {(["equal", "weighted"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSplitType(type)}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 8,
                    border: "1px solid",
                    borderColor: splitType === type ? "#00c896" : "#1e1e26",
                    background: splitType === type ? "rgba(0,200,150,0.08)" : "transparent",
                    color: splitType === type ? "#00c896" : "#72727e",
                    fontFamily: "Figtree, sans-serif",
                    fontSize: 12,
                    fontWeight: splitType === type ? 600 : 400,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {type === "equal" ? "Equal Split" : "Custom Split"}
                </button>
              ))}
            </div>

            {/* Member splits */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {room.members.map((m, i) => {
                const share = splits[i]?.amount ?? 0;
                return (
                  <div key={m.userId} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={m.name} image={m.image} size={28} />
                    <span style={{ fontFamily: "Figtree, sans-serif", fontSize: 13, color: "#fff", flex: 1 }}>{m.name ?? m.userId}</span>
                    {splitType === "equal" ? (
                      <span style={{ fontFamily: "Space Mono, monospace", fontSize: 13, color: "#72727e" }}>${share.toFixed(2)}</span>
                    ) : (
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "#72727e", fontFamily: "Space Mono, monospace", fontSize: 12 }}>$</span>
                        <input
                          type="number"
                          value={customSplits[m.userId] ?? ""}
                          onChange={(e) => setCustomSplits((prev) => ({ ...prev, [m.userId]: e.target.value }))}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          style={{ width: 90, padding: "6px 8px 6px 20px", background: "#040406", border: "1px solid #1e1e26", borderRadius: 8, color: "#fff", fontFamily: "Space Mono, monospace", fontSize: 12, outline: "none" }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              {splitType === "weighted" && totalAmt > 0 && (
                <div style={{ fontFamily: "Figtree, sans-serif", fontSize: 12, color: splitValid ? "#00c896" : "#ff4455", textAlign: "right" }}>
                  {splitValid ? "✓ splits balance" : `$${splitTotal.toFixed(2)} / $${totalAmt.toFixed(2)}`}
                </div>
              )}
            </div>
          </div>

          {error && <p style={{ fontFamily: "Figtree, sans-serif", fontSize: 12, color: "#ff4455", margin: 0 }}>{error}</p>}

          <button
            type="submit"
            disabled={saving || !amount}
            style={{
              padding: "12px",
              background: saving || !amount ? "#1e1e26" : "#00c896",
              color: saving || !amount ? "#72727e" : "#000",
              border: "none",
              borderRadius: 10,
              fontFamily: "Figtree, sans-serif",
              fontSize: 14,
              fontWeight: 600,
              cursor: saving || !amount ? "not-allowed" : "pointer",
              marginTop: 4,
            }}
          >
            {saving ? "Saving..." : "Add Expense"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── SETTLE TAB ────────────────────────────────────────────────────────────

function SettleTab({
  room,
  currentUserId,
  onRefresh,
}: {
  room: RoomDetail;
  currentUserId: string;
  onRefresh: () => void;
}) {
  const [settling, setSettling] = useState<DebtLine | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSettle(debt: DebtLine) {
    setSaving(true);
    await fetch(`/api/rooms/${room.id}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromUserId: debt.from, toUserId: debt.to, amount: debt.amount, note }),
    });
    setSettling(null);
    setNote("");
    setSaving(false);
    onRefresh();
  }

  const nameMap = new Map(room.members.map((m) => [m.userId, m.name ?? m.userId]));

  return (
    <div>
      {/* Debts section */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 12, margin: "0 0 12px" }}>
          Who Owes What
        </h3>
        {room.debts.length === 0 ? (
          <div style={{ background: "#0c0c0f", border: "1px solid #1e1e26", borderRadius: 14, padding: 24, textAlign: "center" }}>
            <CheckCircle size={32} strokeWidth={1} color="#00c896" style={{ margin: "0 auto 8px" }} />
            <p style={{ fontFamily: "Figtree, sans-serif", fontSize: 14, color: "#72727e", margin: 0 }}>
              All settled up! No outstanding debts.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {room.debts.map((debt, i) => {
              const isMyDebt = debt.from === currentUserId;
              const isOwedToMe = debt.to === currentUserId;
              return (
                <div
                  key={i}
                  style={{
                    background: "#0c0c0f",
                    border: "1px solid",
                    borderColor: isMyDebt ? "rgba(255,68,85,0.2)" : isOwedToMe ? "rgba(0,200,150,0.2)" : "#1e1e26",
                    borderRadius: 14,
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <Avatar name={debt.fromName} image={room.members.find((m) => m.userId === debt.from)?.image ?? null} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "Figtree, sans-serif", fontSize: 14, color: "#fff" }}>
                      <span style={{ fontWeight: 600 }}>{debt.fromName}</span>
                      <span style={{ color: "#72727e" }}> owes </span>
                      <span style={{ fontWeight: 600 }}>{debt.toName}</span>
                    </div>
                  </div>
                  <span style={{ fontFamily: "Space Mono, monospace", fontSize: 16, fontWeight: 700, color: isMyDebt ? "#ff4455" : isOwedToMe ? "#00c896" : "#fff" }}>
                    ${debt.amount.toFixed(2)}
                  </span>
                  {(isMyDebt || isOwedToMe) && (
                    <button
                      onClick={() => setSettling(debt)}
                      style={{
                        padding: "6px 14px",
                        background: "#1e1e26",
                        border: "1px solid #2a2a36",
                        borderRadius: 8,
                        color: "#00c896",
                        fontFamily: "Figtree, sans-serif",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Settle
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Settlement history */}
      {room.settlements.length > 0 && (
        <div>
          <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 12px" }}>
            Settlement History
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {room.settlements.map((s) => (
              <div
                key={s.id}
                style={{
                  background: "#0c0c0f",
                  border: "1px solid #1e1e26",
                  borderRadius: 12,
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <CheckCircle size={16} strokeWidth={1.5} color="#00c896" />
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: "Figtree, sans-serif", fontSize: 13, color: "#fff" }}>
                    <span style={{ fontWeight: 600 }}>{nameMap.get(s.fromUserId) ?? s.fromUserId}</span>
                    <span style={{ color: "#72727e" }}> paid </span>
                    <span style={{ fontWeight: 600 }}>{nameMap.get(s.toUserId) ?? s.toUserId}</span>
                    {s.note && <span style={{ color: "#72727e" }}> · {s.note}</span>}
                  </span>
                </div>
                <span style={{ fontFamily: "Space Mono, monospace", fontSize: 13, color: "#00c896" }}>${s.amount.toFixed(2)}</span>
                <span style={{ fontFamily: "Figtree, sans-serif", fontSize: 11, color: "#72727e" }}>{timeAgo(s.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settle confirm modal */}
      {settling && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#0c0c0f", border: "1px solid #1e1e26", borderRadius: 20, padding: 28, width: "100%", maxWidth: 400 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 }}>Confirm Settlement</h2>
              <button onClick={() => setSettling(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#72727e" }}>
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>
            <p style={{ fontFamily: "Figtree, sans-serif", fontSize: 14, color: "#a0a0b0", marginBottom: 20 }}>
              <span style={{ color: "#fff", fontWeight: 600 }}>{settling.fromName}</span> pays{" "}
              <span style={{ color: "#fff", fontWeight: 600 }}>{settling.toName}</span>{" "}
              <span style={{ fontFamily: "Space Mono, monospace", color: "#00c896", fontWeight: 700 }}>${settling.amount.toFixed(2)}</span>
            </p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontFamily: "Figtree, sans-serif", fontSize: 12, color: "#72727e", display: "block", marginBottom: 8 }}>Note (optional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Venmo transfer"
                style={{ width: "100%", padding: "11px 14px", background: "#040406", border: "1px solid #1e1e26", borderRadius: 10, color: "#fff", fontFamily: "Figtree, sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setSettling(null)} style={{ flex: 1, padding: "11px", background: "#1e1e26", border: "none", borderRadius: 10, color: "#72727e", fontFamily: "Figtree, sans-serif", fontSize: 14, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => handleSettle(settling)} disabled={saving} style={{ flex: 1, padding: "11px", background: "#00c896", border: "none", borderRadius: 10, color: "#000", fontFamily: "Figtree, sans-serif", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Saving..." : "Mark Settled"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── COPILOT TAB ────────────────────────────────────────────────────────────

type ChatMsg = { role: "user" | "assistant"; content: string };

function CopilotTab({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming) return;
    const userMsg: ChatMsg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    const res = await fetch(`/api/rooms/${roomId}/copilot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newMessages }),
    });

    if (!res.ok || !res.body) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong." }]);
      setStreaming(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let assistantContent = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      assistantContent += decoder.decode(value, { stream: true });
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: assistantContent };
        return updated;
      });
    }

    setStreaming(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 340px)", minHeight: 400 }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingBottom: 16 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 16px", color: "#72727e", fontFamily: "Figtree, sans-serif", fontSize: 14 }}>
            <MessageSquare size={36} strokeWidth={1} color="#2a2a36" style={{ margin: "0 auto 12px" }} />
            Ask about expenses, balances, or anything related to this room.
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div style={{
              maxWidth: "80%",
              padding: "12px 16px",
              borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: msg.role === "user" ? "#00c896" : "#0c0c0f",
              border: msg.role === "user" ? "none" : "1px solid #1e1e26",
              color: msg.role === "user" ? "#000" : "#e0e0ee",
              fontFamily: "Figtree, sans-serif",
              fontSize: 14,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
            }}>
              {msg.content}
              {streaming && i === messages.length - 1 && msg.role === "assistant" && (
                <span style={{ display: "inline-block", width: 6, height: 14, background: "#00c896", marginLeft: 4, animation: "blink 1s step-end infinite", verticalAlign: "text-bottom", borderRadius: 1 }} />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{ display: "flex", gap: 10, paddingTop: 16, borderTop: "1px solid #1e1e26" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this room's expenses..."
          disabled={streaming}
          style={{
            flex: 1,
            padding: "12px 16px",
            background: "#0c0c0f",
            border: "1px solid #1e1e26",
            borderRadius: 12,
            color: "#fff",
            fontFamily: "Figtree, sans-serif",
            fontSize: 14,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || streaming}
          style={{
            padding: "12px 18px",
            background: !input.trim() || streaming ? "#1e1e26" : "#00c896",
            color: !input.trim() || streaming ? "#72727e" : "#000",
            border: "none",
            borderRadius: 12,
            cursor: !input.trim() || streaming ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Send size={16} strokeWidth={1.5} />
        </button>
      </form>

      <style>{`@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>
    </div>
  );
}
