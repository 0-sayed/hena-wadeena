/**
 * Monetary utilities.
 * All prices are stored as integers (piasters). 1 EGP = 100 piasters.
 * Never use float/decimal for money.
 */

const EGP_FORMATTER = new Intl.NumberFormat('ar-EG', {
  style: 'currency',
  currency: 'EGP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Convert piasters (integer) to EGP string for display */
export function piastresToEgp(piasters: number): string {
  return EGP_FORMATTER.format(piasters / 100);
}

/** Convert EGP float to piasters integer (round to avoid floating point errors) */
export function egpToPiasters(egp: number): number {
  return Math.round(egp * 100);
}

/** Format piasters as plain EGP number string (e.g. "150.50") */
export function piastresToEgpRaw(piasters: number): string {
  return (piasters / 100).toFixed(2);
}
