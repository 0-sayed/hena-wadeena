import type { Transaction, Wallet } from '@/services/api';

const STORAGE_PREFIX = 'hena-wadeena:wallet';
const DEFAULT_TOP_UP_DESCRIPTION = '\u0634\u062d\u0646 \u0627\u0644\u0645\u062d\u0641\u0638\u0629';

type StoredWalletState = {
  wallet: Wallet;
  transactions: Transaction[];
};

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

function createInitialState(userId: string): StoredWalletState {
  return {
    wallet: {
      id: `wallet-${userId}`,
      user_id: userId,
      balance: 0,
      currency: 'EGP',
      recent_transactions: [],
    },
    transactions: [],
  };
}

function readState(userId: string): StoredWalletState {
  const stored = localStorage.getItem(storageKey(userId));
  if (!stored) return createInitialState(userId);

  try {
    const parsed = JSON.parse(stored) as StoredWalletState;
    return {
      wallet: {
        ...parsed.wallet,
        user_id: userId,
        recent_transactions: parsed.transactions ?? parsed.wallet.recent_transactions ?? [],
      },
      transactions: parsed.transactions ?? [],
    };
  } catch {
    return createInitialState(userId);
  }
}

function writeState(userId: string, state: StoredWalletState): StoredWalletState {
  const nextState = {
    wallet: {
      ...state.wallet,
      recent_transactions: state.transactions.slice(0, 10),
    },
    transactions: state.transactions.slice(0, 100),
  };
  localStorage.setItem(storageKey(userId), JSON.stringify(nextState));
  return nextState;
}

function buildTransaction(
  direction: 'credit' | 'debit',
  amount: number,
  description: string,
  reference?: { reference_id?: string; reference_type?: string },
): Transaction {
  return {
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: direction === 'credit' ? 'topup' : 'payment',
    amount,
    direction,
    balance_after: 0,
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

export function getWalletSnapshot(userId: string): StoredWalletState {
  return readState(userId);
}

export function topUpWallet(
  userId: string,
  amountPiasters: number,
  description = DEFAULT_TOP_UP_DESCRIPTION,
  reference?: { reference_id?: string; reference_type?: string },
): StoredWalletState {
  const current = readState(userId);
  const transaction = buildTransaction('credit', amountPiasters, description, reference);
  const nextBalance = current.wallet.balance + amountPiasters;

  transaction.balance_after = nextBalance;

  return writeState(userId, {
    wallet: { ...current.wallet, balance: nextBalance },
    transactions: [transaction, ...current.transactions],
  });
}

export function deductWalletBalance(
  userId: string,
  amountPiasters: number,
  description: string,
  reference?: { reference_id?: string; reference_type?: string },
): StoredWalletState {
  const current = readState(userId);

  if (current.wallet.balance < amountPiasters) {
    throw new Error('\u0631\u0635\u064a\u062f \u0627\u0644\u0645\u062d\u0641\u0638\u0629 \u063a\u064a\u0631 \u0643\u0627\u0641\u064d \u0644\u0625\u062a\u0645\u0627\u0645 \u0627\u0644\u0639\u0645\u0644\u064a\u0629');
  }

  const transaction = buildTransaction('debit', amountPiasters, description, reference);
  const nextBalance = current.wallet.balance - amountPiasters;
  transaction.balance_after = nextBalance;

  return writeState(userId, {
    wallet: { ...current.wallet, balance: nextBalance },
    transactions: [transaction, ...current.transactions],
  });
}
