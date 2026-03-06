"use client";
import { useState, useEffect } from "react";
import {
  Bell, Plus, ChevronRight, Zap
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, PieChart, Pie, Cell
} from "recharts";
import { useWindowWidth } from "@/lib/hooks/useWindowWidth";

const trendData = [
  { m: "OCT", income: 3200, expenses: 1800 },
  { m: "NOV", income: 3200, expenses: 2100 },
  { m: "DEC", income: 4100, expenses: 2800 },
  { m: "JAN", income: 4500, expenses: 1600 },
  { m: "FEB", income: 4500, expenses: 1900 },
  { m: "MAR", income: 4500, expenses: 1536 },
];

const pieData = [
  { name: "Rent", value: 800, pct: 52, color: "#ff4455" },
  { name: "Food", value: 320, pct: 21, color: "#00c896" },
  { name: "Shopping", value: 180, pct: 12, color: "#9d7fea" },
  { name: "Transport", value: 140, pct: 9, color: "#4d9fff" },
  { name: "Subs", value: 64, pct: 4, color: "#e8a000" },
  { name: "Health", value: 32, pct: 2, color: "#fb7185" },
];

const txns = [
  { id: 1, name: "Monthly Salary", cat: "Income", amount: 4500, type: "income", date: "MAR 01", color: "#00c896" },
  { id: 2, name: "Apartment Rent", cat: "Housing", amount: -800, type: "expense", date: "MAR 02", color: "#ff4455" },
  { id: 3, name: "Whole Foods", cat: "Food", amount: -94, type: "expense", date: "MAR 03", color: "#9d7fea" },
  { id: 4, name: "Nike Store", cat: "Shopping", amount: -180, type: "expense", date: "MAR 04", color: "#4d9fff" },
  { id: 5, name: "Uber", cat: "Transport", amount: -22, type: "expense", date: "MAR 05", color: "#e8a000" },
  { id: 6, name: "Spotify + Netflix", cat: "Subs", amount: -28, type: "expense", date: "MAR 05", color: "#fb7185" },
];

const budgets = [
  { name: "Food & Dining", spent: 320, limit: 400, color: "#00c896" },
  { name: "Rent & Housing", spent: 800, limit: 800, color: "#ff4455" },
  { name: "Shopping", spent: 180, limit: 300, color: "#9d7fea" },
  { name: "Transport", spent: 140, limit: 200, color: "#4d9fff" },
  { name: "Subscriptions", spent: 64, limit: 100, color: "#e8a000" },
];

function Count({ to, prefix = "$", duration = 1300, delay = 0 }: { to: number; prefix?: string; duration?: number; delay?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let start: number;
    const t = setTimeout(() => {
      const fn = (ts: number) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        const e = 1 - Math.pow(1 - p, 3);
        setN(Math.round(e * to));
        if (p < 1) requestAnimationFrame(fn);
      };
      requestAnimationFrame(fn);
    }, delay);
    return () => clearTimeout(t);
  }, [to, duration, delay]);
  return <>{prefix}{n.toLocaleString()}</>;
}

function BudgetBar({ name, spent, limit, color, idx }: { name: string; spent: number; limit: number; color: string; idx: number }) {
  const [w, setW] = useState(0);
  const pct = Math.min((spent / limit) * 100, 100);
  useEffect(() => {
    const t = setTimeout(() => setW(pct), 300 + idx * 100);
    return () => clearTimeout(t);
  }, [pct, idx]);
  const fill = pct >= 100 ? "#ff4455" : pct >= 80 ? "#e8a000" : color;
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "#f0f0f4" }}>{name}</span>
        <span style={{ fontFamily: "var(--font-space-mono)", fontSize: 10.5, color: pct >= 100 ? "#ff4455" : pct >= 80 ? "#e8a000" : "#72727e" }}>
          ${spent} <span style={{ color: "#363640" }}>/ ${limit}</span>
        </span>
      </div>
      <div style={{ height: 3, background: "#1a1a21", borderRadius: 2, position: "relative" }}>
        <div style={{
          height: "100%", width: `${w}%`, background: fill,
          borderRadius: 2, transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)",
          position: "relative",
        }}>
          <div style={{
            position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
            width: 5, height: 5, borderRadius: "50%", background: fill,
            boxShadow: `0 0 6px ${fill}`,
          }} />
        </div>
      </div>
    </div>
  );
}

type TooltipPayload = {
  color: string;
  name: string;
  value: number;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
};

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#131318", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 6, padding: "10px 13px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    }}>
      <div style={{ fontFamily: "var(--font-space-mono)", fontSize: 9, color: "#363640", marginBottom: 7, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
      {payload.map((p, i: number) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
          <div style={{ width: 12, height: 1.5, background: p.color, borderRadius: 1 }} />
          <span style={{ color: "#72727e", fontSize: 11, flex: 1 }}>{p.name}</span>
          <span style={{ fontFamily: "var(--font-space-mono)", fontSize: 11.5, color: p.color }}>${p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

const panel: React.CSSProperties = {
  background: "#0c0c0f",
  border: "1px solid rgba(255,255,255,0.055)",
  borderRadius: 8,
  padding: "18px 20px",
};

export default function DashboardPage() {
  const isMobile = useWindowWidth() < 1024;
  const chartH = isMobile ? 180 : 218;

  return (
    <div className="px-4 pt-4 pb-6 lg:px-[34px] lg:pt-[30px] lg:pb-[40px]" style={{ maxWidth: 1100, fontFamily: "var(--font-figtree), sans-serif" }}>

      {/* HEADER */}
      <div className="flex flex-col items-start lg:flex-row lg:items-end lg:justify-between" style={{
        paddingBottom: 22, marginBottom: 26,
        borderBottom: "1px solid rgba(255,255,255,0.055)",
        position: "relative",
      }}>
        <div style={{ position: "absolute", bottom: -1, left: 0, width: 48, height: 1, background: "#00c896", boxShadow: "0 0 8px #00c896" }} />
        <div>
          <div style={{ fontFamily: "var(--font-syne)", fontSize: 28, fontWeight: 800, letterSpacing: "-0.8px", color: "#f0f0f4", lineHeight: 1 }}>Dashboard</div>
          <div style={{ fontFamily: "var(--font-space-mono)", fontSize: 11, color: "#72727e", opacity: 0.75, marginTop: 5, letterSpacing: "0.06em" }}>{"// MARCH 2026"}</div>
        </div>
        <div className="mt-3 w-full lg:mt-0 lg:w-auto" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="hidden lg:flex" style={{
            width: 32, height: 32, borderRadius: 6,
            background: "#131318", border: "1px solid rgba(255,255,255,0.055)",
            alignItems: "center", justifyContent: "center",
            cursor: "pointer", position: "relative",
          }}>
            <Bell size={12} color="#72727e" strokeWidth={1.5} />
            <div style={{
              position: "absolute", top: 6, right: 6, width: 5, height: 5,
              borderRadius: "50%", background: "#00c896",
              border: "1.5px solid #0c0c0f", boxShadow: "0 0 6px #00c896",
            }} />
          </div>
          <button className="w-full justify-center lg:w-auto" style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "7px 13px", borderRadius: 6, background: "#00c896",
            border: "none", color: "#000", fontFamily: "var(--font-figtree)",
            fontSize: 12.5, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 0 0 1px rgba(0,200,150,0.3), 0 4px 16px rgba(0,200,150,0.2)",
          }}>
            <Plus size={12} strokeWidth={2.5} /> Add Transaction
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-[10px]" style={{ marginBottom: 16 }}>
        {[
          { label: "INCOME", val: 4500, prefix: "$", color: "#00c896", delta: "+12%", sub: "vs FEB" },
          { label: "EXPENSES", val: 1536, prefix: "$", color: "#ff4455", delta: "−8%", sub: "vs FEB" },
          { label: "NET BALANCE", val: 2964, prefix: "$", color: "#f0f0f4", delta: null, sub: "after expenses" },
          { label: "TRANSACTIONS", val: 8, prefix: "", color: "#e8a000", delta: null, sub: "this month" },
        ].map((s, i) => (
          <div key={s.label} className="px-[14px] pt-3 pb-[14px] lg:px-[18px] lg:pt-4 lg:pb-[18px]" style={{
            background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.055)",
            borderRadius: 8,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontFamily: "var(--font-space-mono)", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#72727e" }}>{s.label}</span>
              {s.delta && (
                <span style={{
                  fontFamily: "var(--font-space-mono)", fontSize: 9.5,
                  display: "flex", alignItems: "center", gap: 2,
                  padding: "2px 6px", borderRadius: 3,
                  color: "#00c896", background: "rgba(0,200,150,0.12)",
                }}>{s.delta}</span>
              )}
            </div>
            <div className="text-[22px] lg:text-[28px]" style={{ fontFamily: "var(--font-space-mono)", fontWeight: 700, letterSpacing: "-1.5px", color: s.color, fontVariantNumeric: "tabular-nums" }}>
              <Count to={s.val} prefix={s.prefix} delay={i * 80} />
            </div>
            <div style={{ marginTop: 8, fontSize: 10.5, color: "#4a4a56" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ROW 1: donut + line chart */}
      <div className="mb-[10px] grid grid-cols-1 gap-[10px] lg:grid-cols-[1fr_1.8fr]">

        {/* DONUT */}
        <div style={panel}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <span style={{ fontFamily: "var(--font-syne)", fontSize: 13, fontWeight: 700, color: "#f0f0f4", letterSpacing: "-0.2px" }}>Spending Breakdown</span>
            <span style={{ fontSize: 11, color: "#50505c", cursor: "pointer", fontFamily: "var(--font-space-mono)", display: "flex", alignItems: "center", gap: 2 }}>all <ChevronRight size={10} /></span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
              <PieChart width={148} height={148}>
                <Pie data={pieData} cx={69} cy={69} innerRadius={48} outerRadius={70} paddingAngle={2} dataKey="value" strokeWidth={0}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
              </PieChart>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-space-mono)", fontSize: 17, fontWeight: 700, color: "#f0f0f4", letterSpacing: "-0.5px" }}>$1,536</div>
                <div style={{ fontSize: 9.5, color: "#363640", fontFamily: "var(--font-space-mono)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>TOTAL</div>
              </div>
            </div>
            <div style={{ width: "100%", marginTop: 16, display: "flex", flexDirection: "column", gap: 9 }}>
              {pieData.map((item) => (
                <div key={item.name} style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ fontSize: 11.5, color: "#888896", width: 78, display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 5, height: 5, borderRadius: 1, background: item.color, flexShrink: 0 }} />
                    {item.name}
                  </div>
                  <div style={{ flex: 1, height: 2, background: "#1a1a21", borderRadius: 1, margin: "0 10px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${item.pct}%`, background: item.color, borderRadius: 1 }} />
                  </div>
                  <div style={{ fontFamily: "var(--font-space-mono)", fontSize: 11, color: "#f0f0f4", width: 38, textAlign: "right" }}>${item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AREA CHART */}
        <div style={panel}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <span style={{ fontFamily: "var(--font-syne)", fontSize: 13, fontWeight: 700, color: "#f0f0f4", letterSpacing: "-0.2px" }}>6-Month Overview</span>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              {[{ color: "#00c896", label: "Income" }, { color: "#ff4455", label: "Expenses" }].map((l) => (
                <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#72727e", fontFamily: "var(--font-space-mono)", letterSpacing: "0.02em" }}>
                  <span style={{ width: 16, height: 1.5, background: l.color, borderRadius: 1, display: "inline-block" }} /> {l.label}
                </span>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={chartH}>
            <AreaChart data={trendData} margin={{ top: 4, right: 2, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="gi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00c896" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#00c896" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff4455" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#ff4455" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="m" tick={{ fill: "#363640", fontSize: 9, fontFamily: "Space Mono" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#363640", fontSize: 9, fontFamily: "Space Mono" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1, strokeDasharray: "3 3" }} />
              <Area type="monotone" dataKey="income" stroke="#00c896" strokeWidth={1.5} fill="url(#gi)" dot={{ r: 2.5, fill: "#00c896", strokeWidth: 0 }} activeDot={{ r: 3.5, strokeWidth: 0 }} name="Income" />
              <Area type="monotone" dataKey="expenses" stroke="#ff4455" strokeWidth={1.5} fill="url(#ge)" dot={{ r: 2.5, fill: "#ff4455", strokeWidth: 0 }} activeDot={{ r: 3.5, strokeWidth: 0 }} name="Expenses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ROW 2: transactions + budgets */}
      <div className="grid grid-cols-1 gap-[10px] lg:grid-cols-[1.7fr_1fr]">

        {/* TRANSACTIONS */}
        <div style={panel}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <span style={{ fontFamily: "var(--font-syne)", fontSize: 13, fontWeight: 700, color: "#f0f0f4", letterSpacing: "-0.2px" }}>Recent Transactions</span>
            <span style={{ fontSize: 11, color: "#50505c", cursor: "pointer", fontFamily: "var(--font-space-mono)", display: "flex", alignItems: "center", gap: 2 }}>view all <ChevronRight size={10} /></span>
          </div>
          <div>
            {txns.map((tx) => (
              <div key={tx.id} className="gap-2 lg:gap-3" style={{
                display: "flex", alignItems: "center",
                padding: "10px 8px", margin: "0 -8px",
                borderBottom: "1px solid rgba(255,255,255,0.055)",
                cursor: "default",
              }}>
                <div style={{ width: 2, height: 30, borderRadius: 1, background: tx.color, boxShadow: `0 0 6px ${tx.color}60`, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="text-xs lg:text-[13px]" style={{ fontWeight: 500, color: "#f0f0f4", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                    <span style={{ fontFamily: "var(--font-space-mono)", fontSize: 10, color: "#4a4a56" }}>{tx.date}</span>
                    <span className="hidden sm:inline-flex" style={{ fontSize: 9.5, padding: "1px 6px", borderRadius: 3, fontFamily: "var(--font-space-mono)", border: "1px solid rgba(255,255,255,0.055)", color: "#72727e" }}>{tx.cat}</span>
                  </div>
                </div>
                <div className="text-xs lg:text-[13px]" style={{
                  fontFamily: "var(--font-space-mono)", fontWeight: 700,
                  fontVariantNumeric: "tabular-nums", flexShrink: 0,
                  color: tx.type === "income" ? "#00c896" : "#f0f0f4",
                }}>
                  {tx.amount > 0 ? "+" : "−"}${Math.abs(tx.amount).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BUDGETS */}
        <div style={panel}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <span style={{ fontFamily: "var(--font-syne)", fontSize: 13, fontWeight: 700, color: "#f0f0f4", letterSpacing: "-0.2px" }}>Monthly Budgets</span>
            <span style={{ fontSize: 11, color: "#50505c", cursor: "pointer", fontFamily: "var(--font-space-mono)", display: "flex", alignItems: "center", gap: 2 }}>edit <ChevronRight size={10} /></span>
          </div>
          {budgets.map((b, i) => <BudgetBar key={b.name} {...b} idx={i} />)}

          {/* AI CARD */}
          <div style={{
            marginTop: 16, padding: "13px 15px",
            background: "#070708", borderRadius: 6,
            border: "1px solid rgba(0,200,150,0.25)",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: "#00c896", boxShadow: "0 0 8px #00c896" }} />
            <div style={{ fontFamily: "var(--font-space-mono)", fontSize: 8.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#00c896", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
              <Zap size={9} /> AI COPILOT
            </div>
            <div style={{ fontSize: 11.5, color: "#72727e", lineHeight: 1.55, fontWeight: 300 }}>
              Rent is maxed at 100%. Moving ~$150 from Shopping could unlock a new savings goal ahead of schedule.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}