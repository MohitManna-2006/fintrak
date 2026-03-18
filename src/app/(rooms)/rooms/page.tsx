"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  X,
} from "lucide-react";

type RoomMember = {
  userId: string;
  name: string | null;
  image: string | null;
  role: string;
};

type Room = {
  id: string;
  name: string;
  budgetCap: number | null;
  createdById: string;
  createdAt: string;
  memberCount: number;
  members: RoomMember[];
  totalExpenses: number;
  myBalance: number;
};

export default function RoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createBudget, setCreateBudget] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function fetchRooms() {
    const res = await fetch("/api/rooms");
    if (res.ok) setRooms(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchRooms();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreating(true);
    setError("");
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: createName.trim(),
        budgetCap: createBudget ? Number(createBudget) : undefined,
      }),
    });
    if (res.ok) {
      const room = await res.json();
      setShowCreate(false);
      setCreateName("");
      setCreateBudget("");
      router.push(`/rooms/${room.id}`);
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to create room");
    }
    setCreating(false);
  }

  return (
    <div style={{ padding: "32px 24px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 700, color: "#fff", margin: 0 }}>
            Shared Rooms
          </h1>
          <p style={{ fontFamily: "Figtree, sans-serif", fontSize: 14, color: "#72727e", marginTop: 4 }}>
            Collaborate on expenses with friends, family, or roommates
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            background: "#00c896",
            color: "#000",
            border: "none",
            borderRadius: 10,
            fontFamily: "Figtree, sans-serif",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Plus size={16} strokeWidth={2} />
          New Room
        </button>
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div style={{ display: "grid", gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ background: "#0c0c0f", borderRadius: 16, height: 100, animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && rooms.length === 0 && (
        <div style={{
          background: "#0c0c0f",
          border: "1px dashed #1e1e26",
          borderRadius: 20,
          padding: "64px 32px",
          textAlign: "center",
        }}>
          <Users size={48} strokeWidth={1} color="#2a2a36" style={{ margin: "0 auto 16px" }} />
          <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
            No rooms yet
          </h2>
          <p style={{ fontFamily: "Figtree, sans-serif", fontSize: 14, color: "#72727e", marginBottom: 24 }}>
            Create a room and invite friends to split expenses together
          </p>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              padding: "10px 24px",
              background: "#00c896",
              color: "#000",
              border: "none",
              borderRadius: 10,
              fontFamily: "Figtree, sans-serif",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Create your first room
          </button>
        </div>
      )}

      {/* Room cards */}
      {!loading && rooms.length > 0 && (
        <div style={{ display: "grid", gap: 16 }}>
          {rooms.map((room) => {
            const bal = room.myBalance;
            const balColor = bal > 0.005 ? "#00c896" : bal < -0.005 ? "#ff4455" : "#72727e";
            const balLabel = bal > 0.005 ? "you are owed" : bal < -0.005 ? "you owe" : "settled";
            return (
              <button
                key={room.id}
                onClick={() => router.push(`/rooms/${room.id}`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#0c0c0f",
                  border: "1px solid #1e1e26",
                  borderRadius: 16,
                  padding: "20px 24px",
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "left",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#00c896")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1e1e26")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  {/* Avatar stack */}
                  <div style={{ position: "relative", width: 48, height: 40 }}>
                    {room.members.slice(0, 3).map((m, i) => (
                      <div
                        key={m.userId}
                        style={{
                          position: "absolute",
                          left: i * 14,
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: m.image ? "transparent" : "#1e1e26",
                          border: "2px solid #0c0c0f",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          zIndex: 3 - i,
                        }}
                      >
                        {m.image ? (
                          <img src={m.image} alt={m.name ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontFamily: "Figtree, sans-serif", fontSize: 12, fontWeight: 600, color: "#72727e" }}>
                            {(m.name ?? "?")[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div>
                    <div style={{ fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 700, color: "#fff" }}>
                      {room.name}
                    </div>
                    <div style={{ fontFamily: "Figtree, sans-serif", fontSize: 13, color: "#72727e", marginTop: 2 }}>
                      {room.memberCount} member{room.memberCount !== 1 ? "s" : ""} · ${room.totalExpenses.toFixed(2)} total
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                      {bal > 0.005 ? (
                        <TrendingUp size={14} color={balColor} strokeWidth={1.5} />
                      ) : bal < -0.005 ? (
                        <TrendingDown size={14} color={balColor} strokeWidth={1.5} />
                      ) : (
                        <DollarSign size={14} color={balColor} strokeWidth={1.5} />
                      )}
                      <span style={{ fontFamily: "Space Mono, monospace", fontSize: 16, fontWeight: 700, color: balColor }}>
                        ${Math.abs(bal).toFixed(2)}
                      </span>
                    </div>
                    <div style={{ fontFamily: "Figtree, sans-serif", fontSize: 11, color: "#72727e", marginTop: 2 }}>
                      {balLabel}
                    </div>
                  </div>
                  <ChevronRight size={18} color="#2a2a36" strokeWidth={1.5} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Create Room Modal */}
      {showCreate && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
          onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}
        >
          <div style={{ background: "#0c0c0f", border: "1px solid #1e1e26", borderRadius: 20, padding: 32, width: "100%", maxWidth: 440 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>
                Create a Room
              </h2>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#72727e" }}>
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontFamily: "Figtree, sans-serif", fontSize: 13, color: "#72727e", display: "block", marginBottom: 8 }}>
                  Room Name *
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Barcelona Trip, Apartment 4B"
                  required
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "#040406",
                    border: "1px solid #1e1e26",
                    borderRadius: 10,
                    color: "#fff",
                    fontFamily: "Figtree, sans-serif",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ fontFamily: "Figtree, sans-serif", fontSize: 13, color: "#72727e", display: "block", marginBottom: 8 }}>
                  Budget Cap (optional)
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#72727e", fontFamily: "Space Mono, monospace", fontSize: 14 }}>$</span>
                  <input
                    type="number"
                    value={createBudget}
                    onChange={(e) => setCreateBudget(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    style={{
                      width: "100%",
                      padding: "12px 16px 12px 28px",
                      background: "#040406",
                      border: "1px solid #1e1e26",
                      borderRadius: 10,
                      color: "#fff",
                      fontFamily: "Space Mono, monospace",
                      fontSize: 14,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {error && (
                <p style={{ fontFamily: "Figtree, sans-serif", fontSize: 13, color: "#ff4455", margin: 0 }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={creating || !createName.trim()}
                style={{
                  padding: "12px 24px",
                  background: creating || !createName.trim() ? "#1e1e26" : "#00c896",
                  color: creating || !createName.trim() ? "#72727e" : "#000",
                  border: "none",
                  borderRadius: 10,
                  fontFamily: "Figtree, sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: creating || !createName.trim() ? "not-allowed" : "pointer",
                  marginTop: 8,
                }}
              >
                {creating ? "Creating..." : "Create Room"}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
