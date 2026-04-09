const HIDDEN_PATH_PREFIXES = [
  '/admin',
  '/dashboard',
  '/kyc',
  '/login',
  '/password-reset',
  '/register',
  '/reviewer',
] as const;

export function shouldShowMobileBottomNav(pathname: string) {
  return !HIDDEN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
