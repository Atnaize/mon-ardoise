export function prefixed(prefix: string | undefined, name: string): string {
  return prefix ? `${prefix}.${name}` : name;
}

export type FieldErrors = Record<string, string> | undefined;

export function errorFor(errors: FieldErrors, prefix: string | undefined, name: string) {
  return errors?.[prefixed(prefix, name)];
}
