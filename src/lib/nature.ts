import type { Nature } from "@/lib/schemas";

export function natureOf(line: {
  recurrence: string;
  isAcquisitionCost: boolean;
}): Nature {
  if (line.recurrence !== "one_off") {
    return "recurring";
  }

  return line.isAcquisitionCost ? "upfront" : "one_off";
}
