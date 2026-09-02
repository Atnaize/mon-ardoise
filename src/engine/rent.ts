import { roundToCents, type Cents } from "./money";
import type { YearMonth } from "./month";
import { ppmToRate } from "./rate";
import type { Lease } from "./types";

function rentForLease(lease: Lease, month: YearMonth): Cents {
  if (month < lease.startMonth) {
    return 0;
  }

  if (lease.endMonth != null && month > lease.endMonth) {
    return 0;
  }

  const steps = Math.floor((month - lease.startMonth) / 12);

  if (steps === 0 || lease.indexationRatePpm === 0) {
    return lease.monthlyRent;
  }

  return roundToCents(lease.monthlyRent * Math.pow(1 + ppmToRate(lease.indexationRatePpm), steps));
}

export function rentByMonth(
  leases: readonly Lease[],
  startMonth: YearMonth,
  horizonMonths: number,
): Cents[] {
  const rents = new Array<Cents>(horizonMonths).fill(0);

  for (let offset = 0; offset < horizonMonths; offset += 1) {
    const month = startMonth + offset;

    for (const lease of leases) {
      rents[offset] += rentForLease(lease, month);
    }
  }

  return rents;
}
