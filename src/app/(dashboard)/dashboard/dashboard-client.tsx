"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell, Plus, ChevronRight, Zap, CreditCard, Target, PieChart as PieChartIcon
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, PieChart, Pie, Cell
} from "recharts";
import { useWindowWidth } from "@/lib/hooks/useWindowWidth";

const MONTH_NAMES = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

type DashboardClientProps = {
  month: number;
  year: number;
  userName: string;
  stats: {
    income: number;
    expenses: number;
    netBalance: number;
    txCount: number;
    incomeDelta: string;
    incomeDeltaDir: string;
    expensesDelta: string;
    expensesDeltaDir: string;
  };
  pieData: { name: string; value: number; pct: number; color: string }[];
  trendData: { m: string; income: number; expenses: number }[];
  recentTxns: { id: string; name: string; cat: string; amount: number; type: string; date: string; color: string }[];
  budgetProgress: { name: string; spent: number; limit: number; color: string }[];
  aiInsight: string;
  hasData: boolean;
};

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

function deltaColor(dir: string): { color: string; bg: string } {
  if (dir === "pos") return { color: "#00c896", bg: "rgba(0,200,150,0.12)" };
  if (dir === "neg") return { color: "#ff4455", bg: "rgba(255,68,85,0.1)" };
  return { color: "#72727e", bg: "rgba(255,255,255,0.04)" };
}

export default function DashboardClient(props: DashboardClientProps) {
  const isMobile = useWindowWidth() < 1024;
  const chartH = isMobile ? 180 : 218;

  const prevMonthName = MONTH_NAMES[(props.month - 2 + 12) % 12];
  const subtitle = `// ${MONTH_NAMES[props.month - 1]} ${props.year}`;

  const incomeDC = deltaColor(props.stats.incomeDeltaDir);
  const expenseDC = deltaColor(props.stats.expensesDeltaDir);

  const statsArr = [
    { type: "income", label: "INCOME", val: props.stats.income, prefix: "$", color: "#00c896", delta: props.stats.incomeDelta, deltaDir: props.stats.incomeDeltaDir, sub: `vs ${prevMonthName.slice(0, 3)}` },
    { type: "expense", label: "EXPENSES", val: props.stats.expenses, prefix: "$", color: "#ff4455", delta: props.stats.expensesDelta, deltaDir: props.stats.expensesDeltaDir, sub: `vs ${prevMonthName.slice(0, 3)}` },
    { type: "balance", label: "NET BALANCE", val: props.stats.netBalance, prefix: "$", color: "#f0f0f4", delta: null, deltaDir: null, sub: "after expenses" },
    { type: "txcount", label: "TRANSACTIONS", val: props.stats.txCount, prefix: "", color: "#e8a000", delta: null, deltaDir: null, sub: "this month" },
  ];

  return (
    <div style={{ width: "100%", maxWidth: 1100, padding: "32px 40px 48px", fontFamily: "var(--font-figtree), sans-serif" }}>

      {/* HEADER */}
      <div className="flex flex-col items-start lg:flex-row lg:items-end lg:justify-between" style={{
        paddingBottom: 24, marginBottom: 30,
        borderBottom: "1px solid rgba(255,255,255,0.055)",
        position: "relative",
      }}>
        <div style={{ position: "absolute", bottom: -1, left: 0, width: 48, height: 1, background: "#00c896", boxShadow: "0 0 8px #00c896" }} />
        <div>
          <div style={{ fontFamily: "var(--font-syne)", fontSize: 28, fontWeight: 800, letterSpacing: "-0.8px", color: "#f0f0f4", lineHeight: 1 }}>Dashboard</div>
          <div style={{ fontFamily: "var(--font-space-mono)", fontSize: 11, color: "#72727e", opacity: 0.75, marginTop: 5, letterSpacing: "0.06em" }}>{subtitle}</div>
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
          <Link href="/transactions" className="w-full justify-center lg:w-auto" style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "7px 13px", borderRadius: 6, background: "#00c896",
            border: "none", color: "#000", fontFamily: "var(--font-figtree)",
            fontSize: 12.5, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 0 0 1px rgba(0,200,150,0.3), 0 4px 16px rgba(0,200,150,0.2)",
            textDecoration: "none",
          }}>
            <Plus size={12} strokeWidth={2.5} /> Add Transaction
          </Link>
        </div>
      </div>

      {/* STATS */}
      <div className="stats grid grid-cols-2 gap-3 lg:grid-cols-4" style={{ marginBottom: 18 }}>
        {statsArr.map((s, i) => {
          const dc = s.deltaDir ? deltaColor(s.deltaDir) : null;
          return (
            <div key={s.label} className={`stat-card stat-${s.type}`} style={{
              background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.055)",
              borderRadius: 10,
              padding: "20px 22px 22px",
              position: "relative",
              overflow: "hidden",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span style={{ fontFamily: "var(--font-space-mono)", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--t2, #72727e)" }}>{s.label}</span>
                {s.delta && dc && (
                  <span style={{
                    fontFamily: "var(--font-space-mono)", fontSize: 9.5,
                    display: "flex", alignItems: "center", gap: 2,
                    padding: "2px 6px", borderRadius: 3,
                    color: dc.color, background: dc.bg,
                  }}>{s.delta}</span>
                )}
              </div>
              <div className="text-[22px] lg:text-[28px]" style={{ fontFamily: "var(--font-space-mono)", fontWeight: 700, letterSpacing: "-1.5px", color: s.color, fontVariantNumeric: "tabular-nums" }}>
                {props.hasData ? (
                  <Count to={s.val} prefix={s.prefix} delay={i * 80} />
                ) : (
                  <span>—</span>
                )}
              </div>
              <div style={{ marginTop: 12, fontSize: 10, color: "#4a4a56", fontFamily: "Space Mono, monospace", letterSpacing: "0.04em" }}>{s.sub}</div>
            </div>
          );
        })}
      </div>

      {/* ROW 1: donut + line chart */}
      <div className="mb-[10px] grid grid-cols-1 gap-[10px] lg:grid-cols-[1fr_1.8fr]">

        {/* DONUT */}
        <div style={panel}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <span style={{ fontFamily: "var(--font-syne)", fontSize: 13, fontWeight: 700, color: "#f0f0f4", letterSpacing: "-0.2px" }}>Spending Breakdown</span>
            <span style={{ fontSize: 11, color: "#50505c", cursor: "pointer", fontFamily: "var(--font-space-mono)", display: "flex", alignItems: "center", gap: 2 }}>all <ChevronRight size={10} /></span>
          </div>
          {props.pieData.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "30px 0", gap: 8 }}>
              <PieChartIcon size={28} color="#363640" strokeWidth={1.5} />
              <span style={{ fontFamily: "var(--font-figtree)", fontSize: 12, color: "#72727e" }}>No expense data yet</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
                <PieChart width={148} height={148}>
                  <Pie data={props.pieData} cx={69} cy={69} innerRadius={48} outerRadius={70} paddingAngle={2} dataKey="value" strokeWidth={0}>
                    {props.pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-space-mono)", fontSize: 17, fontWeight: 700, color: "#f0f0f4", letterSpacing: "-0.5px" }}>${props.stats.expenses.toLocaleString()}</div>
                  <div style={{ fontSize: 9.5, color: "#363640", fontFamily: "var(--font-space-mono)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>TOTAL</div>
                </div>
              </div>
              <div style={{ width: "100%", marginTop: 16, display: "flex", flexDirection: "column", gap: 9 }}>
                {props.pieData.map((item) => (
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
          )}
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
            <AreaChart data={props.trendData} margin={{ top: 4, right: 2, left: -22, bottom: 0 }}>
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
            <Link href="/transactions" style={{ fontSize: 11, color: "#50505c", cursor: "pointer", fontFamily: "var(--font-space-mono)", display: "flex", alignItems: "center", gap: 2, textDecoration: "none" }}>view all <ChevronRight size={10} /></Link>
          </div>
          {props.recentTxns.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "30px 0", gap: 8 }}>
              <CreditCard size={28} color="#363640" strokeWidth={1.5} />
              <span style={{ fontFamily: "var(--font-figtree)", fontSize: 12, color: "#72727e" }}>No transactions this month</span>
            </div>
          ) : (
            <div>
              {props.recentTxns.map((tx) => (
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
          )}
        </div>

        {/* BUDGETS */}
        <div style={panel}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <span style={{ fontFamily: "var(--font-syne)", fontSize: 13, fontWeight: 700, color: "#f0f0f4", letterSpacing: "-0.2px" }}>Monthly Budgets</span>
            <Link href="/budgets" style={{ fontSize: 11, color: "#50505c", cursor: "pointer", fontFamily: "var(--font-space-mono)", display: "flex", alignItems: "center", gap: 2, textDecoration: "none" }}>edit <ChevronRight size={10} /></Link>
          </div>
          {props.budgetProgress.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "30px 0", gap: 8 }}>
              <Target size={28} color="#363640" strokeWidth={1.5} />
              <span style={{ fontFamily: "var(--font-figtree)", fontSize: 12, color: "#72727e" }}>No budgets set for this month</span>
            </div>
          ) : (
            <>
              {props.budgetProgress.map((b, i) => <BudgetBar key={b.name} {...b} idx={i} />)}
            </>
          )}

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
              {props.aiInsight}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .stat-card::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
          opacity: 0;
          transition: opacity 0.2s ease;
          pointer-events: none;
        }

        .stat-card:hover::after {
          opacity: 1;
        }

        .stat-income::after {
          background: linear-gradient(90deg, #00c896, transparent);
        }

        .stat-expense::after {
          background: linear-gradient(90deg, #ff4455, transparent);
        }

        .stat-balance::after {
          background: linear-gradient(90deg, #9d7fea, transparent);
        }

        .stat-txcount::after {
          background: linear-gradient(90deg, #e8a000, transparent);
        }
      `}</style>
    </div>
  );
}
