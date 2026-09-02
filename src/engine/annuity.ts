import { roundToCents, type Cents } from "./money";
import { monthlyRate, type Ppm, type RateBasis } from "./rate";

export function paymentFromMonthlyRate(
  principal: Cents,
  termMonths: number,
  rate: number,
): Cents {
  if (termMonths <= 0) {
    throw new Error("termMonths must be greater than zero");
  }

  if (rate === 0) {
    return roundToCents(principal / termMonths);
  }

  return roundToCents((principal * rate) / (1 - Math.pow(1 + rate, -termMonths)));
}

export function annuityPayment(
  principal: Cents,
  termMonths: number,
  annualRatePpm: Ppm,
  basis: RateBasis,
): Cents {
  return paymentFromMonthlyRate(principal, termMonths, monthlyRate(annualRatePpm, basis));
}
