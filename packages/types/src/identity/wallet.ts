// packages/types/src/identity/wallet.ts

export const WALLET_REF_TYPES = ['booking', 'job', 'topup', 'refund'] as const;
export type WalletRefType = (typeof WALLET_REF_TYPES)[number];
export type WalletDirection = 'credit' | 'debit';

export interface WalletTransaction {
  id: string;
  direction: WalletDirection;
  amountPiasters: number;
  balanceAfterPiasters: number | null;
  refType: WalletRefType;
  refId: string | null;
  noteAr: string | null;
  createdAt: string;
}

export interface WalletSnapshot {
  balancePiasters: number;
  recentTransactions: WalletTransaction[];
}

export interface WalletTransferRequest {
  fromUserId: string;
  toUserId: string;
  amountPiasters: number;
  refType: WalletRefType;
  refId: string;
  noteAr?: string;
  idempotencyKey: string;
}

export interface WalletTransferResponse {
  status: 'applied' | 'duplicate';
  fromBalance?: number;
  toBalance?: number;
}
