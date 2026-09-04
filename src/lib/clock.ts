import { fromIsoDate, type YearMonth } from "@/engine/month";

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return isoDate(new Date());
}

export function currentMonth(): YearMonth {
  return fromIsoDate(`${todayIso().slice(0, 7)}-01`);
}

export function currentYear(): number {
  return Number(todayIso().slice(0, 4));
}
