import { describe, it, expect } from "vitest";
import { computeUserBalance, computeAllBalances, simplifyDebts } from "./rooms";

// ─── computeUserBalance ──────────────────────────────────────────────

describe("computeUserBalance", () => {
  it("nets correctly when user paid and is also in splits", () => {
    // Alice paid $90 total, her split share is $30
    const txs = [
      {
        paidByUserId: "alice",
        amount: 90,
        splits: [
          { userId: "alice", amount: 30 },
          { userId: "bob", amount: 30 },
          { userId: "charlie", amount: 30 },
        ],
      },
    ];
    // balance = +90 (paid) - 30 (her share) = +60
    expect(computeUserBalance("alice", txs, [])).toBe(60);
  });

  it("handles multiple transactions and multiple settlements", () => {
    const txs = [
      {
        paidByUserId: "alice",
        amount: 90,
        splits: [
          { userId: "alice", amount: 30 },
          { userId: "bob", amount: 30 },
          { userId: "charlie", amount: 30 },
        ],
      },
      {
        paidByUserId: "bob",
        amount: 30,
        splits: [
          { userId: "alice", amount: 15 },
          { userId: "bob", amount: 15 },
        ],
      },
    ];
    const settlements = [
      { fromUserId: "bob", toUserId: "alice", amount: 20 },
      { fromUserId: "charlie", toUserId: "alice", amount: 10 },
    ];

    // Alice: +90 - 30 - 15 + 20 + 10 = +75
    //   (paid 90) - (split 30 + 15) + (received 20 + 10)
    expect(computeUserBalance("alice", txs, settlements)).toBe(75);

    // Bob: +30 - 30 - 15 - 20 = -35
    //   (paid 30) - (split 30 + 15) - (settled 20)
    expect(computeUserBalance("bob", txs, settlements)).toBe(-35);
  });

  it("returns positive balance for user who only receives settlements", () => {
    const settlements = [
      { fromUserId: "bob", toUserId: "dave", amount: 50 },
    ];
    expect(computeUserBalance("dave", [], settlements)).toBe(50);
  });

  it("returns zero when user paid exactly their share", () => {
    const txs = [
      {
        paidByUserId: "alice",
        amount: 50,
        splits: [
          { userId: "alice", amount: 50 },
        ],
      },
    ];
    expect(computeUserBalance("alice", txs, [])).toBe(0);
  });

  it("rounds result to 2 decimal places", () => {
    // 10 / 3 = 3.333..., paid 10 → balance = 10 - 3.33 = 6.67
    const txs = [
      {
        paidByUserId: "alice",
        amount: 10,
        splits: [
          { userId: "alice", amount: 3.333333 },
          { userId: "bob", amount: 3.333333 },
          { userId: "charlie", amount: 3.333334 },
        ],
      },
    ];
    const balance = computeUserBalance("alice", txs, []);
    // Check it has at most 2 decimal digits
    expect(balance).toBe(Math.round(balance * 100) / 100);
  });
});

// ─── simplifyDebts ───────────────────────────────────────────────────

describe("simplifyDebts", () => {
  it("simplifies a 3-person split where one person paid everything", () => {
    // Alice paid $90, 3-way equal split: each owes $30
    // Alice balance: +60, Bob: -30, Charlie: -30
    const balances = new Map([
      ["alice", 60],
      ["bob", -30],
      ["charlie", -30],
    ]);
    const nameMap = new Map([
      ["alice", "Alice"],
      ["bob", "Bob"],
      ["charlie", "Charlie"],
    ]);

    const debts = simplifyDebts(balances, nameMap);

    // Total owed to Alice = 60
    const totalDebt = debts.reduce((s, d) => s + d.amount, 0);
    expect(totalDebt).toBeCloseTo(60, 2);

    // All debts point to Alice
    for (const d of debts) {
      expect(d.to).toBe("alice");
    }
  });

  it("handles a 2-person simple debt", () => {
    const balances = new Map([
      ["alice", 25],
      ["bob", -25],
    ]);
    const nameMap = new Map([
      ["alice", "Alice"],
      ["bob", "Bob"],
    ]);

    const debts = simplifyDebts(balances, nameMap);
    expect(debts).toHaveLength(1);
    expect(debts[0].from).toBe("bob");
    expect(debts[0].to).toBe("alice");
    expect(debts[0].amount).toBe(25);
  });

  it("returns empty array when all balances are zero", () => {
    const balances = new Map([
      ["alice", 0],
      ["bob", 0],
      ["charlie", 0],
    ]);
    const nameMap = new Map([
      ["alice", "Alice"],
      ["bob", "Bob"],
      ["charlie", "Charlie"],
    ]);

    const debts = simplifyDebts(balances, nameMap);
    expect(debts).toHaveLength(0);
  });

  it("debt amounts sum equals sum of all positive balances", () => {
    const balances = new Map([
      ["alice", 50],
      ["bob", -20],
      ["charlie", -10],
      ["dave", -20],
    ]);
    const nameMap = new Map([
      ["alice", "Alice"],
      ["bob", "Bob"],
      ["charlie", "Charlie"],
      ["dave", "Dave"],
    ]);

    const debts = simplifyDebts(balances, nameMap);
    const totalDebt = debts.reduce((s, d) => s + d.amount, 0);
    const totalPositive = [...balances.values()]
      .filter((b) => b > 0)
      .reduce((s, b) => s + b, 0);

    expect(totalDebt).toBeCloseTo(totalPositive, 2);
  });

  it("never produces self-payments (from !== to)", () => {
    const balances = new Map([
      ["alice", 100],
      ["bob", -40],
      ["charlie", -60],
    ]);
    const nameMap = new Map([
      ["alice", "Alice"],
      ["bob", "Bob"],
      ["charlie", "Charlie"],
    ]);

    const debts = simplifyDebts(balances, nameMap);
    for (const d of debts) {
      expect(d.from).not.toBe(d.to);
    }
  });
});
