import { paymentsAPI } from '@/services/api';
import type { Transaction, Wallet } from '@/services/api';

const STORAGE_PREFIX = 'hena-wadeena:wallet';
const DEFAULT_TOP_UP_DESCRIPTION = 'شحن المحفظة';
const DEFAULT_CURRENCY = 'EGP';

type StoredWalletState = {
  wallet: Wallet;
  transactions: Transaction[];
};

function buildWalletState(
  userId: string,
  balance: number,
  transactions: Transaction[],
): StoredWalletState {
  return {
    wallet: {
      id: `wallet-${userId}`,
      user_id: userId,
      balance,
      currency: DEFAULT_CURRENCY,
      recent_transactions: transactions.slice(0, 10),
    },
    transactions,
  };
}

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

function readLocalTransactions(userId: string): Transaction[] {
  const stored = localStorage.getItem(storageKey(userId));
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored) as { transactions?: Transaction[] };
    return parsed.transactions ?? [];
  } catch {
    return [];
  }
}

function writeLocalTransactions(userId: string, transactions: Transaction[]): void {
  localStorage.setItem(
    storageKey(userId),
    JSON.stringify({ transactions: transactions.slice(0, 100) }),
  );
}

function buildTransaction(
  direction: 'credit' | 'debit',
  amount: number,
  balanceAfter: number,
  description: string,
  reference?: { reference_id?: string; reference_type?: string },
): Transaction {
  return {
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: direction === 'credit' ? 'topup' : 'payment',
    amount,
    direction,
    balance_after: balanceAfter,
    description,
    status: 'completed',
    created_at: new Date().toISOString(),
    reference_id: reference?.reference_id,
    reference_type: reference?.reference_type,
  };
}

export function parseEgpInputToPiasters(value: string): number | null {
  const normalized = value.trim().replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [wholePart, fractionPart = ''] = normalized.split('.');
  const whole = Number.parseInt(wholePart, 10);
  const fraction = Number.parseInt(fractionPart.padEnd(2, '0'), 10);

  if (!Number.isFinite(whole) || !Number.isFinite(fraction)) {
    return null;
  }

  return whole * 100 + fraction;
}

export async function getWalletSnapshot(userId: string): Promise<StoredWalletState> {
  const transactions = readLocalTransactions(userId);

  try {
    const response = await paymentsAPI.getWallet();
    if (response.success) {
      return buildWalletState(userId, response.data.balance, transactions);
    }
  } catch {
    // Fall through to default
  }

  return buildWalletState(userId, 0, transactions);
}

export async function topUpWallet(
  userId: string,
  amountPiasters: number,
  description = DEFAULT_TOP_UP_DESCRIPTION,
  reference?: { reference_id?: string; reference_type?: string },
): Promise<StoredWalletState> {
  if (!Number.isSafeInteger(amountPiasters) || amountPiasters <= 0) {
    throw new Error('amountPiasters must be a positive integer');
  }

  const response = await paymentsAPI.topUp(amountPiasters);
  if (!response.success) {
    throw new Error('فشل شحن المحفظة');
  }

  const newBalance = response.data.balance;
  const transactions = readLocalTransactions(userId);
  const transaction = buildTransaction(
    'credit',
    amountPiasters,
    newBalance,
    description,
    reference,
  );
  const updatedTransactions = [transaction, ...transactions];

  writeLocalTransactions(userId, updatedTransactions);

  return buildWalletState(userId, newBalance, updatedTransactions);
}

export async function deductWalletBalance(
  userId: string,
  amountPiasters: number,
  description: string,
  reference?: { reference_id?: string; reference_type?: string },
): Promise<StoredWalletState> {
  if (!Number.isSafeInteger(amountPiasters) || amountPiasters <= 0) {
    throw new Error('amountPiasters must be a positive integer');
  }

  const response = await paymentsAPI.deduct({
    amount: amountPiasters,
    description,
    reference_id: reference?.reference_id,
    reference_type: reference?.reference_type,
  });

  if (!response.success) {
    throw new Error('رصيد المحفظة غير كافٍ لإتمام العملية');
  }

  const newBalance = response.data.balance;
  const transactions = readLocalTransactions(userId);
  const transaction = buildTransaction('debit', amountPiasters, newBalance, description, reference);
  const updatedTransactions = [transaction, ...transactions];

  writeLocalTransactions(userId, updatedTransactions);

  return buildWalletState(userId, newBalance, updatedTransactions);
}
