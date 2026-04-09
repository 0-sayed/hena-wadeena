const PAGE_PATTERN = /^\d+$/;
const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;
const DECIMAL_PATTERN = /^\d+(?:\.(\d+))?$/;

export function normalizePageParam(value: string | null): number {
  if (!value || !PAGE_PATTERN.test(value)) {
    return 0;
  }

  return Number.parseInt(value, 10);
}

export function parseSlots(value: string): number | null {
  const normalized = value.trim();
  if (!POSITIVE_INTEGER_PATTERN.test(normalized)) {
    return null;
  }

  return Number.parseInt(normalized, 10);
}

export function parseCompensationToPiasters(value: string): number | null {
  const normalized = value.trim();
  const match = DECIMAL_PATTERN.exec(normalized);

  if (!match) {
    return null;
  }

  const integerPart = Number.parseInt(normalized.split('.', 2)[0] ?? normalized, 10);
  const fraction = match[1] ?? '';
  const cents = Number.parseInt(fraction.slice(0, 2).padEnd(2, '0') || '0', 10);
  const roundingDigit = Number.parseInt(fraction[2] ?? '0', 10);

  const roundedCents = cents + (roundingDigit >= 5 ? 1 : 0);
  const carry = roundedCents >= 100 ? 1 : 0;

  return (integerPart + carry) * 100 + (roundedCents % 100);
}
