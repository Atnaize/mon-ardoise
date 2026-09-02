import type { ZodError } from "zod";

export interface ActionState {
  errors?: Record<string, string>;
  succeededAt?: string;
}

export function succeeded(): ActionState {
  return { succeededAt: new Date().toISOString() };
}

export function nestFormData(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") {
      continue;
    }

    const segments = key.split(".");
    let cursor = result;

    for (const segment of segments.slice(0, -1)) {
      cursor[segment] ??= {};
      cursor = cursor[segment] as Record<string, unknown>;
    }

    cursor[segments.at(-1)!] = value;
  }

  return result;
}

export function fieldErrors(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".");

    errors[path] ??= issue.message;
  }

  return errors;
}
