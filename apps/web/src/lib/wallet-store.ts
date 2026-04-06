import { paymentsAPI } from '@/services/api';
import type { Transaction, Wallet } from '@/services/api';

const STORAGE_PREFIX = 'hena-wadeena:wallet';
const DEFAULT_TOP_UP_DESCRIPTION = 'شحن المحفظة';
const DEFAULT_CURRENCY = 'EGP';
const LEGACY_BOOKING_REFERENCE_TYPES = new Set(['package_booking', 'package_booking_refund']);

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

function sanitizeLocalTransactions(transactions: Transaction[]): Transaction[] {
  return transactions.filter(
    (transaction) => !LEGACY_BOOKING_REFERENCE_TYPES.has(transaction.reference_type ?? ''),
  );
}

function sortTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort(
    (left, right) => Date.parse(right.created_at) - Date.parse(left.created_at),
  );
}

function mergeTransactions(
  remoteTransactions: Transaction[],
  localTransactions: Transaction[],
): Transaction[] {
  const merged = new Map<string, Transaction>();

  // Process local first so server-authoritative remote rows overwrite
  // any matching local optimistic entries with the same ID.
  for (const transaction of [...localTransactions, ...remoteTransactions]) {
    merged.set(transaction.id, transaction);
  }

  return sortTransactions([...merged.values()]);
}

function readLocalTransactions(userId: string): Transaction[] {
  const stored = localStorage.getItem(storageKey(userId));
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored) as { transactions?: Transaction[] };
    const sanitizedTransactions = sanitizeLocalTransactions(parsed.transactions ?? []);
    if (sanitizedTransactions.length !== (parsed.transactions ?? []).length) {
      writeLocalTransactions(userId, sanitizedTransactions);
    }
    return sanitizedTransactions;
  } catch {
    return [];
  }
}

function writeLocalTransactions(userId: string, transactions: Transaction[]): void {
  const sanitizedTransactions = sanitizeLocalTransactions(transactions);
  localStorage.setItem(
    storageKey(userId),
    JSON.stringify({ transactions: sanitizedTransactions.slice(0, 100) }),
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
  const localTransactions = readLocalTransactions(userId);

  try {
    const response = await paymentsAPI.getWallet();
    if (response.success) {
      const mergedTransactions = mergeTransactions(
        response.data.recent_transactions ?? [],
        localTransactions,
      );

      return {
        wallet: {
          ...response.data,
          recent_transactions: mergedTransactions.slice(0, 10),
        },
        transactions: mergedTransactions,
      };
    }
  } catch {
    // Fall through to default
  }

  return buildWalletState(userId, 0, localTransactions);
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

  try {
    return await getWalletSnapshot(userId);
  } catch {
    return buildWalletState(userId, newBalance, updatedTransactions);
  }
}
