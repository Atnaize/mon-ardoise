import { centsToEuros, type Cents } from "@/engine/money";
import { ppmToPercent, type Ppm } from "@/engine/rate";

export function moneyField(cents: Cents | null | undefined): string {
  return cents == null ? "" : String(centsToEuros(cents));
}

export function percentField(ppm: Ppm | null | undefined): string {
  return ppm == null ? "" : String(ppmToPercent(ppm));
}

export function textField(value: string | null | undefined): string {
  return value ?? "";
}
