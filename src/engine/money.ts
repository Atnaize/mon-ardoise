export type Cents = number;

export function eurosToCents(euros: number): Cents {
  return roundToCents(euros * 100);
}

export function centsToEuros(cents: Cents): number {
  return cents / 100;
}

export function roundToCents(value: number): Cents {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

export function formatCents(cents: Cents, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(centsToEuros(cents));
}

export function applyShare(total: Cents, sharePermille: number): Cents {
  return roundToCents((total * sharePermille) / 1000);
}

export function distribute(total: Cents, sharesPermille: readonly number[]): Cents[] {
  const totalShares = sharesPermille.reduce((sum, share) => sum + share, 0);

  if (totalShares === 0) {
    return sharesPermille.map(() => 0);
  }

  const exact = sharesPermille.map((share) => (total * share) / totalShares);
  const floored = exact.map((value) => Math.trunc(value));
  let remainder = total - floored.reduce((sum, value) => sum + value, 0);

  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.trunc(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  const step = remainder < 0 ? -1 : 1;

  for (const { index } of order) {
    if (remainder === 0) {
      break;
    }

    floored[index] += step;
    remainder -= step;
  }

  return floored;
}
