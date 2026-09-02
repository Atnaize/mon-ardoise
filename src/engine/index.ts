export * from "./annuity";
export * from "./compare";
export * from "./indicators";
export * from "./money";
export * from "./month";
export * from "./projection";
export * from "./rate";
export * from "./recurrence";
export * from "./rent";
export * from "./rent-ledger";
export * from "./schedule";
export * from "./types";

import { computeIndicators } from "./indicators";
import { project } from "./projection";
import type { IndicatorOptions, ProjectionInput, ProjectionResult } from "./types";

export function runProjection(
  input: ProjectionInput,
  options: IndicatorOptions = {},
): ProjectionResult {
  const projection = project(input);

  return { projection, indicators: computeIndicators(projection, input, options) };
}
