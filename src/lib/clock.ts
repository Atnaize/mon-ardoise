import { fromIsoDate, type YearMonth } from "@/engine/month";

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function currentMonth(): YearMonth {
  return fromIsoDate(`${todayIso().slice(0, 7)}-01`);
}
