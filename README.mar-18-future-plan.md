# Fintrak — Mar 18 Future Plan (Roadmap + Quality)

> Date: **2026-03-18**  
> Purpose: a practical, prioritized plan for **what to build next**, **what to harden**, and **how to keep the current app bug-free**.

This roadmap is based on the current feature set documented in `CODEBASE.md` and on a quick audit of the most risk-prone areas (shared rooms accounting + authorization).

---

## Current state (quick snapshot)

The app is already a strong v1 across:

- **Auth + onboarding** (NextAuth + onboarding gate for dashboard routes)
- **Personal finance**: transactions, budgets, goals
- **AI**: personal copilot (persisted history) + room copilot (stateless)
- **Smart nudges**: daily cron route generating `Notification`s
- **Shared rooms**: members, invites, room expenses, balances, debt simplification, settlements

Primary source of truth: `CODEBASE.md`.

---

## Top priority: make Rooms “correct by construction”

These items prevent silent data corruption (wrong balances/debts) and tighten authorization.

### 1) Server-authoritative splits & validation (Rooms expenses)

- **Where**: `src/app/api/rooms/[id]/transactions/route.ts`
- **Problem**
  - API requires `splits` for all requests even when `splitType === "equal"`.
  - API does not validate that split amounts sum to the transaction total.
  - `paidByUserId` membership is not guaranteed.
- **Fix**
  - **Validate** `paidByUserId` is a room member.
  - If `splitType === "equal"`: **compute splits server-side** from current room members.
    - Deterministic rounding rule: compute base share to cents; assign remainder cents to a stable member ordering (e.g., sorted userId) so the result is consistent.
  - If `splitType === "weighted"`: validate
    - each `split.userId` is a room member
    - no duplicate userIds
    - amounts are finite and \( \ge 0 \)
    - sum(splits.amount) equals `amount` within epsilon (recommend: `<= 0.01`)
- **Acceptance criteria**
  - Equal split requests succeed even if client omits `splits`.
  - Weighted split requests fail with clear 400 errors if invalid (non-members, wrong sum, duplicates).
  - Stored splits always sum to the stored transaction amount (to cents).

### 2) Settlement authorization & membership validation

- **Where**: `src/app/api/rooms/[id]/settle/route.ts`
- **Problem**
  - Any room member can create a settlement between any two users.
  - `fromUserId`/`toUserId` may not be room members.
- **Fix**
  - Validate both `fromUserId` and `toUserId` are members of the room.
  - Enforce one of these policies:
    - **Recommended**: `fromUserId` must equal the authenticated user OR the caller must be a room admin.
    - Stricter alternative: `fromUserId` must always equal the authenticated user.
- **Acceptance criteria**
  - Non-member userIds are rejected.
  - Non-admin cannot record settlements on behalf of other users.
  - Admin behavior is explicit and tested if enabled.

### 3) Room PATCH input validation parity

- **Where**: `src/app/api/rooms/[id]/route.ts` (`PATCH`)
- **Problem**
  - `budgetCap` lacks validation parity with room creation.
  - Name trimming can allow empty string updates.
  - `budgetCap` handling treats `0` as falsy → unintentionally `null`.
- **Fix**
  - If name is provided: require `name.trim().length > 0`.
  - If budgetCap is provided and not null: require finite and `> 0`.
  - Distinguish explicitly between `null`, `undefined`, and numeric values.
- **Acceptance criteria**
  - Empty room names are rejected.
  - Negative/NaN/0 budget caps are rejected.
  - `budgetCap: 0` is not silently coerced to null.

---

## Reliability: how we keep features “bug-free”

You’ll never get to “zero bugs,” but you can make regressions rare and fast to catch.

### Minimal high-impact test suite

#### Unit tests (pure logic)
- **Where**: `src/lib/rooms.ts`
- **Test cases**
  - `computeUserBalance` with: payer also in splits, multiple txs, multiple settlements
  - rounding edge cases (0.005 thresholds, cent rounding)
  - `simplifyDebts` produces valid flows and sums correctly

#### API contract tests (Rooms)
- **Where**: API endpoints listed above
- **Test cases**
  - equal split computed server-side
  - weighted split rejects invalid sums / duplicates / non-members
  - settlement enforces membership + policy
  - PATCH validation rules

#### One “golden path” end-to-end test
Login → onboarding → create room → add expense → settle → verify balances/debts reflect expected results.

### Observability & guardrails
- **Structured logging** for:
  - cron nudge processing counts and failures
  - validation rejects (rooms tx create, settle create)
- **Error reporting** (client + server) so production issues don’t hide.

---

## Smart features (high leverage) — what to build next

These are ordered to deliver “feels intelligent” value quickly without destabilizing core accounting.

### A) Financial Health Score + explainable drivers (personal)

- **What**: A daily-updated 0–100 score with 3 drivers + 1 recommended action.
- **Inputs**
  - savings rate, budget adherence, goal pace, spending volatility, income vs expenses
- **Implementation approach**
  - Phase 1: deterministic scoring + drivers (no AI required)
  - Phase 2: AI writes the explanation using the deterministic drivers (keeps it consistent and auditable)

### B) Smart category/type suggestions (with confidence + learning)

- **What**: When user enters description/merchant, suggest category + type, show confidence, and learn from corrections.
- **Implementation approach**
  - Start with keyword/merchant rules (fast + reliable)
  - Add personalization: store per-user overrides (“merchant → category”)

### C) Recurring transactions + “expected bills” forecasting

- **What**: Detect recurring transactions, forecast month-end spend including expected bills.
- **Why**: Budgets become predictive, nudges become smarter.

### D) What-if planning (goal + budget simulator)

Examples:
- “If I cap dining at $250, can I hit my emergency fund by September?”
- “What happens if income drops 10%?”

Implementation: deterministic simulation + AI narrative explanation.

---

## Smart Rooms (after correctness hardening)

### E) Fairness + anomaly insights
- “Who is fronting the most cash?”
- “Possible duplicate expense detected”
- “Uneven contributions over last 14 days”

### F) One-tap “Settle All” plan + payment handles

You already compute simplified debts (`src/lib/rooms.ts`). Next step:
- generate “my settlement plan” (only the lines that involve me)
- support recording multiple settlements in one UX flow
- optional: store Venmo/CashApp/UPI handles per user for quick payment

---

## Security & scale (important, not flashy)

### Row Level Security (RLS) plan
`CODEBASE.md` notes RLS is disabled in Supabase. Before any public launch:
- design table-level RLS policies (User-owned and Room-member-owned data)
- enforce “membership implies access” at the DB layer

### Cron scalability for nudges
Current cron processes users sequentially. As user count grows:
- batch users per run (cursor/lastProcessed)
- or fan-out per user via a queue
- add rate limits + backoff on AI calls

---

## Suggested execution phases

### Phase 1 — Stability sprint (must do)
- Fix splits/settlements/PATCH validation (Rooms)
- Add unit + contract tests for those areas
- Add error reporting + basic structured logs

### Phase 2 — Smart v1 (personal)
- Financial Health Score + explanation
- Smart category suggestions + learning
- Recurring detection + forecasting

### Phase 3 — Smart Rooms
- Fairness/anomaly insights
- Settle-all plan + payment handles

---

## Notes / quick polish items

- `README.md` is still the default Next.js template. Consider updating it to point to:
  - `CODEBASE.md` (full reference)
  - this file (roadmap)
  - required env vars + local setup steps

