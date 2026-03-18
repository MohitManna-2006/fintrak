type TxForBalance = {
  paidByUserId: string | null;
  amount: number;
  splits: { userId: string; amount: number }[];
};

type SettlementForBalance = {
  fromUserId: string;
  toUserId: string;
  amount: number;
};

export type DebtLine = {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
};

export function computeUserBalance(
  userId: string,
  transactions: TxForBalance[],
  settlements: SettlementForBalance[],
): number {
  let balance = 0;
  for (const tx of transactions) {
    if (tx.paidByUserId === userId) balance += tx.amount;
    const mySplit = tx.splits.find((s) => s.userId === userId);
    if (mySplit) balance -= mySplit.amount;
  }
  for (const s of settlements) {
    if (s.toUserId === userId) balance -= s.amount;   // creditor received money → owed less
    if (s.fromUserId === userId) balance += s.amount;  // debtor paid money → owes less
  }
  return Math.round(balance * 100) / 100;
}

export function computeAllBalances(
  members: { userId: string }[],
  transactions: TxForBalance[],
  settlements: SettlementForBalance[],
): Map<string, number> {
  const balances = new Map<string, number>();
  for (const m of members) {
    balances.set(m.userId, computeUserBalance(m.userId, transactions, settlements));
  }
  return balances;
}

// Greedy debt simplification
export function simplifyDebts(
  balances: Map<string, number>,
  nameMap: Map<string, string>,
): DebtLine[] {
  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  for (const [id, bal] of balances) {
    if (bal > 0.005) creditors.push({ id, amount: bal });
    else if (bal < -0.005) debtors.push({ id, amount: -bal });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const debts: DebtLine[] = [];

  while (creditors.length > 0 && debtors.length > 0) {
    const creditor = creditors[0];
    const debtor = debtors[0];
    const amount = Math.min(creditor.amount, debtor.amount);

    debts.push({
      from: debtor.id,
      fromName: nameMap.get(debtor.id) ?? debtor.id,
      to: creditor.id,
      toName: nameMap.get(creditor.id) ?? creditor.id,
      amount: Math.round(amount * 100) / 100,
    });

    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount < 0.005) creditors.shift();
    if (debtor.amount < 0.005) debtors.shift();
  }

  return debts;
}
