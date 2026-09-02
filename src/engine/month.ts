export type YearMonth = number;

export function yearMonth(year: number, month: number): YearMonth {
  return year * 12 + (month - 1);
}

export function fromIsoDate(iso: string): YearMonth {
  const [year, month] = iso.split("-").map(Number);

  if (!year || !month) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }

  return yearMonth(year, month);
}

export function yearOf(ym: YearMonth): number {
  return Math.floor(ym / 12);
}

export function monthOf(ym: YearMonth): number {
  return (ym % 12) + 1;
}

export function addMonths(ym: YearMonth, months: number): YearMonth {
  return ym + months;
}

export function monthsBetween(from: YearMonth, to: YearMonth): number {
  return to - from;
}

export function toIsoDate(ym: YearMonth, day: number): string {
  const year = yearOf(ym);
  const month = monthOf(ym);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const safeDay = Math.min(day, lastDay);

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}
