"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CreditCard,
  Heart,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Settings,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { signOutAction } from "./actions";

type DashboardShellProps = {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
  };
};

const navGroups = [
  {
    label: "OVERVIEW",
    items: [{ icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" }],
  },
  {
    label: "FINANCE",
    items: [
      { icon: CreditCard, label: "Transactions", href: "/transactions" },
      { icon: Target, label: "Budgets", href: "/budgets" },
      { icon: Heart, label: "Goals", href: "/goals" },
    ],
  },
  {
    label: "TOOLS",
    items: [
      { icon: MessageSquare, label: "AI Copilot", href: "/copilot" },
      { icon: Users, label: "Shared Rooms", href: "/rooms" },
      { icon: TrendingUp, label: "What-If Simulator", href: "/simulator" },
    ],
  },
];

const bottomNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: CreditCard, label: "Transactions", href: "/transactions" },
  { icon: Target, label: "Budgets", href: "/budgets" },
  { icon: MessageSquare, label: "Copilot", href: "/copilot" },
];

const moreNavItems = [
  { icon: Heart, label: "Goals", href: "/goals" },
  { icon: Users, label: "Rooms", href: "/rooms" },
  { icon: TrendingUp, label: "Simulator", href: "/simulator" },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardShell({ children, user }: DashboardShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const displayName = user.name.trim();
  const displayEmail = user.email.trim();
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <div
      style={{
        display: "flex",
        height: "100dvh",
        overflow: "hidden",
        background: "#070708",
        color: "#f0f0f4",
      }}
    >
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 -translate-x-full transition-transform duration-200 lg:relative lg:translate-x-0 lg:z-auto ${sidebarOpen ? "translate-x-0" : ""} w-[210px] sm:w-[260px] lg:w-[210px]`}
        style={{
          minWidth: 210,
          height: "100dvh",
          background: "#0c0c0f",
          borderRight: "1px solid rgba(255,255,255,0.055)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--font-figtree), sans-serif",
        }}
      >
        <div
          style={{
            padding: "26px 22px 22px",
            borderBottom: "1px solid rgba(255,255,255,0.055)",
            display: "flex",
            alignItems: "center",
            gap: 9,
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div
              style={{
                width: 26,
                height: 26,
                background: "#00c896",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 14px rgba(0,200,150,0.35)",
              }}
            >
              <TrendingUp size={13} color="#000" strokeWidth={2.5} />
            </div>
            <span style={{ fontFamily: "var(--font-syne)", fontSize: 17, fontWeight: 700, color: "#f0f0f4" }}>
              Fintrak
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="flex h-11 w-11 items-center justify-center rounded-md lg:hidden"
            aria-label="Close menu"
            style={{
              border: "1px solid rgba(255,255,255,0.055)",
              background: "#131318",
              color: "#72727e",
            }}
          >
            <X size={16} strokeWidth={1.7} />
          </button>
        </div>

        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 1 }}>
          {navGroups.map((group) => (
            <div key={group.label}>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  fontFamily: "var(--font-space-mono)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#444450",
                  padding: "10px 10px 5px",
                }}
              >
                {group.label}
              </div>
              {group.items.map((item) => {
                const isActive = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      padding: "7px 10px",
                      borderRadius: 5,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: isActive ? 500 : 400,
                      color: isActive ? "#00c896" : "#72727e",
                      background: isActive ? "rgba(0,200,150,0.12)" : "transparent",
                      border: `1px solid ${isActive ? "rgba(0,200,150,0.25)" : "transparent"}`,
                      position: "relative",
                      transition: "all 0.12s ease",
                      textDecoration: "none",
                    }}
                  >
                    {isActive && (
                      <div
                        style={{
                          position: "absolute",
                          left: -1,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 2,
                          height: 16,
                          background: "#00c896",
                          borderRadius: "0 2px 2px 0",
                          boxShadow: "0 0 8px #00c896",
                        }}
                      />
                    )}
                    <item.icon size={13} strokeWidth={1.5} />
                    <span>{item.label}</span>
                    {isActive && (
                      <div
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: "#00c896",
                          marginLeft: "auto",
                          boxShadow: "0 0 5px #00c896",
                          animation: "pulse 2s ease infinite",
                        }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.055)" }}>
          <div
            style={{
              padding: "14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #00c896 0%, #00785a 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-syne)",
                fontSize: 11,
                fontWeight: 700,
                color: "#000",
                boxShadow: "0 0 10px rgba(0,200,150,0.2)",
              }}
            >
              {avatarInitial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#f0f0f4", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {displayName}
              </div>
              <div style={{ fontSize: 10, color: "#363640", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {displayEmail}
              </div>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                aria-label="Sign out"
                style={{
                  width: 22,
                  height: 22,
                  border: "none",
                  background: "transparent",
                  color: "#363640",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <Settings size={12} strokeWidth={1.5} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex h-[52px] items-center justify-between border-b px-3 lg:hidden"
          style={{
            background: "#0c0c0f",
            borderColor: "rgba(255,255,255,0.055)",
          }}
        >
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-md"
            aria-label="Open menu"
            style={{
              border: "1px solid rgba(255,255,255,0.055)",
              background: "#131318",
              color: "#72727e",
            }}
          >
            <Menu size={16} strokeWidth={1.7} />
          </button>
          <span style={{ fontFamily: "var(--font-syne)", fontSize: 17, fontWeight: 700, color: "#f0f0f4" }}>
            Fintrak
          </span>
          <button
            type="button"
            className="relative flex h-11 w-11 items-center justify-center rounded-md"
            aria-label="Notifications"
            style={{
              border: "1px solid rgba(255,255,255,0.055)",
              background: "#131318",
              color: "#72727e",
            }}
          >
            <Bell size={14} strokeWidth={1.5} />
            <span
              style={{
                position: "absolute",
                top: 10,
                right: 11,
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#00c896",
                border: "1.5px solid #0c0c0f",
                boxShadow: "0 0 6px #00c896",
              }}
            />
          </button>
        </header>

        <main
          className="main flex-1 overflow-y-auto pb-[calc(58px+env(safe-area-inset-bottom))] lg:pb-0"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#1a1a21 transparent",
          }}
        >
          {children}
        </main>
      </div>

      <nav
        className="fixed right-0 bottom-0 left-0 z-50 flex items-center justify-between px-2 pb-safe lg:hidden"
        style={{
          height: "calc(58px + env(safe-area-inset-bottom))",
          background: "#0c0c0f",
          borderTop: "1px solid rgba(255,255,255,0.055)",
        }}
      >
        {bottomNavItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => {
                setMoreOpen(false);
                setSidebarOpen(false);
              }}
              className="flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-md"
              style={{
                textDecoration: "none",
                color: active ? "#00c896" : "#363640",
              }}
            >
              <item.icon size={20} strokeWidth={1.5} />
              <span style={{ fontFamily: "var(--font-space-mono)", fontSize: 10 }}>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-md"
          style={{ color: moreOpen ? "#00c896" : "#363640" }}
          aria-label="Open more navigation"
        >
          <Menu size={20} strokeWidth={1.5} />
          <span style={{ fontFamily: "var(--font-space-mono)", fontSize: 10 }}>More</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-[60] flex items-end lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
            aria-label="Close more menu"
          />
          <div
            className="relative z-[70] w-full rounded-t-2xl border p-4"
            style={{
              background: "#0c0c0f",
              borderColor: "rgba(255,255,255,0.055)",
            }}
          >
            <div
              style={{
                margin: "0 auto 12px",
                width: 42,
                height: 4,
                borderRadius: 999,
                background: "#1a1a21",
              }}
            />
            <div className="mb-3" style={{ fontFamily: "var(--font-space-mono)", fontSize: 10, color: "#72727e" }}>
              MORE
            </div>
            <div className="flex flex-col gap-2">
              {moreNavItems.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-md px-3"
                    style={{
                      textDecoration: "none",
                      color: active ? "#00c896" : "#72727e",
                      background: active ? "rgba(0,200,150,0.12)" : "transparent",
                      border: `1px solid ${active ? "rgba(0,200,150,0.25)" : "rgba(255,255,255,0.055)"}`,
                    }}
                  >
                    <item.icon size={18} strokeWidth={1.5} />
                    <span style={{ fontSize: 13 }}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
