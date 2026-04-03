const KYC_SESSION_TOKEN_KEY = 'kyc_session_token';

export function setKycSessionToken(token: string): void {
  sessionStorage.setItem(KYC_SESSION_TOKEN_KEY, token);
}

export function getKycSessionToken(): string | null {
  return sessionStorage.getItem(KYC_SESSION_TOKEN_KEY);
}

export function clearKycSessionToken(): void {
  sessionStorage.removeItem(KYC_SESSION_TOKEN_KEY);
}
