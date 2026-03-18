"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate as fmAnimate } from "framer-motion";
import confetti from "canvas-confetti";
import {
  ResponsiveContainer, ComposedChart, Area, XAxis, YAxis,
  Tooltip, ReferenceLine, Line,
} from "recharts";
import {
  Scissors, TrendingUp, CreditCard, AlertTriangle,
  ChevronLeft, Zap, Target,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

type Phase = "select" | "simulate";
type ScenarioType = "cut_category" | "boost_savings" | "pay_off_debt" | "income_drop";

interface ProjectionPoint { month: number; label: string; baseline: number; scenario: number; }

interface DerivedMetrics {
  baselineGoalMonth: number | null; scenarioGoalMonth: number | null;
  monthsDelta: number | null; monthlyCashFlowDelta: number;
  annualSavingsDelta: number; adjustedMonthlySavings: number;
  debtPayoffMonth: number | null;
}

interface GoalData {
  id: string; name: string; targetAmount: number; currentAmount: number;
  deadline: string; color: string | null; monthsToGoal: number | null;
}

interface BaselineData {
  monthlyIncome: number; monthlyExpenses: number; monthlySavings: number;
  savingsRate: number; categorySpend: Record<string, number>;
  threeMonthAvgByCategory: Record<string, number>;
  goals: GoalData[]; currency: string;
}

interface ScenarioParams {
  category?: string; cutAmount?: number; extraSavings?: number;
  debtAmount?: number; monthlyPayment?: number; dropPercent?: number;
}

interface SavedScenario {
  id: string; label: string; scenario: ScenarioType; params: ScenarioParams;
  projectionData: ProjectionPoint[]; metrics: DerivedMetrics; color: string;
}

// ── Animation constants ──────────────────────────────────────────────

const EASE = [0.4, 0, 0.2, 1] as const;

const fadeUp = {
  initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 }, transition: { duration: 0.3, ease: EASE },
};
const fadeIn = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.25 } };
const scaleIn = {
  initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.25, ease: EASE },
};
const staggerContainer = { animate: { transition: { staggerChildren: 0.07 } } };
const cardHover = { whileHover: { scale: 1.015, transition: { duration: 0.15 } }, whileTap: { scale: 0.98 } };

// ── Scenario metadata ────────────────────────────────────────────────

const SCENARIO_META: Record<ScenarioType, { icon: typeof Scissors; title: string; accent: string }> = {
  cut_category: { icon: Scissors, title: "Cut a Category", accent: "#00c896" },
  boost_savings: { icon: TrendingUp, title: "Boost Savings", accent: "#00c896" },
  pay_off_debt: { icon: CreditCard, title: "Pay Off Debt", accent: "#e8a000" },
  income_drop: { icon: AlertTriangle, title: "Income Drop", accent: "#ff4455" },
};

const SPARKLINE_DATA: Record<ScenarioType, { baseline: number; scenario: number }[]> = {
  cut_category: [{ baseline: 50, scenario: 50 }, { baseline: 55, scenario: 60 }, { baseline: 58, scenario: 72 }, { baseline: 60, scenario: 85 }, { baseline: 62, scenario: 95 }],
  boost_savings: [{ baseline: 30, scenario: 30 }, { baseline: 40, scenario: 48 }, { baseline: 50, scenario: 68 }, { baseline: 60, scenario: 85 }, { baseline: 65, scenario: 100 }],
  pay_off_debt: [{ baseline: 100, scenario: 100 }, { baseline: 90, scenario: 78 }, { baseline: 80, scenario: 50 }, { baseline: 75, scenario: 20 }, { baseline: 70, scenario: 0 }],
  income_drop: [{ baseline: 80, scenario: 80 }, { baseline: 85, scenario: 65 }, { baseline: 88, scenario: 48 }, { baseline: 90, scenario: 35 }, { baseline: 92, scenario: 25 }],
};

const SAVED_COLORS = ["#9d7fea", "#4d9fff", "#e8a000"];

// ── Format helpers ───────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtSigned(n: number): string {
  return `${n >= 0 ? "+" : ""}$${fmt(Math.abs(n))}`;
}

// ── Custom Slider ────────────────────────────────────────────────────

function CustomSlider({ value, onChange, min, max, step, color = "#00c896", label, displayFormat }: {
  value: number; onChange: (v: number) => void; min: number; max: number;
  step: number; color?: string; label: string; displayFormat?: (v: number) => string;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const fmtFn = displayFormat ?? ((v: number) => `$${v.toLocaleString()}`);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontFamily: "Figtree,sans-serif", fontSize: 13, color: "#72727e" }}>{label}</span>
        <motion.span key={value} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}
          style={{ fontFamily: "Space Mono,monospace", fontSize: 14, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>
          {fmtFn(value)}
        </motion.span>
      </div>
      <div style={{ position: "relative", height: 36, display: "flex", alignItems: "center" }}>
        <div style={{ width: "100%", height: 3, background: "#1e1e26", borderRadius: 2, position: "relative" }}>
          <div style={{ position: "absolute", left: 0, height: "100%", width: `${pct}%`, background: color, borderRadius: 2, boxShadow: `0 0 8px ${color}60`, transition: "width 0.05s" }} />
        </div>
        <div style={{
          position: "absolute", left: `${pct}%`, top: "50%", transform: "translate(-50%,-50%)",
          width: 14, height: 14, borderRadius: "50%", background: color,
          boxShadow: `0 0 0 3px ${color}22, 0 0 12px ${color}60`, pointerEvents: "none", transition: "left 0.05s",
        }} />
        <input type="range" value={value} min={min} max={max} step={step}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", margin: 0, WebkitAppearance: "none" }} />
      </div>
    </div>
  );
}

// ── Custom Tooltip ───────────────────────────────────────────────────

function CustomSimulatorTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#131318", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "10px 13px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
      <div style={{ fontFamily: "Space Mono,monospace", fontSize: 9, color: "#363640", marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <div style={{ width: 8, height: 2, background: p.name === "baseline" ? "rgba(255,255,255,0.18)" : p.color || "#00c896", borderRadius: 1 }} />
          <span style={{ fontFamily: "Figtree,sans-serif", fontSize: 11, color: "#72727e", textTransform: "capitalize" }}>{p.name}:</span>
          <span style={{ fontFamily: "Space Mono,monospace", fontSize: 11, color: "#f0f0f4", fontVariantNumeric: "tabular-nums" }}>${fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Animated Counter ─────────────────────────────────────────────────

function AnimatedCounter({ value, color }: { value: number | null; color: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, v => Math.round(v));
  const [display, setDisplay] = useState(value ?? 0);
  useEffect(() => {
    if (value !== null) {
      const controls = fmAnimate(count, value, { duration: 0.8, ease: EASE as unknown as [number,number,number,number] });
      return controls.stop;
    }
  }, [value, count]);
  useEffect(() => rounded.on("change", v => setDisplay(v)), [rounded]);
  if (value === null) return <span style={{ fontFamily: "Space Mono,monospace", fontSize: 24, fontWeight: 700, color: "#72727e" }}>—</span>;
  return <span style={{ fontFamily: "Space Mono,monospace", fontSize: 24, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{display}</span>;
}

// ── Main Page Component ──────────────────────────────────────────────

export default function SimulatorPage() {
  const [baseline, setBaseline] = useState<BaselineData | null>(null);
  const [baselineLoading, setBaselineLoading] = useState(true);
  const [baselineError, setBaselineError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("select");
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [params, setParams] = useState<ScenarioParams>({});
  const [projectionData, setProjectionData] = useState<ProjectionPoint[] | null>(null);
  const [metrics, setMetrics] = useState<DerivedMetrics | null>(null);
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [realityCheckMode, setRealityCheckMode] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<ScenarioType | null>(null);
  const confettiFired = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch baseline ─────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/simulator")
      .then(r => { if (!r.ok) throw new Error("Failed to load"); return r.json(); })
      .then(data => { setBaseline(data); setBaselineLoading(false); })
      .catch(err => { setBaselineError(err.message); setBaselineLoading(false); });
  }, []);

  // ── Run scenario (debounced) ───────────────────────────────────────

  const runScenario = useCallback(() => {
    if (!selectedScenario || !baseline) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      setCalculating(true); setAiSummary(""); setAiLoading(true);
      try {
        const res = await fetch("/api/simulator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scenario: selectedScenario, params, goalId: selectedGoalId, messages: [] }),
        });
        if (!res.ok || !res.body) { setCalculating(false); setAiLoading(false); return; }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = ""; let mathParsed = false; let summaryText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (value) buffer += decoder.decode(value, { stream: true });
          if (!mathParsed && buffer.includes("\n")) {
            const idx = buffer.indexOf("\n");
            const jsonLine = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            try {
              const md = JSON.parse(jsonLine);
              setProjectionData(md.projectionData);
              setMetrics({
                baselineGoalMonth: md.baselineGoalMonth, scenarioGoalMonth: md.scenarioGoalMonth,
                monthsDelta: md.monthsDelta, monthlyCashFlowDelta: md.monthlyCashFlowDelta,
                annualSavingsDelta: md.annualSavingsDelta, adjustedMonthlySavings: md.adjustedMonthlySavings,
                debtPayoffMonth: md.debtPayoffMonth,
              });
              setCalculating(false);
              if (md.scenarioGoalMonth !== null && md.scenarioGoalMonth <= 12 && !confettiFired.current) {
                confettiFired.current = true; triggerConfetti();
              }
            } catch { /* ignore parse errors */ }
            mathParsed = true;
          }
          if (mathParsed && buffer.length > 0) {
            summaryText += buffer; buffer = "";
            setAiSummary(summaryText);
          }
          if (done) { setAiLoading(false); break; }
        }
      } catch { setCalculating(false); setAiLoading(false); }
    }, 400);
  }, [selectedScenario, params, selectedGoalId, baseline]);

  function triggerConfetti() {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.3 }, colors: ["#00c896", "#9d7fea", "#4d9fff", "#e8a000", "#f0f0f4"], ticks: 200, gravity: 0.8, scalar: 1.1, shapes: ["square", "circle"] });
    setTimeout(() => { confetti({ particleCount: 60, spread: 120, origin: { y: 0.4 }, colors: ["#00c896", "#9d7fea"], ticks: 150 }); }, 400);
  }

  function handleSelectScenario(sc: ScenarioType) {
    setSelectedScenario(sc);
    confettiFired.current = false;
    const topCat = baseline ? Object.entries(baseline.categorySpend).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "" : "";
    const defaults: Record<ScenarioType, ScenarioParams> = {
      cut_category: { category: topCat, cutAmount: 50 },
      boost_savings: { extraSavings: 200 },
      pay_off_debt: { debtAmount: 5000, monthlyPayment: 300 },
      income_drop: { dropPercent: 20 },
    };
    setParams(defaults[sc]);
    setPhase("simulate");
    setTimeout(() => runScenario(), 100);
  }

  function handleParamChange(newParams: ScenarioParams) {
    setParams(newParams);
  }

  useEffect(() => {
    if (phase === "simulate" && selectedScenario) runScenario();
  }, [params, selectedGoalId, phase, selectedScenario, runScenario]);

  function saveScenario() {
    if (!projectionData || !metrics || !selectedScenario) return;
    const newSaved: SavedScenario = {
      id: Date.now().toString(), label: SCENARIO_META[selectedScenario].title,
      scenario: selectedScenario, params: { ...params },
      projectionData: [...projectionData], metrics: { ...metrics },
      color: SAVED_COLORS[savedScenarios.length % 3],
    };
    setSavedScenarios(prev => prev.length >= 3 ? [...prev.slice(1), newSaved] : [...prev, newSaved]);
  }

  // ── Build chart data with saved scenarios ──────────────────────────

  const chartData = projectionData?.map((p, i) => {
    const row: Record<string, number | string> = { ...p };
    if (compareMode) {
      savedScenarios.forEach((s, si) => { row[`saved_${si}`] = s.projectionData[i]?.scenario ?? 0; });
    }
    if (realityCheckMode && baseline) {
      const avgExpenses = Object.values(baseline.threeMonthAvgByCategory).reduce((a, b) => a + b, 0);
      const avgSavings = baseline.monthlyIncome - avgExpenses;
      const startAmt = selectedGoalId ? (baseline.goals.find(g => g.id === selectedGoalId)?.currentAmount ?? 0) : 0;
      row.reality = Math.round((startAmt + avgSavings * i) * 100) / 100;
    }
    return row;
  });

  const selectedGoal = baseline?.goals.find(g => g.id === selectedGoalId);
  const goalTarget = selectedGoal?.targetAmount ?? null;

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "32px 24px 0", maxWidth: 900, margin: "0 auto", fontFamily: "Figtree,sans-serif" }}>
      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes shimmer { 0% { background-position:200% 0 } 100% { background-position:-200% 0 } }
        input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance:none; margin:0; }
        input[type="number"] { -moz-appearance:textfield; }
        .sim-scroll::-webkit-scrollbar { display:none; }
        .sim-scroll { scrollbar-width:none; }
        @media (max-width:639px) {
          .sim-preset-grid { grid-template-columns:1fr !important; }
          .sim-metric-grid { grid-template-columns:repeat(2,1fr) !important; }
          .sim-baseline-strip { flex-direction:column !important; }
          .sim-sparkline { display:none !important; }
          .sim-debt-row { flex-direction:column !important; }
          .sim-header-row { flex-wrap:wrap !important; }
        }
      `}</style>

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <motion.div {...fadeUp}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", paddingBottom: 22, marginBottom: 26, borderBottom: "1px solid #1e1e26", position: "relative" }}>
          <div style={{ position: "absolute", bottom: -1, left: 0, width: 48, height: 1, background: "#00c896", boxShadow: "0 0 8px #00c896" }} />
          <div>
            <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: "-0.8px", color: "#f0f0f4", margin: 0, lineHeight: 1 }}>What-If Simulator</h1>
            <p style={{ fontFamily: "Space Mono,monospace", fontSize: 12, color: "#363640", marginTop: 5, letterSpacing: "0.02em" }}>// MODEL YOUR FINANCIAL FUTURE</p>
          </div>
        </div>
      </motion.div>

      {/* ── Baseline Strip ──────────────────────────────────────────── */}
      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
        <div className="sim-baseline-strip" style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          {baselineLoading ? (
            [0, 1, 2].map(i => (
              <div key={i} style={{ flex: 1, height: 70, background: "linear-gradient(90deg,#0c0c0f,#131318,#0c0c0f)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: 8, border: "1px solid #1e1e26" }} />
            ))
          ) : baseline ? (
            [
              { label: "MONTHLY INCOME", value: baseline.monthlyIncome, color: "#00c896" },
              { label: "MONTHLY EXPENSES", value: baseline.monthlyExpenses, color: "#ff4455" },
              { label: "MONTHLY SAVINGS", value: baseline.monthlySavings, color: baseline.monthlySavings >= 0 ? "#00c896" : "#ff4455" },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, background: "#0c0c0f", border: "1px solid #1e1e26", borderRadius: 8, padding: "12px 18px", display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontFamily: "Space Mono,monospace", fontSize: 9, textTransform: "uppercase", color: "#363640", letterSpacing: "0.12em" }}>{s.label}</span>
                <span style={{ fontFamily: "Space Mono,monospace", fontSize: 22, fontWeight: 700, color: s.color, fontVariantNumeric: "tabular-nums" }}>${fmt(s.value)}</span>
              </div>
            ))
          ) : null}
        </div>
      </motion.div>

      {/* ── Error State ─────────────────────────────────────────────── */}
      {baselineError && (
        <motion.div {...fadeIn} style={{ background: "#0c0c0f", border: "1px solid rgba(255,68,85,0.3)", borderRadius: 12, padding: 32, textAlign: "center" }}>
          <AlertTriangle size={32} color="#ff4455" strokeWidth={1.5} style={{ marginBottom: 12 }} />
          <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 16, color: "#f0f0f4" }}>Could not load your financial data</div>
          <div style={{ fontFamily: "Figtree,sans-serif", fontSize: 13, color: "#72727e", marginTop: 4 }}>{baselineError}</div>
          <button onClick={() => { setBaselineError(null); setBaselineLoading(true); fetch("/api/simulator").then(r => r.json()).then(d => { setBaseline(d); setBaselineLoading(false); }).catch(e => { setBaselineError(e.message); setBaselineLoading(false); }); }}
            style={{ marginTop: 20, padding: "8px 20px", background: "#00c896", border: "none", borderRadius: 8, color: "#000", fontFamily: "Figtree,sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Retry
          </button>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {/* ── PHASE A — Scenario Selection ─────────────────────────── */}
        {phase === "select" && !baselineError && (
          <motion.div key="select" {...fadeUp}>
            {/* Goal selector */}
            {baseline && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: "Figtree,sans-serif", fontSize: 12, color: "#72727e", marginBottom: 10 }}>Projecting against:</div>
                <div className="sim-scroll" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
                  <button onClick={() => setSelectedGoalId(null)}
                    style={{ padding: "7px 14px", borderRadius: 20, border: `1px solid ${selectedGoalId === null ? "rgba(0,200,150,0.5)" : "#1e1e26"}`, background: selectedGoalId === null ? "rgba(0,200,150,0.08)" : "#0c0c0f", color: selectedGoalId === null ? "#00c896" : "#72727e", fontFamily: "Figtree,sans-serif", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                    Net Savings (no goal)
                  </button>
                  {baseline.goals.map(g => {
                    const active = selectedGoalId === g.id;
                    const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
                    return (
                      <button key={g.id} onClick={() => setSelectedGoalId(g.id)}
                        style={{ padding: "7px 14px", borderRadius: 20, border: `1px solid ${active ? "rgba(0,200,150,0.5)" : "#1e1e26"}`, background: active ? "rgba(0,200,150,0.08)" : "#0c0c0f", color: active ? "#00c896" : "#72727e", fontFamily: "Figtree,sans-serif", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", flexShrink: 0 }}>
                        {g.name}
                        <span style={{ fontFamily: "Space Mono,monospace", fontSize: 11, fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Preset Cards */}
            {baselineLoading ? (
              <div className="sim-preset-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16, marginTop: 24 }}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} style={{ height: 160, borderRadius: 16, background: "linear-gradient(90deg,#0c0c0f,#131318,#0c0c0f)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
                ))}
              </div>
            ) : baseline ? (
              <motion.div className="sim-preset-grid" variants={staggerContainer} initial="initial" animate="animate" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16, marginTop: 24 }}>
                {(["cut_category", "boost_savings", "pay_off_debt", "income_drop"] as ScenarioType[]).map(sc => {
                  const meta = SCENARIO_META[sc];
                  const Icon = meta.icon;
                  const hovered = hoveredCard === sc;

                  let hookText = "";
                  if (sc === "cut_category") {
                    const top = Object.entries(baseline.categorySpend).sort((a, b) => b[1] - a[1])[0];
                    hookText = top ? `Cutting $${fmt(top[1])}/mo from ${top[0]} saves $${fmt(top[1] * 12)}/yr` : "Reduce spending in any category to free up cash";
                  } else if (sc === "boost_savings") {
                    hookText = baseline.goals.length > 0 ? "Add extra monthly savings to reach your goals faster" : "Add extra monthly savings to build wealth faster";
                  } else if (sc === "pay_off_debt") {
                    hookText = "At $300/mo, a $5,000 debt is cleared in 17 months";
                  } else {
                    const drop20 = baseline.monthlyIncome * 0.2;
                    hookText = `A 20% drop cuts $${fmt(drop20)}/mo — see how long your savings last`;
                  }

                  return (
                    <motion.div key={sc} variants={fadeUp} {...cardHover}
                      onMouseEnter={() => setHoveredCard(sc)} onMouseLeave={() => setHoveredCard(null)}
                      onClick={() => handleSelectScenario(sc)}
                      style={{
                        position: "relative", overflow: "hidden", background: "#0c0c0f",
                        border: `1px solid ${hovered ? meta.accent : "#1e1e26"}`, borderRadius: 16,
                        padding: 24, cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s",
                        boxShadow: hovered ? `0 0 24px ${meta.accent}1a` : "none",
                      }}>
                      {/* Hover glow */}
                      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at top right, ${meta.accent}0f, transparent 70%)`, opacity: hovered ? 1 : 0, transition: "opacity 0.2s", pointerEvents: "none" }} />
                      {/* Top row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, position: "relative" }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${meta.accent}1f`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Icon size={16} color={meta.accent} strokeWidth={1.5} />
                        </div>
                        <div className="sim-sparkline" style={{ width: 80, height: 44 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={SPARKLINE_DATA[sc]}>
                              <Line type="monotone" dataKey="baseline" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} dot={false} isAnimationActive animationDuration={800} />
                              <Line type="monotone" dataKey="scenario" stroke={meta.accent} strokeWidth={2} dot={false} isAnimationActive animationDuration={800} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      {/* Bottom */}
                      <div style={{ position: "relative" }}>
                        <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 16, color: "#f0f0f4", marginBottom: 6 }}>{meta.title}</div>
                        <div style={{ fontFamily: "Figtree,sans-serif", fontWeight: 300, fontSize: 13, color: "#72727e", lineHeight: 1.4 }}>{hookText}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : null}
          </motion.div>
        )}

        {/* ── PHASE B — Simulator View ────────────────────────────── */}
        {phase === "simulate" && selectedScenario && (
          <motion.div key="simulate" {...fadeUp}>
            {/* Simulator header */}
            <div className="sim-header-row" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <motion.button whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}
                onClick={() => { setPhase("select"); setProjectionData(null); setMetrics(null); setAiSummary(""); }}
                style={{ background: "#0c0c0f", border: "1px solid #1e1e26", borderRadius: 8, padding: "7px 10px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                <ChevronLeft size={16} color="#72727e" strokeWidth={1.5} />
              </motion.button>
              <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 20, color: "#f0f0f4", flex: 1 }}>{SCENARIO_META[selectedScenario].title}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <motion.button whileHover={{ borderColor: "#00c896", backgroundColor: "rgba(0,200,150,0.06)" }} whileTap={{ scale: 0.95 }}
                  onClick={saveScenario} disabled={!projectionData}
                  style={{ background: "transparent", border: "1px solid rgba(0,200,150,0.4)", color: "#00c896", borderRadius: 8, padding: "7px 14px", fontFamily: "Figtree,sans-serif", fontWeight: 600, fontSize: 13, cursor: projectionData ? "pointer" : "default", opacity: projectionData ? 1 : 0.4 }}>
                  Save Scenario
                </motion.button>
                {savedScenarios.length > 0 && (
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => setCompareMode(p => !p)}
                    style={{ background: compareMode ? "rgba(0,200,150,0.1)" : "#0c0c0f", border: `1px solid ${compareMode ? "rgba(0,200,150,0.4)" : "#1e1e26"}`, color: compareMode ? "#00c896" : "#72727e", borderRadius: 8, padding: "7px 14px", fontFamily: "Figtree,sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                    Compare
                  </motion.button>
                )}
              </div>
            </div>

            {/* Metric strip */}
            <motion.div className="sim-metric-grid" variants={staggerContainer} initial="initial" animate="animate"
              style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
              {/* Card 1 — Goal Completion */}
              <motion.div variants={fadeUp} style={{ background: "#0c0c0f", border: "1px solid #1e1e26", borderRadius: 8, padding: "16px 18px 18px", position: "relative", overflow: "hidden" }}>
                <div style={{ fontFamily: "Space Mono,monospace", fontSize: 9, textTransform: "uppercase", color: "#363640", letterSpacing: "0.12em", marginBottom: 6 }}>GOAL COMPLETION</div>
                {calculating ? (
                  <div style={{ height: 28, width: "60%", background: "#131318", borderRadius: 4, animation: "pulse 1.5s ease-in-out infinite" }} />
                ) : metrics?.scenarioGoalMonth !== null && metrics?.scenarioGoalMonth !== undefined ? (
                  <motion.div key={metrics.scenarioGoalMonth} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                    <span style={{ fontFamily: "Space Mono,monospace", fontSize: 24, fontWeight: 700, color: "#00c896", fontVariantNumeric: "tabular-nums" }}>Month {metrics.scenarioGoalMonth}</span>
                  </motion.div>
                ) : (
                  <span style={{ fontFamily: "Space Mono,monospace", fontSize: 22, color: "#72727e" }}>&gt; 12 months</span>
                )}
                {metrics?.monthsDelta !== null && metrics?.monthsDelta !== undefined && !calculating && (
                  <motion.span key={metrics.monthsDelta} {...fadeIn} style={{
                    position: "absolute", top: 12, right: 12, fontFamily: "Space Mono,monospace", fontSize: 9, padding: "2px 7px", borderRadius: 4, fontVariantNumeric: "tabular-nums",
                    background: metrics.monthsDelta > 0 ? "rgba(0,200,150,0.12)" : "rgba(255,68,85,0.1)", color: metrics.monthsDelta > 0 ? "#00c896" : "#ff4455",
                  }}>{metrics.monthsDelta > 0 ? `+${metrics.monthsDelta} mo faster` : `${metrics.monthsDelta} mo slower`}</motion.span>
                )}
              </motion.div>
              {/* Card 2 — Cash Flow */}
              <motion.div variants={fadeUp} style={{ background: "#0c0c0f", border: "1px solid #1e1e26", borderRadius: 8, padding: "16px 18px 18px" }}>
                <div style={{ fontFamily: "Space Mono,monospace", fontSize: 9, textTransform: "uppercase", color: "#363640", letterSpacing: "0.12em", marginBottom: 6 }}>CASH FLOW CHANGE</div>
                {calculating ? <div style={{ height: 28, width: "50%", background: "#131318", borderRadius: 4, animation: "pulse 1.5s ease-in-out infinite" }} />
                 : <div><span style={{ fontFamily: "Space Mono,monospace", fontSize: 24, fontWeight: 700, color: (metrics?.monthlyCashFlowDelta ?? 0) >= 0 ? "#00c896" : "#ff4455", fontVariantNumeric: "tabular-nums" }}>{fmtSigned(metrics?.monthlyCashFlowDelta ?? 0)}</span></div>}
                <div style={{ fontFamily: "Figtree,sans-serif", fontSize: 11, color: "#363640", marginTop: 2 }}>per month</div>
              </motion.div>
              {/* Card 3 — Annual Impact */}
              <motion.div variants={fadeUp} style={{ background: "#0c0c0f", border: "1px solid #1e1e26", borderRadius: 8, padding: "16px 18px 18px" }}>
                <div style={{ fontFamily: "Space Mono,monospace", fontSize: 9, textTransform: "uppercase", color: "#363640", letterSpacing: "0.12em", marginBottom: 6 }}>ANNUAL IMPACT</div>
                {calculating ? <div style={{ height: 28, width: "55%", background: "#131318", borderRadius: 4, animation: "pulse 1.5s ease-in-out infinite" }} />
                 : <div><span style={{ fontFamily: "Space Mono,monospace", fontSize: 24, fontWeight: 700, color: (metrics?.annualSavingsDelta ?? 0) >= 0 ? "#00c896" : "#ff4455", fontVariantNumeric: "tabular-nums" }}>{fmtSigned(metrics?.annualSavingsDelta ?? 0)}</span></div>}
                <div style={{ fontFamily: "Figtree,sans-serif", fontSize: 11, color: "#363640", marginTop: 2 }}>over 12 months</div>
              </motion.div>
              {/* Card 4 — Months to Goal */}
              <motion.div variants={fadeUp} style={{ background: "#0c0c0f", border: "1px solid #1e1e26", borderRadius: 8, padding: "16px 18px 18px" }}>
                <div style={{ fontFamily: "Space Mono,monospace", fontSize: 9, textTransform: "uppercase", color: "#363640", letterSpacing: "0.12em", marginBottom: 6 }}>MONTHS TO GOAL</div>
                {calculating ? <div style={{ height: 28, width: "40%", background: "#131318", borderRadius: 4, animation: "pulse 1.5s ease-in-out infinite" }} />
                 : <AnimatedCounter value={metrics?.scenarioGoalMonth ?? null} color={
                    (metrics?.scenarioGoalMonth ?? 99) <= 12 ? "#00c896" : (metrics?.scenarioGoalMonth ?? 99) <= 24 ? "#e8a000" : "#ff4455"
                  } />}
              </motion.div>
            </motion.div>

            {/* ── Hero Chart ──────────────────────────────────────────── */}
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }}
              style={{ background: "#0c0c0f", border: "1px solid #1e1e26", borderRadius: 12, padding: "20px 20px 10px", marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 600, fontSize: 13, color: "#f0f0f4" }}>12-Month Projection</div>
                  <div style={{ fontFamily: "Figtree,sans-serif", fontSize: 11, color: "#72727e" }}>Baseline vs {SCENARIO_META[selectedScenario].title}</div>
                </div>
                {/* Reality Check toggle */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "Figtree,sans-serif", fontSize: 12, color: "#72727e" }}>Reality Check</span>
                  <div onClick={() => setRealityCheckMode(p => !p)} style={{ width: 36, height: 20, borderRadius: 10, background: realityCheckMode ? "rgba(0,200,150,0.2)" : "#1e1e26", border: `1px solid ${realityCheckMode ? "rgba(0,200,150,0.4)" : "#1e1e26"}`, cursor: "pointer", position: "relative", transition: "all 0.2s" }}>
                    <motion.div animate={{ x: realityCheckMode ? 17 : 3 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} style={{ width: 14, height: 14, borderRadius: "50%", background: "#f0f0f4", position: "absolute", top: 2 }} />
                  </div>
                </div>
                {/* Legend */}
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 16, height: 2, background: "rgba(255,255,255,0.18)", borderRadius: 1, borderTop: "1px dashed rgba(255,255,255,0.3)" }} />
                    <span style={{ fontFamily: "Space Mono,monospace", fontSize: 11, color: "#72727e" }}>Current path</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 16, height: 2, background: "#00c896", borderRadius: 1 }} />
                    <span style={{ fontFamily: "Space Mono,monospace", fontSize: 11, color: "#72727e" }}>Scenario</span>
                  </div>
                  {compareMode && savedScenarios.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 16, height: 2, background: s.color, borderRadius: 1 }} />
                      <span style={{ fontFamily: "Space Mono,monospace", fontSize: 11, color: "#72727e" }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chartData ?? []} margin={{ top: 4, right: 16, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scenarioGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00c896" stopOpacity={0.14} />
                      <stop offset="100%" stopColor="#00c896" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="baselineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity={0.04} />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                    {savedScenarios.map((s, i) => (
                      <linearGradient key={i} id={`savedGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.color} stopOpacity={0.08} />
                        <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis dataKey="label" tick={{ fill: "#363640", fontSize: 9, fontFamily: "Space Mono" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#363640", fontSize: 9, fontFamily: "Space Mono" }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`} />
                  <Tooltip content={<CustomSimulatorTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1, strokeDasharray: "3 3" }} />
                  <ReferenceLine x="NOW" stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" label={{ value: "TODAY", fill: "#363640", fontSize: 8, fontFamily: "Space Mono", position: "insideTopRight" }} />
                  {goalTarget !== null && (
                    <ReferenceLine y={goalTarget} stroke="rgba(0,200,150,0.25)" strokeDasharray="4 4" label={{ value: "GOAL TARGET", fill: "#00c896", fontSize: 8, fontFamily: "Space Mono", position: "insideTopRight" }} />
                  )}
                  <Area dataKey="baseline" type="monotone" stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} strokeDasharray="5 4" fill="url(#baselineGrad)" dot={false} activeDot={false} isAnimationActive animationDuration={600} animationEasing="ease-out" name="baseline" />
                  <Area dataKey="scenario" type="monotone" stroke="#00c896" strokeWidth={2.5} fill="url(#scenarioGrad)" dot={false} activeDot={{ r: 4, fill: "#00c896", strokeWidth: 0, style: { filter: "drop-shadow(0 0 4px #00c896)" } }} isAnimationActive animationDuration={700} animationEasing="ease-out" name="scenario" />
                  {compareMode && savedScenarios.map((s, i) => (
                    <Line key={i} dataKey={`saved_${i}`} type="monotone" stroke={s.color} strokeWidth={1.5} strokeOpacity={0.6} strokeDasharray="3 3" dot={false} fill="none" isAnimationActive animationDuration={500} name={s.label} />
                  ))}
                  {realityCheckMode && <Line dataKey="reality" type="monotone" stroke="#e8a000" strokeWidth={1.5} strokeDasharray="2 3" dot={false} name="actual avg" isAnimationActive animationDuration={500} />}
                </ComposedChart>
              </ResponsiveContainer>
              {/* Compare legend */}
              {compareMode && savedScenarios.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  {savedScenarios.map((s, i) => (
                    <motion.div key={s.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      style={{ background: "#0c0c0f", border: "1px solid #1e1e26", borderRadius: 20, padding: "5px 10px", display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontFamily: "Figtree,sans-serif", color: "#72727e" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
                      {s.label}
                      <button onClick={() => setSavedScenarios(prev => prev.filter((_, idx) => idx !== i))}
                        style={{ background: "none", border: "none", color: "#72727e", cursor: "pointer", padding: 0, display: "flex" }}>×</button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* ── Controls Panel ───────────────────────────────────────── */}
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }}
              style={{ background: "#0c0c0f", border: "1px solid #1e1e26", borderRadius: 12, padding: "22px 24px", marginBottom: 12 }}>
              <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 600, fontSize: 13, color: "#f0f0f4" }}>Adjust Scenario</div>
              <div style={{ fontFamily: "Figtree,sans-serif", fontSize: 12, color: "#72727e", marginTop: 2, marginBottom: 20 }}>{SCENARIO_META[selectedScenario].title} parameters</div>
              <AnimatePresence mode="wait">
                {selectedScenario === "cut_category" && (
                  <motion.div key="cut_category" {...fadeUp}>
                    <div style={{ fontFamily: "Space Mono,monospace", fontSize: 9, textTransform: "uppercase", color: "#363640", marginBottom: 8, letterSpacing: "0.12em" }}>Category</div>
                    <div className="sim-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 20 }}>
                      {Object.entries(baseline?.categorySpend ?? {}).filter(([, v]) => v > 0).map(([cat, spend]) => {
                        const active = params.category === cat;
                        return (
                          <button key={cat} onClick={() => handleParamChange({ ...params, category: cat, cutAmount: 0 })}
                            style={{ padding: "7px 14px", borderRadius: 20, border: `1px solid ${active ? "rgba(0,200,150,0.5)" : "#1e1e26"}`, background: active ? "rgba(0,200,150,0.08)" : "#0c0c0f", color: active ? "#00c896" : "#72727e", fontFamily: "Figtree,sans-serif", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, display: "flex", gap: 6 }}>
                            {cat} <span style={{ fontFamily: "Space Mono,monospace", fontSize: 11, fontVariantNumeric: "tabular-nums" }}>${fmt(spend)}</span>
                          </button>
                        );
                      })}
                    </div>
                    <CustomSlider label="Monthly Reduction" value={params.cutAmount ?? 0} min={0} max={baseline?.categorySpend[params.category ?? ""] ?? 500} step={10} color="#00c896"
                      onChange={v => handleParamChange({ ...params, cutAmount: v })} />
                    <motion.div key={params.cutAmount} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} style={{ fontFamily: "Figtree,sans-serif", fontSize: 11, color: "#72727e", marginTop: 8 }}>
                      Saving ${fmt((params.cutAmount ?? 0) * 12)}/year
                    </motion.div>
                  </motion.div>
                )}
                {selectedScenario === "boost_savings" && (
                  <motion.div key="boost_savings" {...fadeUp}>
                    <CustomSlider label="Extra Monthly Savings" value={params.extraSavings ?? 200} min={0} max={1000} step={25} color="#00c896"
                      onChange={v => handleParamChange({ ...params, extraSavings: v })} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                      <span style={{ fontFamily: "Figtree,sans-serif", fontSize: 11, color: "#72727e" }}>That&apos;s ${fmt((params.extraSavings ?? 200) * 12)}/year</span>
                      {selectedGoal && metrics?.monthsDelta !== null && metrics?.monthsDelta !== undefined && metrics.monthsDelta > 0 && (
                        <span style={{ fontFamily: "Space Mono,monospace", fontSize: 11, color: "#00c896", fontVariantNumeric: "tabular-nums" }}>→ Goal {metrics.monthsDelta} months earlier</span>
                      )}
                    </div>
                  </motion.div>
                )}
                {selectedScenario === "pay_off_debt" && (
                  <motion.div key="pay_off_debt" {...fadeUp}>
                    <div className="sim-debt-row" style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "Figtree,sans-serif", fontSize: 13, color: "#72727e", marginBottom: 8 }}>Total Debt Amount</div>
                        <div style={{ position: "relative" }}>
                          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontFamily: "Space Mono,monospace", fontSize: 14, color: "#72727e", pointerEvents: "none" }}>$</span>
                          <input type="number" value={params.debtAmount ?? 5000}
                            onChange={e => handleParamChange({ ...params, debtAmount: Number(e.target.value) })}
                            onFocus={e => e.currentTarget.style.borderColor = "rgba(0,200,150,0.4)"}
                            onBlur={e => e.currentTarget.style.borderColor = "#1e1e26"}
                            style={{ width: "100%", padding: "12px 16px 12px 32px", background: "#040406", border: "1px solid #1e1e26", borderRadius: 10, color: "#f0f0f4", fontFamily: "Space Mono,monospace", fontSize: 14, outline: "none", transition: "border-color 0.15s" }} />
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <CustomSlider label="Monthly Payment" value={params.monthlyPayment ?? 300} min={50} max={1000} step={25} color="#e8a000"
                          onChange={v => handleParamChange({ ...params, monthlyPayment: v })} />
                      </div>
                    </div>
                    {(() => { const months = Math.ceil((params.debtAmount ?? 5000) / (params.monthlyPayment ?? 300)); return (
                      <motion.div key={months} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                        <span style={{ fontFamily: "Space Mono,monospace", fontSize: 12, fontVariantNumeric: "tabular-nums", color: months <= 24 ? "#00c896" : months <= 48 ? "#e8a000" : "#ff4455" }}>
                          Debt cleared in {months} months
                        </span>
                      </motion.div>
                    ); })()}
                  </motion.div>
                )}
                {selectedScenario === "income_drop" && (
                  <motion.div key="income_drop" {...fadeUp}>
                    <CustomSlider label="Income Reduction" value={params.dropPercent ?? 20} min={5} max={50} step={5} color="#ff4455"
                      displayFormat={v => `${v}%`}
                      onChange={v => handleParamChange({ ...params, dropPercent: v })} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                      <span style={{ fontFamily: "Space Mono,monospace", fontSize: 11, color: "#72727e", fontVariantNumeric: "tabular-nums" }}>
                        New monthly income: ${fmt((baseline?.monthlyIncome ?? 0) * (1 - (params.dropPercent ?? 20) / 100))}
                      </span>
                      {baseline && (baseline.monthlyIncome * (1 - (params.dropPercent ?? 20) / 100)) < baseline.monthlyExpenses && (
                        <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                          style={{ fontFamily: "Figtree,sans-serif", fontSize: 11, color: "#ff4455" }}>
                          ⚠ Spending exceeds income
                        </motion.span>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ── AI Summary Card ──────────────────────────────────────── */}
            <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.25 }}
              style={{ background: "#040406", border: "1px solid rgba(0,200,150,0.25)", borderRadius: 6, padding: "13px 15px", position: "relative", overflow: "hidden", marginBottom: 8 }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: "#00c896", boxShadow: "0 0 8px #00c896" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                <Zap size={9} color="#00c896" strokeWidth={1.5} />
                <span style={{ fontFamily: "Space Mono,monospace", fontSize: 8.5, color: "#00c896", textTransform: "uppercase", letterSpacing: "0.12em" }}>AI COPILOT</span>
              </div>
              {calculating && !aiSummary ? (
                <div>
                  <div style={{ height: 12, width: "100%", background: "#131318", borderRadius: 3, marginBottom: 6, animation: "pulse 1.5s ease-in-out infinite" }} />
                  <div style={{ height: 12, width: "85%", background: "#131318", borderRadius: 3, marginBottom: 6, animation: "pulse 1.5s ease-in-out infinite" }} />
                  <div style={{ height: 12, width: "60%", background: "#131318", borderRadius: 3, animation: "pulse 1.5s ease-in-out infinite" }} />
                </div>
              ) : (
                <p style={{ fontFamily: "Figtree,sans-serif", fontWeight: 300, fontSize: 11.5, color: "#72727e", lineHeight: 1.55, margin: 0, whiteSpace: "pre-wrap" }}>
                  {aiSummary}
                  {aiLoading && (
                    <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }}
                      style={{ display: "inline-block", width: 2, height: 14, background: "#00c896", marginLeft: 2, verticalAlign: "middle" }} />
                  )}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ height: 60 }} />
    </div>
  );
}
